const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

const PORT = 1114;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cookieParser());
app.use(express.json());

app.use(cors({
  origin: true,
  credentials: true
}));

// ============================================================
// DATABASE
// ============================================================

const db = new Pool({
  user: 'postgres',
  host: 'db',
  database: 'postgres',
  password: 'postgres',
  port: 5432,
});

// ============================================================
// JWT SECRET
// ============================================================

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not set');
}

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

function authenticateToken(req, res, next) {

  const token =
    req.cookies.token ||
    (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null
    );

  if (!token) {
    return res.status(401).json({
      success: false,
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

    console.error(
      'JWT verification failed:',
      error.message
    );

    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}

// ============================================================
// ROLE CHECKER
// ============================================================

function checkRole(roles) {

  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions'
    });
  };
}

// ============================================================
// LOGIN
// ============================================================

app.post('/login', async (req, res) => {

  console.log(
    '============================================================'
  );

  console.log(
    'POST /login REACHED'
  );

  console.log(
    '============================================================'
  );

  const { email, password } = req.body;

  console.log(
    'Login email:',
    email
  );

  // ==========================================================
  // VALIDATE REQUEST
  // ==========================================================

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {

    console.log(
      'LOGIN FAILED: missing email or password'
    );

    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  try {

    // ========================================================
    // 1. LOOK UP USER
    // ========================================================

    console.log(
      `Looking up user: ${email.trim()}`
    );

    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email.trim()]
    );

    const user = result.rows[0];

    if (!user) {

      console.log(
        'LOGIN FAILED: user not found'
      );

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    console.log(
      `User found: ${user.id}`
    );

    // ========================================================
    // 2. CHECK PASSWORD
    // ========================================================

    const match = await bcrypt.compare(
      password,
      user.password_hash
    );

    console.log(
      'Password match:',
      match
    );

    if (!match) {

      console.log(
        'LOGIN FAILED: invalid password'
      );

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // ========================================================
    // 3. CREATE JWT
    // ========================================================

    const userPayload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user'
    };

    const token = jwt.sign(
      userPayload,
      JWT_SECRET,
      {
        expiresIn: '1h'
      }
    );

    console.log(
      `JWT created successfully for user ${user.id}`
    );

    // ========================================================
    // 4. SET AUTH COOKIE
    // ========================================================

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600000
    });

    console.log(
      `Authentication cookie set for user ${user.id}`
    );

    // ========================================================
    // 5. INITIALIZE USER-SPECIFIC NODEAPP ENVIRONMENT
    // ========================================================

    console.log(
      '============================================================'
    );

    console.log(
      `Provisioning nodeapp environment for user ${user.id}`
    );

    console.log(
      'POST http://nodeapp:5001/html'
    );

    let nodeResponse;

    try {

      nodeResponse = await fetch(
        'http://nodeapp:5001/html',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },

          body: JSON.stringify({
            query: 'login_init'
          })
        }
      );

    } catch (fetchError) {

      console.error(
        `Could not contact nodeapp for user ${user.id}:`,
        fetchError
      );

      return res.status(500).json({
        success: false,
        error:
          'Login succeeded, but user environment could not be initialized'
      });
    }

    // ========================================================
    // 6. READ NODEAPP RESPONSE AS TEXT
    // ========================================================

    const nodeResponseText =
      await nodeResponse.text();

    console.log(
      `nodeapp HTTP status: ${nodeResponse.status}`
    );

    console.log(
      `nodeapp response body: ${nodeResponseText}`
    );

    // ========================================================
    // 7. CHECK NODEAPP HTTP STATUS
    // ========================================================

    if (!nodeResponse.ok) {

      console.error(
        `Failed to provision user environment for ${user.id}`
      );

      return res.status(500).json({
        success: false,
        error:
          'Login succeeded, but user environment could not be initialized',
        nodeapp_status: nodeResponse.status,
        nodeapp_response: nodeResponseText
      });
    }

    // ========================================================
    // 8. PARSE NODEAPP JSON
    // ========================================================

    let nodeEnvironment;

    try {

      nodeEnvironment =
        JSON.parse(nodeResponseText);

    } catch (parseError) {

      console.error(
        '============================================================'
      );

      console.error(
        'NODEAPP RETURNED NON-JSON RESPONSE'
      );

      console.error(
        'nodeapp response:',
        nodeResponseText
      );

      console.error(
        'JSON parse error:',
        parseError.message
      );

      console.error(
        '============================================================'
      );

      return res.status(500).json({
        success: false,
        error:
          'Login succeeded, but nodeapp returned an invalid response'
      });
    }

    console.log(
      `User environment initialized for user ${user.id}:`,
      nodeEnvironment
    );

    // ========================================================
    // 9. LOGIN SUCCESS
    // ========================================================

    console.log(
      '============================================================'
    );

    console.log(
      `LOGIN SUCCESSFUL FOR USER ${user.id}`
    );

    console.log(
      '============================================================'
    );

    return res.status(200).json({
      success: true,
      user_id: user.id
    });

  } catch (err) {

    console.error(
      '============================================================'
    );

    console.error(
      'LOGIN SERVER ERROR'
    );

    console.error(err);

    console.error(
      '============================================================'
    );

    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// ============================================================
// AUTH VERIFY
// ============================================================

app.get('/auth/verify', (req, res) => {

  const token = req.cookies.token;

  if (!token) {

    return res.status(401).json({
      success: false,
      message: 'No token'
    });
  }

  try {

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    res.setHeader(
      'X-User-ID',
      String(decoded.id)
    );

    return res.status(200).json({
      ok: true,
      user_id: decoded.id
    });

  } catch (err) {

    console.error(
      'Auth verification failed:',
      err.message
    );

    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// ============================================================
// SERVER
// ============================================================

app.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `Server running on 0.0.0.0:${PORT}`
    );
  }
);