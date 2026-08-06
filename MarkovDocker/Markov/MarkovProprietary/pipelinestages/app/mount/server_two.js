const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 80;

// Middleware setup
app.use(express.json());
app.use(cookieParser());

// Secret key (use environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET;

// Authentication middleware
function authenticateToken(req, res, next) {
  const token =
    req.cookies.token ||
    (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

// Role checker middleware
function checkRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ message: 'Insufficient permissions' });
  };
}

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  let user;
  if (username === 'drcd@wellspringcv.com' && password === 'JsgsfgllwxoIOBOI309%#$') {
    user = { id: 1, username: 'user', role: 'user' };
  } else {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });

  res.cookie('token', token, {
    httpOnly: true,
    secure: false,        // keep false unless HTTPS
    sameSite: 'lax',      // or 'none' if cross-site
    path: '/',
    maxAge: 3600000
  });

  res.json({
    message: 'Login successful',
    token,
    user: { id: user.id, username: user.username, role: user.role }
  });
});


// ================================
// 🔐 PROTECTED OUTPUT SECTION (FIXED)
// ================================

// Protect EVERYTHING under /output first
app.use('/output', authenticateToken);

// Then serve static files ONLY if authenticated
app.use(
  '/output',
  express.static(
    path.resolve('/opt/app/MarkovProprietary/pipelinestages/app/mount/output')
  )
);


// Optional explicit HTML route (still protected)
app.get('/output', authenticateToken, (req, res) => {
  const html_path = path.resolve(
    '/opt/app/MarkovProprietary/pipelinestages/app/mount/output',
    'index.html'
  );

  if (!fs.existsSync(html_path)) {
    return res.status(404).send('HTML file not found.');
  }

  res.sendFile(html_path);
});


// API to check file
app.get('/check-file', authenticateToken, (req, res) => {
  const pdb_path = path.resolve(
    '/opt/app/MarkovProprietary/pipelinestages/app/mount/output',
    'lightdock_0.pdb'
  );

  return res.json({ exists: fs.existsSync(pdb_path) });
});


// Download API (already protected correctly)
app.get(['/download', '/download/'], authenticateToken, (req, res) => {
  const pdb_path = path.resolve(
    '/opt/app/MarkovProprietary/pipelinestages/app/mount/output',
    'lightdock_0.pdb'
  );

  if (!fs.existsSync(pdb_path)) {
    return res.status(404).send('File not found.');
  }

  res.setHeader('Content-Type', 'chemical/x-pdb');
  res.setHeader('Content-Disposition', 'attachment; filename="lightdock_0.pdb"');

  const fileStream = fs.createReadStream(pdb_path);
  fileStream.pipe(res);

  fileStream.on('close', () => {
    fs.unlink(pdb_path, (err) => {
      if (err) console.error(err);
    });
  });
});


// Error handler for logo
app.use((req, res, next) => {
  if (req.url.includes('logo.png')) {
    const logoPath = path.resolve(
      '/opt/app/MarkovProprietary/pipelinestages/app/mount/output',
      'logo.png'
    );

    if (!fs.existsSync(logoPath)) {
      return res.status(404).send('logo.png not found');
    }
  }
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP server running on port ${PORT}`);
});