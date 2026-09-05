const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();

app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = 80;

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'db',
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: 'postgres'
});

const k8s = require('@kubernetes/client-node');
const kc = new k8s.KubeConfig();

kc.loadFromCluster();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);

const BASE_MOUNT =
  '/opt/app/MarkovProprietary/pipelinestages/app/mount';

const NAMESPACE = 'default';

// ============================================================
// DEDICATED MARKOV NODE
// ============================================================

const MARKOV_WORKER_NODE =
  'gke-markov-cluster-markov-pool-bf1302c9-sc8m';

// ============================================================
// IMAGES
// ============================================================

const LIGHTDOCK_IMAGE =
  'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/lightdock:v64';

const DOWNLOADAPP_IMAGE =
  'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/downloadapp:v30';

const VIEWER_IMAGE =
  'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/viewer:latest';

const CODEL_IMAGE =
  'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/codel:v40';

// ============================================================
// KUBERNETES RESPONSE HELPER
// ============================================================
//
// Different @kubernetes/client-node versions can expose the
// Kubernetes object either directly or under response.body.
//
// Always normalize the response before accessing .spec, .metadata,
// etc.
// ============================================================

function getKubernetesObject(response) {
  if (
    response &&
    response.body !== undefined &&
    response.body !== null
  ) {
    return response.body;
  }

  return response;
}

// ============================================================
// AUTH MIDDLEWARE
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
    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    req.user = decoded;

    console.log(
      `Authenticated request: ${req.method} ${req.path} for user ${decoded.id}`
    );

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
// USER PATH HELPERS
// ============================================================

function getUserMount(userId) {
  return path.join(
    BASE_MOUNT,
    `user-${userId}`
  );
}

function getCodelVolumeMounts(userId) {
  return [
    {
      name: 'docker-sock',
      mountPath: '/var/run/docker.sock'
    },
    getUserVolumeMount(userId)
  ];
}

function getCodelVolumes() {
  return [
    {
      name: 'docker-sock',
      hostPath: {
        path: '/var/run/docker.sock',
        type: 'Socket'
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
    userRoot:
      getUserMount(userId),

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
    const sourcePath =
      path.join(
        sourceDir,
        entry.name
      );

    const destinationPath =
      path.join(
        destinationDir,
        entry.name
      );

    await fs.promises.cp(
      sourcePath,
      destinationPath,
      {
        recursive: true,
        force: false
      }
    );
  }
}

// ============================================================
// USER WORKSPACE SETUP
// ============================================================

async function ensureUserWorkspace(userId) {
  const mountRoot =
    BASE_MOUNT;

  const userRoot =
    getUserMount(userId);

  const userInputDir =
    getUserInputDir(userId);

  const userOutputDir =
    getUserOutputDir(userId);

  const templateInputDir =
    path.join(
      mountRoot,
      'input'
    );

  const templateOutputDir =
    path.join(
      mountRoot,
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
    userRoot,
    {
      recursive: true
    }
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

  // ==========================================================
  // COPY server_two.js INTO USER WORKSPACE
  // KEEP THE ROOT server_two.js
  // ==========================================================

  const serverTwoSource =
    path.join(
      mountRoot,
      'server_two.js'
    );

  const serverTwoDestination =
    path.join(
      userRoot,
      'server_two.js'
    );

  await fs.promises.copyFile(
    serverTwoSource,
    serverTwoDestination
  );

  console.log(
    `Copied server_two.js to user workspace: ${serverTwoDestination}`
  );

  // ==========================================================
  // COPY TEMPLATE INPUT INTO USER WORKSPACE
  // ==========================================================

  await copyDirectoryContents(
    templateInputDir,
    userInputDir
  );

  // ==========================================================
  // COPY TEMPLATE OUTPUT INTO USER WORKSPACE
  // ==========================================================

  await copyDirectoryContents(
    templateOutputDir,
    userOutputDir
  );

  console.log(
    `Workspace ready for user ${userId}: ${userRoot}`
  );

  console.log(
    `========== WORKSPACE SETUP COMPLETE: USER ${userId} ==========`
  );

  return {
    root:
      userRoot,

    input:
      userInputDir,

    output:
      userOutputDir
  };
}

// ============================================================
// COMMON USER WORKER CONFIGURATION
// ============================================================

function getUserWorkerLabels(
  name,
  userId
) {
  return {
    app:
      name,

    user:
      userId.toString(),

    markov:
      'true'
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
      name:
        'markov-app',

      persistentVolumeClaim: {
        claimName:
          'markov-app'
      }
    }
  ];
}

function getCodelVolumeMounts(userId) {
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
// USER APP DEPLOYMENT + SERVICE
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

  const namespace =
    NAMESPACE;

  const labelSelector =
    getUserWorkerLabels(
      name,
      userId
    );

  const desiredSubPath =
    `user-${userId}`;

  console.log(
    `============================================================`
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
    `[USER ${userId}] Workspace: ${desiredSubPath}`
  );

  console.log(
    `[USER ${userId}] Node: ${MARKOV_WORKER_NODE}`
  );

  console.log(
    `============================================================`
  );

  // ==========================================================
  // VOLUMES
  // ==========================================================

  const desiredVolumeMounts =
    appName === 'codel'
      ? getCodelVolumeMounts(userId)
      : [
          getUserVolumeMount(userId)
        ];

  const desiredVolumes =
    appName === 'codel'
      ? getCodelVolumes()
      : getUserVolumes();

  // ==========================================================
  // DEPLOYMENT MANIFEST
  // ==========================================================

  const deploymentManifest = {
    apiVersion:
      'apps/v1',

    kind:
      'Deployment',

    metadata: {
      name,
      namespace,
      labels:
        labelSelector
    },

    spec: {
      replicas:
        1,

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

    // ========================================================
    // CHECK EXISTING DEPLOYMENT
    // ========================================================

    const existingResponse =
      await k8sAppsApi.readNamespacedDeployment({
        name,
        namespace
      });

    const existingDeployment =
      getKubernetesObject(
        existingResponse
      );

    if (!existingDeployment) {
      throw new Error(
        `Kubernetes returned an empty Deployment response for ${name}`
      );
    }

    const existingPodSpec =
      existingDeployment
        ?.spec
        ?.template
        ?.spec;

    const existingContainer =
      existingPodSpec
        ?.containers
        ?.find(
          container =>
            container.name === appName
        );

    const existingReplicas =
      existingDeployment
        ?.spec
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
            mount.name === 'markov-app'
        );

    const existingSubPath =
      existingMount
        ?.subPath;

    const existingPort =
      existingContainer
        ?.ports
        ?.find(
          port =>
            port.containerPort === containerPort
        );

    // ========================================================
    // DOCKER SOCKET CHECK
    // ========================================================

    const existingDockerMount =
      existingContainer
        ?.volumeMounts
        ?.find(
          mount =>
            mount.name === 'docker-sock'
        );

    const existingDockerVolume =
      existingPodSpec
        ?.volumes
        ?.find(
          volume =>
            volume.name === 'docker-sock'
        );

    const needsDockerSocket =
      appName === 'codel' &&
      (
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
            'Socket'
      );

    // ========================================================
    // DETERMINE WHETHER DEPLOYMENT NEEDS RECONCILIATION
    // ========================================================

    const needsCorrection =
      existingReplicas !== 1 ||
      existingImage !== imageName ||
      existingNodeName !== MARKOV_WORKER_NODE ||
      existingSubPath !== desiredSubPath ||
      !existingContainer ||
      !existingPort ||
      needsDockerSocket;

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
      `[USER ${userId}] node=${existingNodeName || '<none>'}`
    );

    console.log(
      `[USER ${userId}] workspace=${existingSubPath || '<none>'}`
    );

    if (appName === 'codel') {
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

    // ========================================================
    // RECONCILE
    // ========================================================

    if (needsCorrection) {

      console.log(
        `[USER ${userId}] RECONCILING ${name}`
      );

      existingDeployment
        .spec
        .replicas =
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
        .metadata
        .labels =
          labelSelector;

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

      await k8sAppsApi.replaceNamespacedDeployment({
        name,
        namespace,
        body:
          existingDeployment
      });

      console.log(
        `[USER ${userId}] ${name} RECONCILED`
      );

    } else {

      console.log(
        `[USER ${userId}] ${name} already correct`
      );
    }

  } catch (err) {

    // ========================================================
    // DEPLOYMENT DOES NOT EXIST
    // ========================================================

    if (err.code !== 404) {

      console.error(
        `[USER ${userId}] ERROR CHECKING ${name}:`,
        err.body || err
      );

      throw err;
    }

    console.log(
      `[USER ${userId}] ${name} DOES NOT EXIST`
    );

    console.log(
      `[USER ${userId}] CREATING ${name}`
    );

    try {

      await k8sAppsApi.createNamespacedDeployment({
        namespace,
        body:
          deploymentManifest
      });

      console.log(
        `[USER ${userId}] ${name} CREATED`
      );

    } catch (createErr) {

      if (createErr.code === 409) {

        console.log(
          `[USER ${userId}] ${name} was created concurrently`
        );

      } else {

        console.error(
          `[USER ${userId}] FAILED CREATING ${name}:`,
          createErr.body || createErr
        );

        throw createErr;
      }
    }
  }

  // ==========================================================
  // SERVICE
  // ==========================================================

  const serviceManifest = {
    apiVersion:
      'v1',

    kind:
      'Service',

    metadata: {
      name,
      namespace
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

    const existingServiceResponse =
      await k8sApi.readNamespacedService({
        name,
        namespace
      });

    const existingService =
      getKubernetesObject(
        existingServiceResponse
      );

    console.log(
      `[USER ${userId}] Service ${name} already exists`
    );

    const existingServicePort =
      existingService
        ?.spec
        ?.ports
        ?.find(
          port =>
            port.port === servicePort &&
            port.targetPort === containerPort
        );

    const existingSelector =
      existingService
        ?.spec
        ?.selector;

    const selectorMatches =
      JSON.stringify(
        existingSelector
      ) ===
      JSON.stringify(
        labelSelector
      );

    if (
      !existingServicePort ||
      !selectorMatches
    ) {

      console.log(
        `[USER ${userId}] RECONCILING SERVICE ${name}`
      );

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

      await k8sApi.replaceNamespacedService({
        name,
        namespace,
        body:
          existingService
      });

      console.log(
        `[USER ${userId}] SERVICE ${name} RECONCILED`
      );
    }

  } catch (serviceReadErr) {

    if (serviceReadErr.code !== 404) {

      console.error(
        `[USER ${userId}] ERROR CHECKING SERVICE ${name}:`,
        serviceReadErr.body || serviceReadErr
      );

      throw serviceReadErr;
    }

    console.log(
      `[USER ${userId}] CREATING SERVICE ${name}`
    );

    try {

      await k8sApi.createNamespacedService({
        namespace,
        body:
          serviceManifest
      });

      console.log(
        `[USER ${userId}] SERVICE ${name} CREATED`
      );

    } catch (serviceCreateErr) {

      if (serviceCreateErr.code === 409) {

        console.log(
          `[USER ${userId}] SERVICE ${name} was created concurrently`
        );

      } else {

        console.error(
          `[USER ${userId}] FAILED CREATING SERVICE ${name}:`,
          serviceCreateErr.body || serviceCreateErr
        );

        throw serviceCreateErr;
      }
    }
  }

  return {
    name,

    image:
      imageName,

    workspace:
      desiredSubPath,

    node:
      MARKOV_WORKER_NODE,

    port:
      containerPort
  };
}

// ============================================================
// PERSISTENT LIGHTDOCK WORKER
// ============================================================

async function ensureUserLightdockDeployment(userId) {

  const name =
    `lightdock-${userId}`.toLowerCase();

  const namespace =
    NAMESPACE;

  const userString =
    userId.toString();

  const workspace =
    `user-${userString}`;

  const labelSelector =
    getUserWorkerLabels(
      name,
      userId
    );

  const desiredCommand = [
    'python',
    'Run_Markov.py',
    userString
  ];

  console.log(
    `============================================================`
  );

  console.log(
    `[USER ${userId}] ENSURE LIGHTDOCK: ${name}`
  );

  console.log(
    `[USER ${userId}] Image: ${LIGHTDOCK_IMAGE}`
  );

  console.log(
    `[USER ${userId}] Command: python Run_Markov.py ${userString}`
  );

  console.log(
    `[USER ${userId}] Workspace: ${workspace}`
  );

  console.log(
    `[USER ${userId}] Node: ${MARKOV_WORKER_NODE}`
  );

  console.log(
    `============================================================`
  );

  const deploymentManifest = {
    apiVersion:
      'apps/v1',

    kind:
      'Deployment',

    metadata: {
      name,
      namespace,
      labels:
        labelSelector
    },

    spec: {
      replicas:
        1,

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
                'lightdock-worker',

              image:
                LIGHTDOCK_IMAGE,

              command:
                desiredCommand,

              env: [
                {
                  name:
                    'JWT_SECRET',

                  value:
                    process.env.JWT_SECRET
                }
              ],

              resources: {
                limits: {
                  cpu:
                    '4',

                  memory:
                    '12Gi'
                },

                requests: {
                  cpu:
                    '4',

                  memory:
                    '12Gi'
                }
              },

              volumeMounts:
                appName === 'codel'
                  ? getCodelVolumeMounts(userId)
                  : [
                      getUserVolumeMount(userId)
                    ]
            }
          ],

          volumes:
            appName === 'codel'
              ? getCodelVolumes()
              : getUserVolumes()
        }
      }
    }
  };

  try {

    const existingResponse =
      await k8sAppsApi.readNamespacedDeployment({
        name,
        namespace
      });

    const existingDeployment =
      getKubernetesObject(
        existingResponse
      );

    if (!existingDeployment) {
      throw new Error(
        `Kubernetes returned an empty Deployment response for ${name}`
      );
    }

    const existingPodSpec =
      existingDeployment
        ?.spec
        ?.template
        ?.spec;

    const existingContainer =
      existingPodSpec
        ?.containers
        ?.find(
          container =>
            container.name ===
            'lightdock-worker'
        );

    const existingReplicas =
      existingDeployment
        ?.spec
        ?.replicas;

    const existingImage =
      existingContainer
        ?.image;

    const existingCommand =
      existingContainer
        ?.command;

    const existingNodeName =
      existingPodSpec
        ?.nodeName;

    const existingMount =
      existingContainer
        ?.volumeMounts
        ?.find(
          mount =>
            mount.name === 'markov-app'
        );

    const existingSubPath =
      existingMount
        ?.subPath;

    const commandMatches =
      JSON.stringify(
        existingCommand
      ) ===
      JSON.stringify(
        desiredCommand
      );

    const needsCorrection =
      existingReplicas !== 1 ||
      existingImage !== LIGHTDOCK_IMAGE ||
      existingNodeName !== MARKOV_WORKER_NODE ||
      existingSubPath !== workspace ||
      !commandMatches;

    console.log(
      `[USER ${userId}] LightDock exists`
    );

    console.log(
      `[USER ${userId}] replicas=${existingReplicas}`
    );

    console.log(
      `[USER ${userId}] image=${existingImage}`
    );

    console.log(
      `[USER ${userId}] command=${JSON.stringify(existingCommand)}`
    );

    console.log(
      `[USER ${userId}] node=${existingNodeName || '<none>'}`
    );

    console.log(
      `[USER ${userId}] workspace=${existingSubPath || '<none>'}`
    );

    if (needsCorrection) {

      console.log(
        `[USER ${userId}] RECONCILING ${name}`
      );

      existingDeployment.spec.replicas = 1;

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
              'lightdock-worker',

            image:
              LIGHTDOCK_IMAGE,

            command:
              desiredCommand,

            env: [
              {
                name:
                  'JWT_SECRET',

                value:
                  process.env.JWT_SECRET
              }
            ],

            resources: {
              limits: {
                cpu:
                  '4',

                memory:
                  '12Gi'
              },

              requests: {
                cpu:
                  '4',

                memory:
                  '12Gi'
              }
            },

            volumeMounts: [
              getUserVolumeMount(
                userId
              )
            ]
          }
        ];

      existingDeployment
        .spec
        .template
        .spec
        .volumes =
          getUserVolumes();

      existingDeployment
        .metadata
        .labels =
          labelSelector;

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

      await k8sAppsApi.replaceNamespacedDeployment({
        name,
        namespace,
        body:
          existingDeployment
      });

      console.log(
        `[USER ${userId}] ${name} RECONCILED`
      );

    } else {

      console.log(
        `[USER ${userId}] ${name} already correct`
      );
    }

  } catch (err) {

    if (err.code !== 404) {

      console.error(
        `[USER ${userId}] ERROR CHECKING ${name}:`,
        err.body || err
      );

      throw err;
    }

    console.log(
      `[USER ${userId}] ${name} DOES NOT EXIST`
    );

    console.log(
      `[USER ${userId}] CREATING ${name}`
    );

    try {

      await k8sAppsApi.createNamespacedDeployment({
        namespace,
        body:
          deploymentManifest
      });

      console.log(
        `[USER ${userId}] ${name} CREATED`
      );

    } catch (createErr) {

      if (createErr.code === 409) {

        console.log(
          `[USER ${userId}] ${name} was created concurrently`
        );

      } else {

        console.error(
          `[USER ${userId}] FAILED CREATING ${name}:`,
          createErr.body || createErr
        );

        throw createErr;
      }
    }
  }

  console.log(
    `[USER ${userId}] ${name} ENSURED ON ${MARKOV_WORKER_NODE}`
  );

  return {
    name,

    image:
      LIGHTDOCK_IMAGE,

    workspace,

    node:
      MARKOV_WORKER_NODE
  };
}

// ============================================================
// COMPLETE USER ENVIRONMENT PROVISIONING
// ============================================================

async function provisionUserEnvironment(userId) {

  console.log(
    `============================================================`
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
    `============================================================`
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

  const downloadapp =
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

  const viewer =
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

  const codel =
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

  const lightdock =
    await ensureUserLightdockDeployment(
      userId
    );

  console.log(
    `============================================================`
  );

  console.log(
    `[USER ${userId}] COMPLETE USER ENVIRONMENT READY`
  );

  console.log(
    `[USER ${userId}] downloadapp: ${downloadapp.name}`
  );

  console.log(
    `[USER ${userId}] viewer: ${viewer.name}`
  );

  console.log(
    `[USER ${userId}] codel: ${codel.name}`
  );

  console.log(
    `[USER ${userId}] lightdock: ${lightdock.name}`
  );

  console.log(
    `[USER ${userId}] ALL FOUR ASSIGNED TO: ${MARKOV_WORKER_NODE}`
  );

  console.log(
    `============================================================`
  );

  return {
    workspace:
      `user-${userId}`,

    node:
      MARKOV_WORKER_NODE,

    downloadapp:
      downloadapp.name,

    viewer:
      viewer.name,

    codel:
      codel.name,

    lightdock:
      lightdock.name
  };
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

    console.log(
      `============================================================`
    );

    console.log(
      `LOGIN ATTEMPT: ${email}`
    );

    try {

      const result =
        await pool.query(
          'SELECT id, email, password_hash FROM users WHERE email = $1',
          [email]
        );

      if (result.rows.length === 0) {

        console.log(
          `LOGIN FAILED: user not found for ${email}`
        );

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

        console.log(
          `LOGIN FAILED: invalid password for user ${user.id}`
        );

        return res.status(401).json({
          message:
            'Invalid credentials'
        });
      }

      console.log(
        `LOGIN SUCCESSFUL: user ${user.id}`
      );

      const environment =
        await provisionUserEnvironment(
          user.id
        );

      const token =
        jwt.sign(
          {
            id:
              user.id,

            email:
              user.email,

            role:
              'user'
          },

          JWT_SECRET,

          {
            expiresIn:
              '1h'
          }
        );

      res.cookie(
        'token',
        token,
        {
          httpOnly:
            true,

          secure:
            false,

          sameSite:
            'lax',

          path:
            '/',

          maxAge:
            3600000
        }
      );

      console.log(
        `[USER ${user.id}] LOGIN COMPLETE`
      );

      return res.json({

        message:
          'Login successful',

        user: {
          id:
            user.id,

          email:
            user.email
        },

        workspace:
          environment.workspace,

        node:
          environment.node,

        workers: {
          downloadapp:
            environment.downloadapp,

          viewer:
            environment.viewer,

          codel:
            environment.codel,

          lightdock:
            environment.lightdock
        }
      });

    } catch (err) {

      console.error(
        `============================================================`
      );

      console.error(
        `LOGIN / USER ENVIRONMENT PROVISIONING FAILED`
      );

      console.error(
        'Kubernetes status code:',
        err.code || 'unknown'
      );

      console.error(
        'Kubernetes response body:',
        err.body || 'none'
      );

      console.error(
        'Full error:',
        err
      );

      console.error(
        `============================================================`
      );

      return res.status(500).json({
        message:
          'Failed to initialize user environment'
      });
    }
  }
);

// ============================================================
// GLOBAL AUTHENTICATION
// ============================================================

app.use(
  (req, res, next) => {

    if (req.path === '/login') {
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
// USER SIMULATION SIGNAL
// ============================================================

app.post(
  '/html/simulate',
  (req, res) => {

    const userId =
      req.user.id;

    console.log(
      `[USER ${userId}] POST /html/simulate`
    );

    try {

      const {
        inputDir
      } =
        ensureUserDirectories(
          userId
        );

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

      fs.copyFile(
        src,
        dest,
        (err) => {

          if (err) {

            console.error(
              `Failed to copy ping.json for user ${userId}:`,
              err
            );

            return res.status(500).json({
              error:
                'copy failed'
            });
          }

          console.log(
            `Copied ping.json for user ${userId} to ${dest}`
          );

          res.json({

            ok:
              true,

            user_id:
              userId,

            input:
              dest
          });
        }
      );

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
// WRITE USER INPUT
// ============================================================

app.post(
  '/input',
  async (req, res) => {

    const userId =
      req.user.id;

    const {
      filename,
      content
    } = req.body;

    if (
      typeof filename !== 'string' ||
      filename.length === 0
    ) {
      return res.status(400).json({
        error:
          'filename is required'
      });
    }

    if (
      typeof content !== 'string'
    ) {
      return res.status(400).json({
        error:
          'content must be a string'
      });
    }

    const safeFilename =
      path.basename(
        filename
      );

    if (
      safeFilename !== filename ||
      safeFilename === '.' ||
      safeFilename === '..'
    ) {
      return res.status(400).json({
        error:
          'Invalid filename'
      });
    }

    try {

      const {
        inputDir
      } =
        ensureUserDirectories(
          userId
        );

      const filePath =
        path.join(
          inputDir,
          safeFilename
        );

      await fs.promises.writeFile(
        filePath,
        content,
        'utf8'
      );

      console.log(
        `Wrote user input for user ${userId}: ${filePath}`
      );

      return res.json({

        ok:
          true,

        user_id:
          userId,

        filename:
          safeFilename,

        path:
          filePath
      });

    } catch (err) {

      console.error(
        `Failed to write input for user ${userId}:`,
        err
      );

      return res.status(500).json({
        error:
          'Failed to write user input'
      });
    }
  }
);

// ============================================================
// GET USER MESSAGE
// ============================================================

app.get(
  '/html',
  (req, res) => {

    const userId =
      req.user.id;

    console.log(
      `[USER ${userId}] GET /html`
    );

    try {

      const {
        messagePath
      } =
        ensureUserDirectories(
          userId
        );

      if (
        !fs.existsSync(messagePath)
      ) {
        return res.status(404).send(
          'Not found'
        );
      }

      res.setHeader(
        'Content-Type',
        'text/plain'
      );

      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );

      fs.createReadStream(
        messagePath
      ).pipe(res);

    } catch (err) {

      console.error(
        `Failed to read output for user ${userId}:`,
        err
      );

      return res.status(500).json({
        error:
          'Failed to read user output'
      });
    }
  }
);

// ============================================================
// GET USER INPUT FILE
// ============================================================

app.get(
  '/input/:filename',
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
      return res.status(400).json({
        error:
          'Invalid filename'
      });
    }

    try {

      const inputDir =
        getUserInputDir(
          userId
        );

      const filePath =
        path.join(
          inputDir,
          safeFilename
        );

      if (
        !fs.existsSync(filePath)
      ) {
        return res.status(404).send(
          'Not found'
        );
      }

      res.setHeader(
        'Content-Type',
        'text/plain'
      );

      res.setHeader(
        'Cache-Control',
        'no-store'
      );

      fs.createReadStream(
        filePath
      ).pipe(res);

    } catch (err) {

      console.error(
        `Failed to read input for user ${userId}:`,
        err
      );

      return res.status(500).json({
        error:
          'Failed to read user input'
      });
    }
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

        ok:
          true,

        user_id:
          decoded.id
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
// MAIN SIMULATOR ROUTE
// ============================================================

app.post(
  '/html',
  async (req, res) => {

    const userId =
      req.user.id;

    console.log(
      `============================================================`
    );

    console.log(
      `POST /html REACHED`
    );

    console.log(
      `Authenticated user ID: ${userId}`
    );

    console.log(
      `[USER ${userId}] Ensuring complete persistent environment`
    );

    console.log(
      `============================================================`
    );

    try {

      const environment =
        await provisionUserEnvironment(
          userId
        );

      return res.json({

        ok:
          true,

        message:
          'User-specific environment is ready',

        user_id:
          userId,

        workspace:
          environment.workspace,

        node:
          environment.node,

        workers: {

          downloadapp:
            environment.downloadapp,

          viewer:
            environment.viewer,

          codel:
            environment.codel,

          lightdock:
            environment.lightdock
        },

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
        `============================================================`
      );

      console.error(
        `[USER ${userId}] FAILED TO PROVISION USER ENVIRONMENT`
      );

      console.error(
        'Kubernetes status code:',
        err.code || 'unknown'
      );

      console.error(
        'Kubernetes response body:',
        err.body || 'none'
      );

      console.error(
        'Full error:',
        err
      );

      console.error(
        `============================================================`
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
