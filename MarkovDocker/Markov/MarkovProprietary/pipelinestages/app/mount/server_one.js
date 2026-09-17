const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const k8s = require('@kubernetes/client-node');

const app = express();

app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = 80;

const pool = new Pool({
  host: 'db',
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: 'postgres'
});

const kc = new k8s.KubeConfig();
kc.loadFromCluster();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);

const BASE_MOUNT =
  '/opt/app/MarkovProprietary/pipelinestages/app/mount';

const NAMESPACE = 'default';

const MARKOV_WORKER_NODE =
  'gke-markov-cluster-markov-pool-bf1302c9-sc8m';

const LIGHTDOCK_IMAGE =
  'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/lightdock:v70';

const DOWNLOADAPP_IMAGE =
  'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/downloadapp:v32';

const VIEWER_IMAGE =
  'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/viewer:latest';

const CODEL_IMAGE =
  'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/codel:v42';


// ============================================================
// KUBERNETES ERROR HELPER
// ============================================================

function getKubernetesStatusCode(err) {
  return (
    err?.statusCode ??
    err?.code ??
    err?.response?.statusCode ??
    err?.response?.body?.code ??
    err?.body?.code
  );
}


// ============================================================
// AUTHENTICATION
// ============================================================

function authenticateToken(req, res, next) {
  const token =
    req.cookies.token ||
    (
      req.headers.authorization &&
      req.headers.authorization.split(' ')[1]
    );

  if (!token) {
    console.log(
      'NO TOKEN:',
      req.cookies,
      req.headers.authorization
    );

    return res.status(401).json({
      message: 'Authentication required'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    req.user = decoded;

    next();

  } catch (error) {
    console.log(
      'JWT FAIL:',
      error.message
    );

    return res.status(403).json({
      message: 'Invalid or expired token'
    });
  }
}


// ============================================================
// LOGIN
// ============================================================

app.post('/login', async (req, res) => {
  const {
    email,
    password
  } = req.body;

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        email,
        password_hash
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!match) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: 'user'
      },
      JWT_SECRET,
      {
        expiresIn: '1h'
      }
    );

    res.cookie(
      'token',
      token,
      {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 3600000
      }
    );

    res.json({
      message: 'Login successful',

      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (err) {
    console.error(
      'LOGIN ERROR:',
      err
    );

    res.status(500).json({
      message: 'Server error'
    });
  }
});


// ============================================================
// GLOBAL AUTH PROTECTION
// ============================================================

app.use((req, res, next) => {
  if (req.path === '/login') {
    return next();
  }

  authenticateToken(
    req,
    res,
    next
  );
});


// ============================================================
// USER PATH HELPERS
// ============================================================

function getUserMount(userId) {
  return path.join(
    BASE_MOUNT,
    `user-${userId}`
  );
}

function getUserInputDir(userId) {
  return path.join(
    getUserMount(userId),
    'input'
  );
}

function getUserOutputDir(userId) {
  return path.join(
    getUserMount(userId),
    'output'
  );
}


// ============================================================
// USER DIRECTORIES
// ============================================================

function ensureUserDirectories(userId) {
  const inputDir =
    getUserInputDir(userId);

  const outputDir =
    getUserOutputDir(userId);

  fs.mkdirSync(
    inputDir,
    {
      recursive: true
    }
  );

  fs.mkdirSync(
    outputDir,
    {
      recursive: true
    }
  );

  const messagePath =
    path.join(
      outputDir,
      'message.txt'
    );

  if (!fs.existsSync(messagePath)) {
    fs.writeFileSync(
      messagePath,
      ''
    );
  }

  return {
    inputDir,
    outputDir,
    messagePath
  };
}


// ============================================================
// COPY DIRECTORY CONTENTS
// ============================================================

async function copyDirectoryContents(
  sourceDir,
  destinationDir
) {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  await fs.promises.mkdir(
    destinationDir,
    {
      recursive: true
    }
  );

  const entries =
    await fs.promises.readdir(
      sourceDir,
      {
        withFileTypes: true
      }
    );

  for (const entry of entries) {
    const source =
      path.join(
        sourceDir,
        entry.name
      );

    const destination =
      path.join(
        destinationDir,
        entry.name
      );

    if (entry.isDirectory()) {
      await fs.promises.cp(
        source,
        destination,
        {
          recursive: true,
          force: false
        }
      );
    } else {
      try {
        await fs.promises.copyFile(
          source,
          destination,
          fs.constants.COPYFILE_EXCL
        );
      } catch (err) {
        if (err.code !== 'EEXIST') {
          throw err;
        }
      }
    }
  }
}


// ============================================================
// USER WORKSPACE
// ============================================================

async function ensureUserWorkspace(userId) {
  const normalizedUserId =
    String(userId).trim();

  const userRoot =
    getUserMount(normalizedUserId);

  const userInputDir =
    getUserInputDir(normalizedUserId);

  const userOutputDir =
    getUserOutputDir(normalizedUserId);

  const templateInputDir =
    path.join(
      BASE_MOUNT,
      'input'
    );

  const templateOutputDir =
    path.join(
      BASE_MOUNT,
      'output'
    );

  console.log(
    `========== WORKSPACE SETUP START: USER ${normalizedUserId} ==========`
  );

  console.log(
    `User root: ${userRoot}`
  );

  console.log(
    `Template input: ${templateInputDir}`
  );

  console.log(
    `Template output: ${templateOutputDir}`
  );

  await fs.promises.mkdir(
    userInputDir,
    {
      recursive: true
    }
  );

  await fs.promises.mkdir(
    userOutputDir,
    {
      recursive: true
    }
  );

  const sourceServerTwo =
    path.join(
      __dirname,
      'server_two.js'
    );

  const destinationServerTwo =
    path.join(
      userRoot,
      'server_two.js'
    );

  if (fs.existsSync(sourceServerTwo)) {
    await fs.promises.copyFile(
      sourceServerTwo,
      destinationServerTwo
    );

    console.log(
      `Copied server_two.js to user workspace: ${destinationServerTwo}`
    );
  }

  const workspaceWasNew =
    !fs.existsSync(
      path.join(
        userRoot,
        '.workspace_initialized'
      )
    );

  if (workspaceWasNew) {
    await copyDirectoryContents(
      templateInputDir,
      userInputDir
    );

    await copyDirectoryContents(
      templateOutputDir,
      userOutputDir
    );

    await fs.promises.writeFile(
      path.join(
        userRoot,
        '.workspace_initialized'
      ),
      ''
    );

    console.log(
      `Initialized workspace for user ${normalizedUserId}`
    );
  }

  await fs.promises.mkdir(
    userInputDir,
    {
      recursive: true
    }
  );

  await fs.promises.mkdir(
    userOutputDir,
    {
      recursive: true
    }
  );

  const messagePath =
    path.join(
      userOutputDir,
      'message.txt'
    );

  if (!fs.existsSync(messagePath)) {
    await fs.promises.writeFile(
      messagePath,
      ''
    );
  }

  console.log(
    `Workspace ready for user ${normalizedUserId}: ${userRoot}`
  );

  console.log(
    `========== WORKSPACE SETUP COMPLETE: USER ${normalizedUserId} ==========`
  );

  return {
    root: userRoot,
    input: userInputDir,
    output: userOutputDir
  };
}


// ============================================================
// KUBERNETES HELPERS
// ============================================================

function getUserWorkerLabels(
  name,
  userId
) {
  return {
    app: name,
    user: String(userId)
  };
}

function getUserVolumeMount(userId) {
  return {
    name: 'markov-app',

    mountPath:
      '/opt/app/MarkovProprietary/pipelinestages/app/mount',

    subPath:
      `user-${userId}`
  };
}

function getUserVolumes() {
  return [
    {
      name: 'markov-app',

      persistentVolumeClaim: {
        claimName: 'markov-app'
      }
    }
  ];
}


// ============================================================
// LIGHTDOCK VOLUME MOUNT
//
// LightDock intentionally sees the entire PVC because
// Run_Markov.py explicitly accesses:
// /mount/user-{MARKOV_USER_ID}
//
// The worker identity is therefore passed explicitly through
// argv[1] and MARKOV_USER_ID.
// ============================================================

function getLightdockVolumeMount() {
  return {
    name: 'markov-app',

    mountPath:
      '/opt/app/MarkovProprietary/pipelinestages/app/mount'
  };
}


// ============================================================
// CODEL DOCKER SOCKET
// ============================================================

function getCodelVolumeMounts(userId) {
  return [
    {
      name: 'docker-sock',

      mountPath:
        '/var/run/docker.sock'
    },

    getUserVolumeMount(userId)
  ];
}

function getCodelVolumes() {
  return [
    {
      name: 'docker-sock',

      hostPath: {
        path:
          '/var/run/docker.sock',

        type:
          'Socket'
      }
    },

    {
      name: 'markov-app',

      persistentVolumeClaim: {
        claimName: 'markov-app'
      }
    }
  ];
}


// ============================================================
// USER APP DEPLOYMENT
// ============================================================

async function ensureUserAppDeployment(
  userId,
  appName,
  imageName,
  servicePort,
  containerPort
) {
  const normalizedUserId =
    String(userId).trim();

  const name =
    `${appName}-${normalizedUserId}`.toLowerCase();

  const labelSelector =
    getUserWorkerLabels(
      name,
      normalizedUserId
    );

  console.log(
    '============================================================'
  );

  console.log(
    `[USER ${normalizedUserId}] ENSURE APP: ${name}`
  );

  console.log(
    `[USER ${normalizedUserId}] Image: ${imageName}`
  );

  console.log(
    `[USER ${normalizedUserId}] Workspace: user-${normalizedUserId}`
  );

  console.log(
    `[USER ${normalizedUserId}] Node: ${MARKOV_WORKER_NODE}`
  );

  console.log(
    '============================================================'
  );

  let desiredVolumeMounts = [
    getUserVolumeMount(
      normalizedUserId
    )
  ];

  let desiredVolumes =
    getUserVolumes();

  let desiredEnv = [];

  if (appName === 'codel') {
    desiredVolumeMounts =
      getCodelVolumeMounts(
        normalizedUserId
      );

    desiredVolumes =
      getCodelVolumes();

    desiredEnv = [
      {
        name:
          'CODEL_BROWSER_NAME',

        value:
          `codel-browser-${normalizedUserId}`
      }
    ];
  }

  let existingDeployment = null;

  try {
    const result =
      await k8sAppsApi.readNamespacedDeployment({
        name,
        namespace: NAMESPACE
      });

    existingDeployment =
      result.body;

  } catch (err) {
    const statusCode =
      getKubernetesStatusCode(err);

    if (Number(statusCode) !== 404) {
      throw err;
    }
  }


  // ==========================================================
  // CREATE DEPLOYMENT
  // ==========================================================

  if (!existingDeployment) {
    const deploymentManifest = {
      apiVersion: 'apps/v1',

      kind: 'Deployment',

      metadata: {
        name,
        namespace: NAMESPACE,
        labels: labelSelector
      },

      spec: {
        replicas: 1,

        selector: {
          matchLabels: labelSelector
        },

        template: {
          metadata: {
            labels: labelSelector
          },

          spec: {
            nodeName:
              MARKOV_WORKER_NODE,

            containers: [
              {
                name: appName,

                image: imageName,

                env: desiredEnv,

                ports: [
                  {
                    containerPort
                  }
                ],

                volumeMounts:
                  desiredVolumeMounts
              }
            ],

            volumes:
              desiredVolumes
          }
        }
      }
    };

    try {
      await k8sAppsApi.createNamespacedDeployment({
        namespace: NAMESPACE,
        body: deploymentManifest
      });

      console.log(
        `[USER ${normalizedUserId}] Deployment ${name} created`
      );

    } catch (createErr) {
      const statusCode =
        getKubernetesStatusCode(createErr);

      if (Number(statusCode) === 409) {
        existingDeployment =
          (
            await k8sAppsApi.readNamespacedDeployment({
              name,
              namespace: NAMESPACE
            })
          ).body;
      } else {
        throw createErr;
      }
    }
  }


  // ==========================================================
  // RECONCILE EXISTING DEPLOYMENT
  // ==========================================================

  if (existingDeployment) {
    const podSpec =
      existingDeployment.spec?.template?.spec;

    const existingContainer =
      podSpec?.containers?.find(
        container =>
          container.name === appName
      );

    const existingReplicas =
      existingDeployment.spec?.replicas;

    const existingImage =
      existingContainer?.image;

    const existingNodeName =
      podSpec?.nodeName;

    const existingMount =
      existingContainer?.volumeMounts?.find(
        mount =>
          mount.name === 'markov-app'
      );

    const existingSubPath =
      existingMount?.subPath;

    const existingMountPath =
      existingMount?.mountPath;

    const desiredSubPath =
      `user-${normalizedUserId}`;

    const desiredMountPath =
      '/opt/app/MarkovProprietary/pipelinestages/app/mount';

    const existingPort =
      existingContainer?.ports?.find(
        port =>
          port.containerPort === containerPort
      );

    let needsDockerSocket = false;

    if (appName === 'codel') {
      const existingDockerMount =
        existingContainer?.volumeMounts?.find(
          mount =>
            mount.name === 'docker-sock'
        );

      const existingDockerVolume =
        podSpec?.volumes?.find(
          volume =>
            volume.name === 'docker-sock'
        );

      needsDockerSocket =
        !existingDockerMount ||
        existingDockerMount.mountPath !==
          '/var/run/docker.sock' ||
        !existingDockerVolume ||
        existingDockerVolume?.hostPath?.path !==
          '/var/run/docker.sock' ||
        existingDockerVolume?.hostPath?.type !==
          'Socket';
    }

    let needsCodelBrowserEnv = false;

    if (appName === 'codel') {
      const existingBrowserEnv =
        existingContainer?.env?.find(
          env =>
            env.name === 'CODEL_BROWSER_NAME'
        );

      needsCodelBrowserEnv =
        !existingBrowserEnv ||
        existingBrowserEnv.value !==
          `codel-browser-${normalizedUserId}`;
    }

    const needsCorrection =
      !existingContainer ||
      existingReplicas !== 1 ||
      existingImage !== imageName ||
      existingNodeName !== MARKOV_WORKER_NODE ||
      existingMountPath !== desiredMountPath ||
      existingSubPath !== desiredSubPath ||
      !existingPort ||
      needsDockerSocket ||
      needsCodelBrowserEnv;

    if (needsCorrection) {
      existingDeployment.spec.replicas = 1;

      existingDeployment.metadata.labels =
        labelSelector;

      existingDeployment.spec.selector = {
        matchLabels: labelSelector
      };

      existingDeployment.spec.template.metadata = {
        labels: labelSelector
      };

      existingDeployment.spec.template.spec = {
        ...existingDeployment.spec.template.spec,

        nodeName:
          MARKOV_WORKER_NODE,

        containers: [
          {
            name: appName,

            image: imageName,

            env: desiredEnv,

            ports: [
              {
                containerPort
              }
            ],

            volumeMounts:
              desiredVolumeMounts
          }
        ],

        volumes:
          desiredVolumes
      };

      await k8sAppsApi.replaceNamespacedDeployment({
        name,
        namespace: NAMESPACE,
        body: existingDeployment
      });

      console.log(
        `[USER ${normalizedUserId}] ${name} reconciled`
      );
    }
  }


  // ==========================================================
  // ENSURE SERVICE
  // ==========================================================

  let existingService = null;

  try {
    const result =
      await k8sApi.readNamespacedService({
        name,
        namespace: NAMESPACE
      });

    existingService =
      result.body;

  } catch (err) {
    const statusCode =
      getKubernetesStatusCode(err);

    if (Number(statusCode) !== 404) {
      throw err;
    }
  }

  if (!existingService) {
    const serviceManifest = {
      apiVersion: 'v1',

      kind: 'Service',

      metadata: {
        name,
        namespace: NAMESPACE
      },

      spec: {
        selector: labelSelector,

        ports: [
          {
            port: servicePort,
            targetPort: containerPort
          }
        ]
      }
    };

    try {
      await k8sApi.createNamespacedService({
        namespace: NAMESPACE,
        body: serviceManifest
      });

    } catch (serviceErr) {
      const statusCode =
        getKubernetesStatusCode(serviceErr);

      if (Number(statusCode) !== 409) {
        throw serviceErr;
      }
    }

  } else {
    const existingServicePort =
      existingService.spec?.ports?.find(
        port =>
          port.port === servicePort
      );

    const serviceNeedsCorrection =
      !existingServicePort ||
      String(existingServicePort.targetPort) !==
        String(containerPort) ||
      JSON.stringify(
        existingService.spec.selector
      ) !==
        JSON.stringify(labelSelector);

    if (serviceNeedsCorrection) {
      existingService.spec.selector =
        labelSelector;

      existingService.spec.ports = [
        {
          port: servicePort,
          targetPort: containerPort
        }
      ];

      await k8sApi.replaceNamespacedService({
        name,
        namespace: NAMESPACE,
        body: existingService
      });
    }
  }
}


// ============================================================
// LIGHTDOCK DEPLOYMENT
//
// CRITICAL:
//
// For user 3:
//
//   argv[1]          = "3"
//   MARKOV_USER_ID   = "3"
//
// run_lightdock.sh receives "$1" = "3".
//
// The Python worker must therefore receive:
//
//   Run_Markov.py 3
//
// This prevents LightDock from silently using user 1.
// ============================================================

async function ensureUserLightdockDeployment(
  userId
) {
  const normalizedUserId =
    String(userId).trim();

  if (!normalizedUserId) {
    throw new Error(
      'LightDock requires a user ID'
    );
  }

  if (!/^\d+$/.test(normalizedUserId)) {
    throw new Error(
      `Invalid LightDock user ID: ${normalizedUserId}`
    );
  }

  const appName =
    'lightdock';

  const name =
    `${appName}-${normalizedUserId}`.toLowerCase();

  const desiredImage =
    LIGHTDOCK_IMAGE;

  // ----------------------------------------------------------
  // IMPORTANT:
  //
  // This passes the user ID to run_lightdock.sh as $1.
  //
  // Example:
  //
  // run_lightdock.sh 3
  //
  // ----------------------------------------------------------

  const desiredCommand = [
    '/bin/sh',
    '-c',

    'chmod u+x /opt/app/lightdock/run_lightdock.sh && exec /bin/sh /opt/app/lightdock/run_lightdock.sh "$1"',

    '--',

    normalizedUserId
  ];

  // No Kubernetes container args are necessary because the
  // user ID is already supplied as $1 to the shell command.
  const desiredArgs = [];

  // ----------------------------------------------------------
  // SECOND USER-ID SAFEGUARD
  // ----------------------------------------------------------

  const desiredEnv = [
    {
      name:
        'MARKOV_USER_ID',

      value:
        normalizedUserId
    }
  ];

  const desiredVolumeMounts = [
    getLightdockVolumeMount()
  ];

  const desiredVolumes =
    getUserVolumes();

  console.log(
    '============================================================'
  );

  console.log(
    `[USER ${normalizedUserId}] ENSURE LIGHTDOCK: ${name}`
  );

  console.log(
    `[USER ${normalizedUserId}] Image: ${desiredImage}`
  );

  console.log(
    `[USER ${normalizedUserId}] MARKOV_USER_ID=${normalizedUserId}`
  );

  console.log(
    `[USER ${normalizedUserId}] Worker argv[1]=${normalizedUserId}`
  );

  console.log(
    `[USER ${normalizedUserId}] Node: ${MARKOV_WORKER_NODE}`
  );

  console.log(
    '============================================================'
  );

  let existing = null;

  try {
    const result =
      await k8sAppsApi.readNamespacedDeployment({
        name,
        namespace: NAMESPACE
      });

    existing =
      result.body;

  } catch (err) {
    const statusCode =
      getKubernetesStatusCode(err);

    console.log(
      `[USER ${normalizedUserId}] read deployment ${name} status=${statusCode}`
    );

    if (Number(statusCode) !== 404) {
      throw err;
    }
  }


  // ==========================================================
  // DEPLOYMENT MANIFEST
  // ==========================================================

  const deployment = {
    apiVersion: 'apps/v1',

    kind: 'Deployment',

    metadata: {
      name,
      namespace: NAMESPACE,

      labels: {
        app: name,
        user: normalizedUserId
      }
    },

    spec: {
      replicas: 1,

      strategy: {
        type: 'Recreate'
      },

      selector: {
        matchLabels: {
          app: name
        }
      },

      template: {
        metadata: {
          labels: {
            app: name,
            user: normalizedUserId
          }
        },

        spec: {
          nodeName:
            MARKOV_WORKER_NODE,

          containers: [
            {
              name: appName,

              image: desiredImage,

              command:
                desiredCommand,

              args:
                desiredArgs,

              env:
                desiredEnv,

              resources: {
                requests: {
                  cpu: '4',
                  memory: '12Gi'
                },

                limits: {
                  cpu: '4',
                  memory: '12Gi'
                }
              },

              volumeMounts:
                desiredVolumeMounts
            }
          ],

          volumes:
            desiredVolumes,

          restartPolicy:
            'Always'
        }
      }
    }
  };


  // ==========================================================
  // CREATE OR REPLACE
  // ==========================================================

  if (!existing) {
    console.log(
      `[USER ${normalizedUserId}] Creating ${name}`
    );

    try {
      await k8sAppsApi.createNamespacedDeployment({
        namespace: NAMESPACE,
        body: deployment
      });

      console.log(
        `[USER ${normalizedUserId}] ${name} created`
      );

    } catch (err) {
      const statusCode =
        getKubernetesStatusCode(err);

      if (Number(statusCode) === 409) {
        console.log(
          `[USER ${normalizedUserId}] ${name} was created concurrently`
        );
      } else {
        throw err;
      }
    }

  } else {

    // --------------------------------------------------------
    // ALWAYS reconcile the LightDock deployment.
    //
    // This is intentional because the worker identity is
    // critical. We do not want an old Deployment specification
    // surviving after the Node code changes.
    // --------------------------------------------------------

    console.log(
      `[USER ${normalizedUserId}] Replacing existing ${name}`
    );

    await k8sAppsApi.replaceNamespacedDeployment({
      name,
      namespace: NAMESPACE,
      body: deployment
    });

    console.log(
      `[USER ${normalizedUserId}] ${name} reconciled`
    );
  }

  console.log(
    `[USER ${normalizedUserId}] LightDock configured with explicit user identity`
  );

  console.log(
    `[USER ${normalizedUserId}] argv[1]=${normalizedUserId}`
  );

  console.log(
    `[USER ${normalizedUserId}] MARKOV_USER_ID=${normalizedUserId}`
  );
}


// ============================================================
// COMPLETE USER ENVIRONMENT
// ============================================================

async function provisionUserEnvironment(
  userId
) {
  const normalizedUserId =
    String(userId).trim();

  console.log(
    '============================================================'
  );

  console.log(
    `[USER ${normalizedUserId}] STARTING COMPLETE USER ENVIRONMENT`
  );

  console.log(
    `[USER ${normalizedUserId}] USER WORKSPACE: user-${normalizedUserId}`
  );

  console.log(
    `[USER ${normalizedUserId}] MARKOV NODE: ${MARKOV_WORKER_NODE}`
  );

  console.log(
    '============================================================'
  );

  await ensureUserWorkspace(
    normalizedUserId
  );

  await ensureUserAppDeployment(
    normalizedUserId,
    'downloadapp',
    DOWNLOADAPP_IMAGE,
    3001,
    80
  );

  await ensureUserAppDeployment(
    normalizedUserId,
    'viewer',
    VIEWER_IMAGE,
    8083,
    80
  );

  await ensureUserAppDeployment(
    normalizedUserId,
    'codel',
    CODEL_IMAGE,
    8887,
    8080
  );

  await ensureUserLightdockDeployment(
    normalizedUserId
  );

  console.log(
    '============================================================'
  );

  console.log(
    `[USER ${normalizedUserId}] COMPLETE USER ENVIRONMENT READY`
  );

  console.log(
    '============================================================'
  );
}


// ============================================================
// USER SIMULATION SIGNAL
// ============================================================

app.post(
  '/html/simulate',
  authenticateToken,
  async (req, res) => {
    const userId =
      String(req.user?.id ?? '').trim();

    if (!userId) {
      console.error(
        'FATAL: authenticated request has no user ID'
      );

      return res.status(401).json({
        ok: false,
        error:
          'authenticated user has no ID'
      });
    }

    try {
      const workspace =
        await ensureUserWorkspace(
          userId
        );

      const src =
        path.resolve(
          __dirname,
          'ping.json'
        );

      const dest =
        path.join(
          workspace.input,
          'ping.json'
        );

      await fs.promises.copyFile(
        src,
        dest
      );

      console.log(
        `Copied ping.json for user ${userId} to ${dest}`
      );

      res.json({
        ok: true,
        user_id: userId
      });

    } catch (err) {
      console.error(
        `Simulation setup failed for user ${userId}:`,
        err
      );

      res.status(500).json({
        error:
          'simulation setup failed'
      });
    }
  }
);


// ============================================================
// INPUT FILE UPLOAD
// ============================================================

app.post(
  '/input',
  authenticateToken,
  async (req, res) => {
    const userId =
      req.user.id;

    const {
      filename,
      content
    } = req.body;

    if (
      !filename ||
      typeof filename !== 'string'
    ) {
      return res.status(400).json({
        error:
          'filename required'
      });
    }

    const safeFilename =
      path.basename(filename);

    if (
      safeFilename !== filename
    ) {
      return res.status(400).json({
        error:
          'invalid filename'
      });
    }

    try {
      await ensureUserWorkspace(
        userId
      );

      const file =
        path.join(
          getUserInputDir(userId),
          safeFilename
        );

      await fs.promises.writeFile(
        file,
        content || ''
      );

      res.json({
        ok: true,
        user_id: userId,
        filename: safeFilename
      });

    } catch (err) {
      console.error(
        `Input write failed for user ${userId}:`,
        err
      );

      res.status(500).json({
        error:
          'input write failed'
      });
    }
  }
);


// ============================================================
// GET INPUT FILE
// ============================================================

app.get(
  '/input/:filename',
  authenticateToken,
  async (req, res) => {
    const userId =
      req.user.id;

    const safeFilename =
      path.basename(
        req.params.filename
      );

    if (
      safeFilename !==
      req.params.filename
    ) {
      return res.status(400).send(
        'Invalid filename'
      );
    }

    const file =
      path.join(
        getUserInputDir(userId),
        safeFilename
      );

    if (!fs.existsSync(file)) {
      return res.status(404).send(
        'Not found'
      );
    }

    res.sendFile(file);
  }
);


// ============================================================
// GET USER MESSAGE
// ============================================================

app.get(
  '/html',
  authenticateToken,
  (req, res) => {
    const userId =
      req.user.id;

    const file =
      path.join(
        getUserOutputDir(userId),
        'message.txt'
      );

    if (!fs.existsSync(file)) {
      return res.status(404).send(
        'Not found'
      );
    }

    res.setHeader(
      'Content-Type',
      'text/plain'
    );

    fs.createReadStream(file).pipe(res);
  }
);


// ============================================================
// AUTH VERIFY
// ============================================================

app.get(
  '/auth/verify',
  (req, res) => {
    const token =
      req.cookies.token;

    if (!token) {
      return res.status(401).json({
        message:
          'No token'
      });
    }

    try {
      const decoded =
        jwt.verify(
          token,
          JWT_SECRET
        );

      return res.status(200).json({
        ok: true,
        user_id: decoded.id
      });

    } catch (err) {
      return res.status(403).json({
        message:
          'Invalid token'
      });
    }
  }
);


// ============================================================
// MAIN SIMULATION / ENVIRONMENT ROUTE
// ============================================================

app.post(
  '/html',
  authenticateToken,
  async (req, res) => {
    const userId =
      req.user.id;

    const { query } =
      req.body;

    console.log(
      '============================================================'
    );

    console.log(
      'POST /html REACHED'
    );

    console.log(
      `Authenticated user ID: ${userId}`
    );

    console.log(
      'Received query:',
      query
    );

    console.log(
      '============================================================'
    );

    if (
      typeof query !== 'string' ||
      !query.trim()
    ) {
      return res.status(400).json({
        ok: false,
        error:
          'query is required'
      });
    }

    try {
      const workspace =
        await ensureUserWorkspace(
          userId
        );

      const namesPath =
        path.join(
          workspace.input,
          'names.txt'
        );

      await fs.promises.writeFile(
        namesPath,
        query.trim()
      );

      console.log(
        `[USER ${userId}] Wrote query to ${namesPath}`
      );

      return res.json({
        ok: true,
        user_id: userId,
        query: query.trim(),
        file: namesPath
      });

    } catch (err) {
      console.error(
        `[USER ${userId}] Failed to write query:`,
        err
      );

      return res.status(500).json({
        ok: false,
        error:
          'failed to write query'
      });
    }
  }
);


// ============================================================
// START
// ============================================================

app.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `Server listening on port ${PORT}`
    );
  }
);