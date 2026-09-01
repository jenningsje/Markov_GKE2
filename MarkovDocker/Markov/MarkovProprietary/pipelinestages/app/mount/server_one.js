const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('node:child_process');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = 80;
const clients = [];

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'db',
  user: 'postgres',
  database: 'postgres'
});

// =====================
// AUTH MIDDLEWARE
// =====================
function authenticateToken(req, res, next) {
  const token =
    req.cookies.token ||
    (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    console.log("NO TOKEN:", req.cookies, req.headers.authorization);
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("JWT FAIL:", error.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

// =====================
// LOGIN (ONLY PUBLIC ROUTE)
// =====================
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 3600000
    });

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =====================
// GLOBAL PROTECTION
// =====================
app.use((req, res, next) => {
  if (req.path === '/login') return next();
  authenticateToken(req, res, next);
});

// =====================
// K8S CLIENT SETUP
// =====================
const k8s = require('@kubernetes/client-node');
const kc = new k8s.KubeConfig();
kc.loadFromCluster();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
const k8sBatchApi = kc.makeApiClient(k8s.BatchV1Api);

/**
 * Helper to ensure a user-specific deployment and service exist for apps like codel, viewer, downloadapp
 */
async function ensureUserAppDeployment(userId, appName, imageName, containerPort) {
  const name = `${appName}-${userId}`.toLowerCase();
  const namespace = 'default';
  const labelSelector = { app: name, user: userId.toString() };

  try {
    // Check if deployment already exists
    await k8sAppsApi.readNamespacedDeployment({ name, namespace });
  } catch (err) {
    if (err.statusCode === 404) {
      // Create Deployment
      const deploymentManifest = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name, namespace, labels: labelSelector },
        spec: {
          replicas: 1,
          selector: { matchLabels: labelSelector },
          template: {
            metadata: { labels: labelSelector },
            spec: {
              nodeSelector: { workload: 'markov', 'kubernetes.io/arch': 'amd64' },
              containers: [
                {
                  name: appName,
                  image: imageName,
                  ports: [{ containerPort }],
                  volumeMounts: [
                    {
                      name: 'markov-app',
                      mountPath: '/opt/app/MarkovProprietary/pipelinestages/app/mount',
                      subPath: `user-${userId}`
                    }
                  ]
                }
              ],
              volumes: [
                {
                  name: 'markov-app',
                  persistentVolumeClaim: { claimName: 'markov-app' }
                }
              ]
            }
          }
        }
      };

      await k8sAppsApi.createNamespacedDeployment({ namespace, body: deploymentManifest });

      // Create internal ClusterIP Service so Nginx or other pods can talk to it
      const serviceManifest = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name, namespace },
        spec: {
          selector: labelSelector,
          ports: [{ port: containerPort, targetPort: containerPort }]
        }
      };

      await k8sApi.createNamespacedService({ namespace, body: serviceManifest });
    } else {
      throw err;
    }
  }
}

// =====================
// PROTECTED ROUTES
// =====================

app.post('/html/simulate', authenticateToken, (req, res) => {
  const src = path.resolve(__dirname, 'ping.json');
  const dest = path.resolve(__dirname, 'input', 'ping.json');

  fs.copyFile(src, dest, (err) => {
    if (err) {
      return res.status(500).json({ error: 'copy failed' });
    }
    res.json({ ok: true });
  });
});

app.get('/html', authenticateToken, (req, res) => {
  const file = path.resolve(__dirname, 'output', 'message.txt');

  if (!fs.existsSync(file)) {
    return res.status(404).send('Not found');
  }

  res.setHeader('Content-Type', 'text/plain');
  fs.createReadStream(file).pipe(res);
});

app.get('/events', authenticateToken, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(': connected\n\n');
  clients.push(res);

  req.on('close', () => {
    const i = clients.indexOf(res);
    if (i !== -1) clients.splice(i, 1);
  });
});

app.get('/auth/verify', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
});

// Main Simulation Route: Provisions user's persistent app suite & fires the lightdock worker job
app.post('/html', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Provision or verify isolated environments for downloadapp, viewer, and codel for this user
    await ensureUserAppDeployment(userId, 'downloadapp', 'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/downloadapp:40', 3001);
    await ensureUserAppDeployment(userId, 'viewer', 'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/viewer:latest', 8083);
    await ensureUserAppDeployment(userId, 'codel', 'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/codel:22', 8887);

    // 2. Launch the isolated lightdock worker Job execution
    const jobId = `simulation-user-${userId}-${Date.now()}`.toLowerCase();
    const jobManifest = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: { name: jobId, namespace: 'default' },
      spec: {
        backoffLimit: 0,
        template: {
          spec: {
            restartPolicy: 'Never',
            nodeSelector: { workload: 'markov', 'kubernetes.io/arch': 'amd64' },
            containers: [
              {
                name: 'lightdock-worker',
                image: 'us-central1-docker.pkg.dev/project-05da6024-aca6-464e-bd3/markov-repo/lightdock:v41',
                command: ['python', 'Markov.py', userId.toString()],
                env: [
                  {
                    name: 'JWT_SECRET',
                    value: process.env.JWT_SECRET || 'fallback_secret'
                  }
                ],
                resources: {
                  limits: { cpu: '4', memory: '12Gi' },
                  requests: { cpu: '4', memory: '12Gi' }
                },
                volumeMounts: [
                  {
                    name: 'markov-app',
                    mountPath: '/opt/app/MarkovProprietary/pipelinestages/app/mount',
                    subPath: `user-${userId}`
                  }
                ]
              }
            ],
            volumes: [
              {
                name: 'markov-app',
                persistentVolumeClaim: { claimName: 'markov-app' }
              }
            ]
          }
        }
      }
    };

    await k8sBatchApi.createNamespacedJob({ namespace: 'default', body: jobManifest });

    res.json({ 
      ok: true, 
      message: 'User-specific apps and simulation worker scheduled successfully', 
      jobId,
      endpoints: {
        codel: `/codel/`,
        viewer: `/viewer/`,
        download: `/download/`
      }
    });

  } catch (err) {
    console.error('Failed to set up user container environment:', err.body || err);
    res.status(500).json({ error: 'Failed to provision isolated user stack' });
  }
});

// =====================
// START
// =====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});