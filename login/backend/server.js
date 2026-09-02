const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();

const PORT = 1114;

// Middleware setup
app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true
}));

const db = new Pool({
  user: 'postgres',
  host: 'db',
  database: 'postgres',
  password: 'postgres',
  port: 5432,
});

// Secret key (use environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET;

// Authentication middleware
function authenticateToken(req, res, next) {
  // Check for token in cookies or Authorization header
  const token = req.cookies.token || 
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
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);

    console.log("BODY:", req.body);
    console.log("USER:", user);
    console.log("MATCH:", match);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user'
    };

    const token = jwt.sign(userPayload, JWT_SECRET, {
      expiresIn: '1h'
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600000
    });

    // Tell the simulator service to create the user's nginx directory
    // and copy the default html contents into it.
    try {
      const appsResponse = await fetch('http://simulator:4001/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id
        })
      });

      if (!appsResponse.ok) {
        const errorText = await appsResponse.text();

        console.error(
          `Failed to initialize user directory for ${user.id}:`,
          appsResponse.status,
          errorText
        );

        return res.status(500).json({
          error: 'Login succeeded, but user workspace could not be initialized'
        });
      }

      console.log(`Initialized nginx workspace for user ${user.id}`);

    } catch (appsError) {
      console.error(
        `Could not contact apps service for user ${user.id}:`,
        appsError
      );

      return res.status(500).json({
        error: 'Login succeeded, but user workspace could not be initialized'
      });
    }

    return res.json({
      success: true
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: 'Server error'
    });
  }
});

app.get('/auth/verify', (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.sendStatus(401);
    }

    try {
        jwt.verify(token, JWT_SECRET);
        return res.sendStatus(200);
    } catch (err) {
        return res.sendStatus(403);
    }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
});