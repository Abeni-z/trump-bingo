const jwt = require('jsonwebtoken');

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}

const JWT_SECRET = process.env.JWT_SECRET || 'bingo_app_secret_key_2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'bingo_refresh_secret_key_2024';

// Verify JWT access token
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Generate short-lived access token (1 day)
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

// Generate long-lived refresh token (30 days)
function generateRefreshToken(payload) {
  return jwt.sign(
    { id: payload.id, username: payload.username, role: payload.role },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
}

// Verify refresh token
function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

module.exports = { authMiddleware, generateToken, generateRefreshToken, verifyRefreshToken, JWT_SECRET };
