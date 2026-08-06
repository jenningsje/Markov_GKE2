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
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(
      password,
      user.password_hash
    );

    console.log("LOGIN USER:", user.email);
    console.log("PASSWORD MATCH:", match);

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

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 3600000
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// =====================
// 🔒 GLOBAL PROTECTION (IMPORTANT)
// =====================

// everything below this requires auth unless explicitly public
app.use((req, res, next) => {
  if (req.path === '/login') {
    return next();
  }

  authenticateToken(req, res, next);
});

// =====================
// PROTECTED ROUTES
// =====================

app.post('/html', authenticateToken, (req, res) => {
  const filePath = path.resolve(__dirname, 'input', 'data.json');

  fs.writeFile(filePath, JSON.stringify({ query: req.body.query }), (err) => {
    if (err) {
      return res.status(500).json({ error: 'write failed' });
    }

    const py = spawn('python', [
      path.resolve(__dirname, 'input', 'json_to_names.py')
    ]);

    py.stdout.on('data', (d) => console.log(`py: ${d}`));
    py.stderr.on('data', (d) => console.error(`py err: ${d}`));

    res.json({ ok: true });
  });
});

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

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
});

// =====================
// START
// =====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});