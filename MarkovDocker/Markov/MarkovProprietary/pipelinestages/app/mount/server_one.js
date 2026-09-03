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

const LIGHTDOCK_IMAGE =
  'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/lightdock:v64';

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

  console.log(
    `Copying template INPUT contents for user ${userId}`
  );

  await fs.promises.mkdir(
    userInputDir,
    {
      recursive: true
    }
  );

  await copyDirectoryContents(
    templateInputDir,
    userInputDir
  );

  console.log(
    `Copying template OUTPUT contents for user ${userId}`
  );

  await fs.promises.mkdir(
    userOutputDir,
    {
      recursive: true
    }
  );

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
// USER APP DEPLOYMENTS
// ============================================================

async function ensureUserAppDeployment(
  userId,
  appName,
  imageName,
  containerPort
) {
  const name =
    `${appName}-${userId}`.toLowerCase();

  const namespace =
    NAMESPACE;

  const labelSelector = {
    app: name,
    user: userId.toString()
  };

  console.log(
    `[USER ${userId}] Checking deployment ${name}`
  );

  try {
    await k8sAppsApi.readNamespacedDeployment({
      name,
      namespace
    });

    console.log(
      `[USER ${userId}] Deployment ${name} already exists`
    );

  } catch (err) {

    if (err.statusCode === 404) {

      console.log(
        `[USER ${userId}] Creating deployment ${name} using image ${imageName}`
      );

      const deploymentManifest = {
        apiVersion: 'apps/v1',

        kind: 'Deployment',

        metadata: {
          name,
          namespace,
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
              nodeSelector: {
                workload: 'markov',
                'kubernetes.io/arch': 'amd64'
              },

              containers: [
                {
                  name: appName,

                  image: imageName,

                  ports: [
                    {
                      containerPort
                    }
                  ],

                  volumeMounts: [
                    {
                      name: 'markov-app',

                      mountPath:
                        '/opt/app/MarkovProprietary/pipelinestages/app/mount',

                      subPath:
                        `user-${userId}`
                    }
                  ]
                }
              ],

              volumes: [
                {
                  name: 'markov-app',

                  persistentVolumeClaim: {
                    claimName: 'markov-app'
                  }
                }
              ]
            }
          }
        }
      };

      await k8sAppsApi.createNamespacedDeployment({
        namespace,
        body: deploymentManifest
      });

      console.log(
        `[USER ${userId}] Deployment ${name} created`
      );

      const serviceManifest = {
        apiVersion: 'v1',

        kind: 'Service',

        metadata: {
          name,
          namespace
        },

        spec: {
          selector: labelSelector,

          ports: [
            {
              port: containerPort,
              targetPort: containerPort
            }
          ]
        }
      };

      try {
        await k8sApi.createNamespacedService({
          namespace,
          body: serviceManifest
        });

        console.log(
          `[USER ${userId}] Service ${name} created`
        );

      } catch (serviceErr) {

        if (serviceErr.statusCode === 409) {

          console.log(
            `[USER ${userId}] Service ${name} already exists`
          );

        } else {
          throw serviceErr;
        }
      }

    } else {

      console.error(
        `[USER ${userId}] Failed checking deployment ${name}:`,
        err.body || err
      );

      throw err;
    }
  }
}

// ============================================================
// PERSISTENT LIGHTDOCK WORKER
// ============================================================

async function ensureUserLightdockDeployment(userId) {
  const name =
    `lightdock-${userId}`.toLowerCase();

  const namespace =
    NAMESPACE;

  const labelSelector = {
    app: name,
    user: userId.toString()
  };

  console.log(
    `============================================================`
  );

  console.log(
    `[USER ${userId}] Checking persistent LightDock worker`
  );

  console.log(
    `[USER ${userId}] LightDock deployment: ${name}`
  );

  console.log(
    `[USER ${userId}] LightDock image: ${LIGHTDOCK_IMAGE}`
  );

  console.log(
    `[USER ${userId}] LightDock workspace: user-${userId}`
  );

  console.log(
    `============================================================`
  );

  const deploymentManifest = {
    apiVersion: 'apps/v1',

    kind: 'Deployment',

    metadata: {
      name,
      namespace,
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
          nodeSelector: {
            workload: 'markov',
            'kubernetes.io/arch': 'amd64'
          },

          containers: [
            {
              name: 'lightdock-worker',

              image: LIGHTDOCK_IMAGE,

              command: [
                'python',
                'Run_Markov.py',
                userId.toString()
              ],

              env: [
                {
                  name: 'JWT_SECRET',

                  value:
                    process.env.JWT_SECRET
                }
              ],

              resources: {
                limits: {
                  cpu: '4',
                  memory: '12Gi'
                },

                requests: {
                  cpu: '4',
                  memory: '12Gi'
                }
              },

              volumeMounts: [
                {
                  name: 'markov-app',

                  mountPath:
                    '/opt/app/MarkovProprietary/pipelinestages/app/mount',

                  subPath:
                    `user-${userId}`
                }
              ]
            }
          ],

          volumes: [
            {
              name: 'markov-app',

              persistentVolumeClaim: {
                claimName: 'markov-app'
              }
            }
          ]
        }
      }
    }
  };

  try {

    const existing =
      await k8sAppsApi.readNamespacedDeployment({
        name,
        namespace
      });

    console.log(
      `[USER ${userId}] Persistent LightDock deployment already exists`
    );

    const existingReplicas =
      existing.body?.spec?.replicas;

    const existingImage =
      existing.body?.spec?.template?.spec?.containers?.find(
        container =>
          container.name === 'lightdock-worker'
      )?.image;

    console.log(
      `[USER ${userId}] Existing LightDock replicas: ${existingReplicas}`
    );

    console.log(
      `[USER ${userId}] Existing LightDock image: ${existingImage}`
    );

    // Make sure there is ALWAYS exactly one worker.
    // If the deployment somehow has zero replicas, restore it.
    if (
      existingReplicas !== 1 ||
      existingImage !== LIGHTDOCK_IMAGE
    ) {

      console.log(
        `[USER ${userId}] Correcting persistent LightDock deployment`
      );

      const updatedDeployment =
        existing.body;

      updatedDeployment.spec.replicas = 1;

      updatedDeployment.spec.template.spec.containers =
        deploymentManifest.spec.template.spec.containers;

      updatedDeployment.spec.template.spec.nodeSelector =
        deploymentManifest.spec.template.spec.nodeSelector;

      updatedDeployment.spec.template.spec.volumes =
        deploymentManifest.spec.template.spec.volumes;

      await k8sAppsApi.replaceNamespacedDeployment({
        name,
        namespace,
        body: updatedDeployment
      });

      console.log(
        `[USER ${userId}] Persistent LightDock deployment corrected`
      );

    } else {

      console.log(
        `[USER ${userId}] Persistent LightDock worker is already configured correctly`
      );
    }

  } catch (err) {

    if (err.statusCode === 404) {

      console.log(
        `[USER ${userId}] Persistent LightDock worker does not exist`
      );

      console.log(
        `[USER ${userId}] Creating LightDock Deployment ${name}`
      );

      try {

        await k8sAppsApi.createNamespacedDeployment({
          namespace,
          body: deploymentManifest
        });

        console.log(
          `[USER ${userId}] Persistent LightDock worker CREATED`
        );

      } catch (createErr) {

        // Another simultaneous login may have created it
        // between our read and create.
        if (createErr.statusCode === 409) {

          console.log(
            `[USER ${userId}] LightDock deployment was created by another request; using existing deployment`
          );

        } else {

          console.error(
            `[USER ${userId}] Failed creating persistent LightDock worker:`,
            createErr.body || createErr
          );

          throw createErr;
        }
      }

    } else {

      console.error(
        `[USER ${userId}] Failed checking persistent LightDock worker:`,
        err.body || err
      );

      throw err;
    }
  }

  console.log(
    `[USER ${userId}] Persistent LightDock worker ENSURED`
  );

  return {
    name,
    image: LIGHTDOCK_IMAGE,
    workspace: `user-${userId}`
  };
}

// ============================================================
// COMPLETE USER ENVIRONMENT PROVISIONING
// ============================================================

async function provisionUserEnvironment(userId) {

  console.log(
    '============================================================'
  );

  console.log(
    `[USER ${userId}] STARTING USER ENVIRONMENT PROVISIONING`
  );

  console.log(
    '============================================================'
  );

  // ----------------------------------------------------------
  // STEP 1: Workspace
  // ----------------------------------------------------------

  console.log(
    `[USER ${userId}] STEP 1: Creating isolated workspace`
  );

  await ensureUserWorkspace(
    userId
  );

  console.log(
    `[USER ${userId}] STEP 1 COMPLETE`
  );

  // ----------------------------------------------------------
  // STEP 2: Download application
  // ----------------------------------------------------------

  console.log(
    `[USER ${userId}] STEP 2: Ensuring downloadapp`
  );

  await ensureUserAppDeployment(
    userId,
    'downloadapp',
    'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/downloadapp:40',
    3001
  );

  console.log(
    `[USER ${userId}] STEP 2 COMPLETE`
  );

  // ----------------------------------------------------------
  // STEP 3: Viewer
  // ----------------------------------------------------------

  console.log(
    `[USER ${userId}] STEP 3: Ensuring viewer`
  );

  await ensureUserAppDeployment(
    userId,
    'viewer',
    'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/viewer:latest',
    8083
  );

  console.log(
    `[USER ${userId}] STEP 3 COMPLETE`
  );

  // ----------------------------------------------------------
  // STEP 4: Codel
  // ----------------------------------------------------------

  console.log(
    `[USER ${userId}] STEP 4: Ensuring codel`
  );

  await ensureUserAppDeployment(
    userId,
    'codel',
    'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/codel:22',
    8887
  );

  console.log(
    `[USER ${userId}] STEP 4 COMPLETE`
  );

  // ----------------------------------------------------------
  // STEP 5: Persistent LightDock worker
  // ----------------------------------------------------------

  console.log(
    `[USER ${userId}] STEP 5: Ensuring ONE persistent LightDock worker`
  );

  const lightdock =
    await ensureUserLightdockDeployment(
      userId
    );

  console.log(
    `[USER ${userId}] STEP 5 COMPLETE: LightDock worker ensured`
  );

  console.log(
    `[USER ${userId}] LightDock deployment: ${lightdock.name}`
  );

  console.log(
    `[USER ${userId}] LightDock workspace: ${lightdock.workspace}`
  );

  console.log(
    '============================================================'
  );

  console.log(
    `[USER ${userId}] USER ENVIRONMENT PROVISIONING COMPLETE`
  );

  console.log(
    '============================================================'
  );

  return {
    workspace:
      `user-${userId}`,

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
      '============================================================'
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
          message: 'Invalid credentials'
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
          message: 'Invalid credentials'
        });
      }

      console.log(
        `LOGIN SUCCESSFUL: user ${user.id}`
      );

      // --------------------------------------------------------
      // IMPORTANT:
      // Provision the user's persistent environment immediately
      // after successful authentication.
      // --------------------------------------------------------

      console.log(
        `[USER ${user.id}] Provisioning persistent environment during login`
      );

      const environment =
        await provisionUserEnvironment(
          user.id
        );

      console.log(
        `[USER ${user.id}] Persistent environment ready`
      );

      // --------------------------------------------------------
      // Create JWT
      // --------------------------------------------------------

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
          path: '/',
          maxAge: 3600000
        }
      );

      console.log(
        `[USER ${user.id}] LOGIN COMPLETE`
      );

      console.log(
        '============================================================'
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

        lightdock:
          environment.lightdock
      });

    } catch (err) {

      console.error(
        '============================================================'
      );

      console.error(
        'LOGIN / USER ENVIRONMENT PROVISIONING FAILED'
      );

      console.error(
        'Kubernetes status code:',
        err.statusCode || 'unknown'
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
        '============================================================'
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
//
// IMPORTANT:
// This route NO LONGER CREATES A LIGHTDOCK JOB.
//
// The persistent LightDock worker is created during LOGIN.
// This route only makes sure the user's environment exists.
// ============================================================

app.post(
  '/html',
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
      'Authenticated user ID:',
      userId
    );

    console.log(
      `[USER ${userId}] Ensuring existing persistent user environment`
    );

    console.log(
      '============================================================'
    );

    try {

      const environment =
        await provisionUserEnvironment(
          userId
        );

      console.log(
        `[USER ${userId}] Persistent user environment verified`
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

        lightdock:
          environment.lightdock,

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
        `[USER ${userId}] FAILED TO VERIFY USER ENVIRONMENT`
      );

      console.error(
        'Kubernetes status code:',
        err.statusCode || 'unknown'
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