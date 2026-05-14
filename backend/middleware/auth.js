// ============================================================
// middleware/auth.js — JWT verification middleware
// ============================================================

const jwt = require('jsonwebtoken');

// Verifies the JWT token sent in the Authorization header
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  // Header format: "Bearer <token>"
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // Attach decoded payload { id, role } to the request
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
}

// Only lets admin users proceed
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

module.exports = { verifyToken, adminOnly };
