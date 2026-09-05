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

const k8sApi =
  kc.makeApiClient(
    k8s.CoreV1Api
  );

const k8sAppsApi =
  kc.makeApiClient(
    k8s.AppsV1Api
  );

const BASE_MOUNT =
  '/opt/app/MarkovProprietary/pipelinestages/app/mount';

const NAMESPACE =
  'default';

const MARKOV_WORKER_NODE =
  'gke-markov-cluster-markov-pool-bf1302c9-sc8m';

const LIGHTDOCK_IMAGE =
  'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/lightdock:v64';

const DOWNLOADAPP_IMAGE =
  'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/downloadapp:v30';

const VIEWER_IMAGE =
  'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/viewer:latest';

const CODEL_IMAGE =
  'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/codel:v42';


// ============================================================
// AUTHENTICATION
// ============================================================

function authenticateToken(
  req,
  res,
  next
) {
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
      message:
        'Authentication required'
    });
  }

  try {
    const decoded =
      jwt.verify(
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
      message:
        'Invalid or expired token'
    });
  }
}


// ============================================================
// LOGIN
// ============================================================

app.post(
  '/login',
  async (req, res) => {
    const {
      email,
      password
    } = req.body;

    try {
      const result =
        await pool.query(
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

      if (
        result.rows.length === 0
      ) {
        return res.status(401).json({
          message:
            'Invalid credentials'
        });
      }

      const user =
        result.rows[0];

      const match =
        await bcrypt.compare(
          password,
          user.password_hash
        );

      if (!match) {
        return res.status(401).json({
          message:
            'Invalid credentials'
        });
      }

      const token =
        jwt.sign(
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
        message:
          'Login successful',

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
        message:
          'Server error'
      });
    }
  }
);


// ============================================================
// GLOBAL AUTH PROTECTION
// ============================================================

app.use(
  (req, res, next) => {
    if (
      req.path === '/login'
    ) {
      return next();
    }

    authenticateToken(
      req,
      res,
      next
    );
  }
);


// ============================================================
// USER PATH HELPERS
// ============================================================

function getUserMount(
  userId
) {
  return path.join(
    BASE_MOUNT,
    `user-${userId}`
  );
}

function getUserInputDir(
  userId
) {
  return path.join(
    getUserMount(userId),
    'input'
  );
}

function getUserOutputDir(
  userId
) {
  return path.join(
    getUserMount(userId),
    'output'
  );
}


// ============================================================
// USER DIRECTORIES
// ============================================================

function ensureUserDirectories(
  userId
) {
  const inputDir =
    getUserInputDir(
      userId
    );

  const outputDir =
    getUserOutputDir(
      userId
    );

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

  if (
    !fs.existsSync(
      messagePath
    )
  ) {
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
  if (
    !fs.existsSync(
      sourceDir
    )
  ) {
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

  for (
    const entry of entries
  ) {
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

    if (
      entry.isDirectory()
    ) {
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
        if (
          err.code !==
          'EEXIST'
        ) {
          throw err;
        }
      }
    }
  }
}


// ============================================================
// USER WORKSPACE
// ============================================================

async function ensureUserWorkspace(
  userId
) {
  const userRoot =
    getUserMount(
      userId
    );

  const userInputDir =
    getUserInputDir(
      userId
    );

  const userOutputDir =
    getUserOutputDir(
      userId
    );

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
    `========== WORKSPACE SETUP START: USER ${userId} ==========`
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

  /*
   * Copy the root server_two.js into the user's
   * isolated workspace.
   */
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

  if (
    fs.existsSync(
      sourceServerTwo
    )
  ) {
    await fs.promises.copyFile(
      sourceServerTwo,
      destinationServerTwo
    );

    console.log(
      `Copied server_two.js to user workspace: ${destinationServerTwo}`
    );
  }

  /*
   * Initialize the user's workspace only from
   * the shared template.
   */
  const workspaceWasNew =
    !fs.existsSync(
      path.join(
        userRoot,
        '.workspace_initialized'
      )
    );

  if (
    workspaceWasNew
  ) {
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
      `Initialized workspace for user ${userId}`
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

  if (
    !fs.existsSync(
      messagePath
    )
  ) {
    await fs.promises.writeFile(
      messagePath,
      ''
    );
  }

  console.log(
    `Workspace ready for user ${userId}: ${userRoot}`
  );

  console.log(
    `========== WORKSPACE SETUP COMPLETE: USER ${userId} ==========`
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
    user:
      userId.toString()
  };
}

function getUserVolumeMount(
  userId
) {
  return {
    name:
      'markov-app',

    mountPath:
      '/opt/app/MarkovProprietary/pipelinestages/app/mount',

    subPath:
      `user-${userId}`
  };
}

function getUserVolumes() {
  return [
    {
      name:
        'markov-app',

      persistentVolumeClaim: {
        claimName:
          'markov-app'
      }
    }
  ];
}


// ============================================================
// CODEL DOCKER SOCKET
// ============================================================

function getCodelVolumeMounts(
  userId
) {
  return [
    {
      name:
        'docker-sock',

      mountPath:
        '/var/run/docker.sock'
    },

    getUserVolumeMount(
      userId
    )
  ];
}

function getCodelVolumes() {
  return [
    {
      name:
        'docker-sock',

      hostPath: {
        path:
          '/var/run/docker.sock',

        type:
          'Socket'
      }
    },

    {
      name:
        'markov-app',

      persistentVolumeClaim: {
        claimName:
          'markov-app'
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
  const name =
    `${appName}-${userId}`.toLowerCase();

  const labelSelector =
    getUserWorkerLabels(
      name,
      userId
    );

  console.log(
    '============================================================'
  );

  console.log(
    `[USER ${userId}] ENSURE APP: ${name}`
  );

  console.log(
    `[USER ${userId}] Image: ${imageName}`
  );

  console.log(
    `[USER ${userId}] Service Port: ${servicePort}`
  );

  console.log(
    `[USER ${userId}] Container Port: ${containerPort}`
  );

  console.log(
    `[USER ${userId}] Workspace: user-${userId}`
  );

  console.log(
    `[USER ${userId}] Node: ${MARKOV_WORKER_NODE}`
  );

  console.log(
    '============================================================'
  );

  let desiredVolumeMounts = [
    getUserVolumeMount(
      userId
    )
  ];

  let desiredVolumes =
    getUserVolumes();

  let desiredEnv = [];

  /*
   * Codel is the ONLY application that gets
   * access to the host Docker socket.
   */
  if (appName === 'codel') {
    desiredVolumeMounts = getCodelVolumeMounts(userId);
    desiredVolumes = getCodelVolumes();

    desiredEnv = [
      {
        name: 'CODEL_BROWSER_NAME',
        value: `codel-browser-${userId}`
      }
    ];

    console.log(
      `[USER ${userId}] ${name} is CODEL`
    );

    console.log(
      `[USER ${userId}] CODEL_BROWSER_NAME=codel-browser-${userId}`
    );
  }

  try {
    let existingDeployment;

    try {
      const result =
        await k8sAppsApi.readNamespacedDeployment(
          {
            name,
            namespace:
              NAMESPACE
          }
        );

      existingDeployment =
        result.body;

    } catch (err) {
      if (
        err.statusCode === 404
      ) {
        existingDeployment =
          null;
      } else {
        throw err;
      }
    }

    if (
      !existingDeployment
    ) {
      console.log(
        `[USER ${userId}] Creating deployment ${name}`
      );

      const deploymentManifest = {
        apiVersion:
          'apps/v1',

        kind:
          'Deployment',

        metadata: {
          name,
          namespace:
            NAMESPACE,

          labels:
            labelSelector
        },

        spec: {
          replicas: 1,

          selector: {
            matchLabels:
              labelSelector
          },

          template: {
            metadata: {
              labels:
                labelSelector
            },

            spec: {
              nodeName:
                MARKOV_WORKER_NODE,

              containers: [
                {
                  name:
                    appName,

                  image:
                    imageName,

                  env:
                    desiredEnv,

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

      await k8sAppsApi.createNamespacedDeployment(
        {
          namespace:
            NAMESPACE,

          body:
            deploymentManifest
        }
      );

      console.log(
        `[USER ${userId}] Deployment ${name} created`
      );

    } else {
      const existingPodSpec =
        existingDeployment
          .spec
          ?.template
          ?.spec;

      const existingContainer =
        existingPodSpec
          ?.containers
          ?.find(
            container =>
              container.name ===
              appName
          );

      const existingReplicas =
        existingDeployment
          .spec
          ?.replicas;

      const existingImage =
        existingContainer
          ?.image;

      const existingNodeName =
        existingPodSpec
          ?.nodeName;

      const existingMount =
        existingContainer
          ?.volumeMounts
          ?.find(
            mount =>
              mount.name ===
              'markov-app'
          );

      const existingSubPath =
        existingMount
          ?.subPath;

      const desiredSubPath =
        `user-${userId}`;

      const existingPort =
        existingContainer
          ?.ports
          ?.find(
            port =>
              port.containerPort ===
              containerPort
          );

      let needsDockerSocket =
        false;

      if (
        appName === 'codel'
      ) {
        const existingDockerMount =
          existingContainer
            ?.volumeMounts
            ?.find(
              mount =>
                mount.name ===
                'docker-sock'
            );

        const existingDockerVolume =
          existingPodSpec
            ?.volumes
            ?.find(
              volume =>
                volume.name ===
                'docker-sock'
            );

        needsDockerSocket =
          !existingDockerMount ||
          existingDockerMount.mountPath !==
            '/var/run/docker.sock' ||
          !existingDockerVolume ||
          existingDockerVolume
            ?.hostPath
            ?.path !==
              '/var/run/docker.sock' ||
          existingDockerVolume
            ?.hostPath
            ?.type !==
              'Socket';

        console.log(
          `[USER ${userId}] docker socket mount=${
            existingDockerMount?.mountPath ||
            '<none>'
          }`
        );

        console.log(
          `[USER ${userId}] docker socket volume=${
            existingDockerVolume
              ?.hostPath
              ?.path ||
            '<none>'
          }`
        );
      }

      let needsCodelBrowserEnv =
        false;

      if (
        appName === 'codel'
      ) {
        const existingBrowserEnv =
          existingContainer
            ?.env
            ?.find(
              env =>
                env.name ===
                'CODEL_BROWSER_NAME'
            );

        needsCodelBrowserEnv =
          !existingBrowserEnv ||
          existingBrowserEnv.value !==
            `codel-browser-${userId}`;

        console.log(
          `[USER ${userId}] CODEL_BROWSER_NAME=${
            existingBrowserEnv?.value ||
            '<none>'
          }`
        );
      }

      const needsCorrection =
        existingReplicas !== 1 ||
        existingImage !== imageName ||
        existingNodeName !==
          MARKOV_WORKER_NODE ||
        existingSubPath !==
          desiredSubPath ||
        !existingContainer ||
        !existingPort ||
        needsDockerSocket ||
        needsCodelBrowserEnv;

      console.log(
        `[USER ${userId}] ${name} exists`
      );

      console.log(
        `[USER ${userId}] replicas=${existingReplicas}`
      );

      console.log(
        `[USER ${userId}] image=${existingImage}`
      );

      console.log(
        `[USER ${userId}] node=${existingNodeName}`
      );

      console.log(
        `[USER ${userId}] workspace=${existingSubPath}`
      );

      if (
        needsCorrection
      ) {
        console.log(
          `[USER ${userId}] RECONCILING ${name}`
        );

        existingDeployment.spec.replicas =
          1;

        existingDeployment
          .spec
          .template
          .spec
          .nodeName =
            MARKOV_WORKER_NODE;

        existingDeployment
          .spec
          .template
          .spec
          .containers = [
            {
              name:
                appName,

              image:
                imageName,

              env:
                desiredEnv,

              ports: [
                {
                  containerPort
                }
              ],

              volumeMounts:
                desiredVolumeMounts
            }
          ];

        existingDeployment
          .spec
          .template
          .spec
          .volumes =
            desiredVolumes;

        existingDeployment
          .spec
          .selector
          .matchLabels =
            labelSelector;

        existingDeployment
          .spec
          .template
          .metadata
          .labels =
            labelSelector;

        existingDeployment
          .metadata
          .labels =
            labelSelector;

        await k8sAppsApi.replaceNamespacedDeployment(
          {
            name,
            namespace:
              NAMESPACE,

            body:
              existingDeployment
          }
        );

        console.log(
          `[USER ${userId}] ${name} reconciled`
        );

      } else {
        console.log(
          `[USER ${userId}] ${name} already correct`
        );
      }
    }

    /*
     * Ensure Service exists and is correct.
     */
    let existingService = null;

    try {
      const result =
        await k8sApi.readNamespacedService(
          {
            name,
            namespace:
              NAMESPACE
          }
        );

      existingService =
        result.body;

    } catch (err) {
      if (
        err.statusCode !== 404
      ) {
        throw err;
      }
    }

    if (
      !existingService
    ) {
      const serviceManifest = {
        apiVersion:
          'v1',

        kind:
          'Service',

        metadata: {
          name,
          namespace:
            NAMESPACE
        },

        spec: {
          selector:
            labelSelector,

          ports: [
            {
              port:
                servicePort,

              targetPort:
                containerPort
            }
          ]
        }
      };

      try {
        await k8sApi.createNamespacedService(
          {
            namespace:
              NAMESPACE,

            body:
              serviceManifest
          }
        );

        console.log(
          `[USER ${userId}] Service ${name} created`
        );

      } catch (serviceErr) {
        if (
          serviceErr.statusCode ===
          409
        ) {
          console.log(
            `[USER ${userId}] Service ${name} already exists`
          );
        } else {
          throw serviceErr;
        }
      }

    } else {
      console.log(
        `[USER ${userId}] Service ${name} already exists`
      );

      console.log(
        `[USER ${userId}] RECONCILING SERVICE ${name}`
      );

      const existingServicePort =
        existingService
          .spec
          ?.ports
          ?.find(
            port =>
              port.port ===
              servicePort
          );

      const serviceNeedsCorrection =
        !existingServicePort ||
        existingServicePort.targetPort !==
          containerPort ||
        JSON.stringify(
          existingService.spec.selector
        ) !==
          JSON.stringify(
            labelSelector
          );

      if (
        serviceNeedsCorrection
      ) {
        existingService.spec.selector =
          labelSelector;

        existingService.spec.ports = [
          {
            port:
              servicePort,

            targetPort:
              containerPort
          }
        ];

        await k8sApi.replaceNamespacedService(
          {
            name,
            namespace:
              NAMESPACE,

            body:
              existingService
          }
        );
      }

      console.log(
        `[USER ${userId}] SERVICE ${name} RECONCILED`
      );
    }

  } catch (err) {
    console.error(
      `[USER ${userId}] FAILED ENSURING ${name}`
    );

    console.error(
      'Kubernetes status code:',
      err.statusCode ||
        'unknown'
    );

    console.error(
      'Kubernetes response body:',
      err.body ||
        'none'
    );

    throw err;
  }
}


// ============================================================
// PERSISTENT LIGHTDOCK WORKER
// IMPORTANT: THIS FUNCTION TAKES ONLY userId.
// THERE IS NO appName HERE.
// ============================================================

async function ensureUserLightdockDeployment(userId) {
  const appName = 'lightdock';

  const name = `${appName}-${userId}`.toLowerCase();

  const desiredImage = LIGHTDOCK_IMAGE;

  const desiredCommand = [
    'python',
    'Run_Markov.py',
    userId.toString()
  ];

  const desiredVolumeMounts = [
    getUserVolumeMount(userId)
  ];

  const desiredVolumes = getUserVolumes();

  console.log('');
  console.log('============================================================');
  console.log(`[USER ${userId}] ENSURE LIGHTDOCK: ${name}`);
  console.log(`[USER ${userId}] Image: ${desiredImage}`);
  console.log(`[USER ${userId}] Command: ${desiredCommand.join(' ')}`);
  console.log(`[USER ${userId}] Workspace: user-${userId}`);
  console.log(`[USER ${userId}] Node: ${MARKOV_WORKER_NODE}`);
  console.log('============================================================');

  const existing = await getKubernetesObject(
    appsV1Api.readNamespacedDeployment,
    name
  );

  if (existing) {
    console.log(`[USER ${userId}] ${name} exists`);

    const currentImage =
      existing.spec?.template?.spec?.containers?.[0]?.image;

    const currentCommand =
      existing.spec?.template?.spec?.containers?.[0]?.command || [];

    const currentNode =
      existing.spec?.template?.spec?.nodeSelector?.['kubernetes.io/hostname'];

    console.log(
      `[USER ${userId}] image=${currentImage}`
    );

    console.log(
      `[USER ${userId}] node=${currentNode}`
    );

    if (
      currentImage === desiredImage &&
      JSON.stringify(currentCommand) === JSON.stringify(desiredCommand) &&
      currentNode === MARKOV_WORKER_NODE
    ) {
      console.log(
        `[USER ${userId}] ${name} already correct`
      );

      return;
    }
  }

  const deployment = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',

    metadata: {
      name,
      labels: {
        app: name,
        'io.kompose.service': name
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
            'io.kompose.service': name
          }
        },

        spec: {
          nodeSelector: {
            workload: 'markov',
            'kubernetes.io/arch': 'amd64',
            'kubernetes.io/hostname': MARKOV_WORKER_NODE
          },

          containers: [
            {
              name: appName,
              image: desiredImage,

              command: desiredCommand,

              env: [
                {
                  name: 'JWT_SECRET',
                  value: JWT_SECRET
                }
              ],

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

              volumeMounts: desiredVolumeMounts
            }
          ],

          volumes: desiredVolumes,

          restartPolicy: 'Always'
        }
      }
    }
  };

  if (existing) {
    console.log(
      `[USER ${userId}] Updating ${name}`
    );

    await appsV1Api.replaceNamespacedDeployment(
      name,
      K8S_NAMESPACE,
      deployment
    );
  } else {
    console.log(
      `[USER ${userId}] Creating ${name}`
    );

    await appsV1Api.createNamespacedDeployment(
      K8S_NAMESPACE,
      deployment
    );
  }

  console.log(
    `[USER ${userId}] ${name} deployment reconciled`
  );
}

// ============================================================
// COMPLETE USER ENVIRONMENT
// ============================================================

async function provisionUserEnvironment(
  userId
) {
  console.log(
    '============================================================'
  );

  console.log(
    `[USER ${userId}] STARTING COMPLETE USER ENVIRONMENT`
  );

  console.log(
    `[USER ${userId}] USER WORKSPACE: user-${userId}`
  );

  console.log(
    `[USER ${userId}] MARKOV NODE: ${MARKOV_WORKER_NODE}`
  );

  console.log(
    '============================================================'
  );

  await ensureUserWorkspace(
    userId
  );

  console.log(
    `[USER ${userId}] WORKSPACE READY`
  );

  console.log(
    `[USER ${userId}] ENSURING downloadapp-${userId}`
  );

  await ensureUserAppDeployment(
    userId,
    'downloadapp',
    DOWNLOADAPP_IMAGE,
    3001,
    80
  );

  console.log(
    `[USER ${userId}] ENSURING viewer-${userId}`
  );

  await ensureUserAppDeployment(
    userId,
    'viewer',
    VIEWER_IMAGE,
    8083,
    80
  );

  console.log(
    `[USER ${userId}] ENSURING codel-${userId}`
  );

  await ensureUserAppDeployment(
    userId,
    'codel',
    CODEL_IMAGE,
    8887,
    8080
  );

  console.log(
    `[USER ${userId}] ENSURING lightdock-${userId}`
  );

  /*
   * CRITICAL:
   * Lightdock is independent of ensureUserAppDeployment().
   * Do NOT pass appName.
   */
  await ensureUserLightdockDeployment(
    userId
  );

  console.log(
    '============================================================'
  );

  console.log(
    `[USER ${userId}] COMPLETE USER ENVIRONMENT READY`
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
      req.user.id;

    try {
      const workspace =
        await ensureUserWorkspace(
          userId
        );

      const inputDir =
        workspace.input;

      const src =
        path.resolve(
          __dirname,
          'ping.json'
        );

      const dest =
        path.join(
          inputDir,
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
        user_id:
          userId
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
      typeof filename !==
        'string'
    ) {
      return res.status(400).json({
        error:
          'filename required'
      });
    }

    const safeFilename =
      path.basename(
        filename
      );

    if (
      safeFilename !==
      filename
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
          getUserInputDir(
            userId
          ),
          safeFilename
        );

      await fs.promises.writeFile(
        file,
        content || ''
      );

      res.json({
        ok: true,
        user_id:
          userId,
        filename:
          safeFilename
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
        getUserInputDir(
          userId
        ),
        safeFilename
      );

    if (
      !fs.existsSync(file)
    ) {
      return res.status(404).send(
        'Not found'
      );
    }

    res.sendFile(
      file
    );
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
        getUserOutputDir(
          userId
        ),
        'message.txt'
      );

    if (
      !fs.existsSync(file)
    ) {
      return res.status(404).send(
        'Not found'
      );
    }

    res.setHeader(
      'Content-Type',
      'text/plain'
    );

    fs.createReadStream(
      file
    ).pipe(res);
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
      jwt.verify(
        token,
        JWT_SECRET
      );

      return res.status(200).json({
        ok: true
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
      `[USER ${userId}] Ensuring complete persistent environment`
    );

    console.log(
      '============================================================'
    );

    try {
      await provisionUserEnvironment(
        userId
      );

      res.json({
        ok: true,

        message:
          'User-specific apps and persistent simulation worker ready',

        user_id:
          userId,

        endpoints: {
          codel:
            '/codel/',
          viewer:
            '/viewer/',
          download:
            '/download/'
        }
      });

    } catch (err) {
      console.error(
        '============================================================'
      );

      console.error(
        `[USER ${userId}] FAILED TO PROVISION USER ENVIRONMENT`
      );

      console.error(
        'Kubernetes status code:',
        err.statusCode ||
          'unknown'
      );

      console.error(
        'Kubernetes response body:',
        err.body ||
          'none'
      );

      console.error(
        'Full error:',
        err
      );

      console.error(
        '============================================================'
      );

      return res.status(500).json({
        error:
          'Failed to provision isolated user stack'
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