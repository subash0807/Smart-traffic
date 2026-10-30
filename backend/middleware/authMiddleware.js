const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware verifying JWT tokens from Authorization header.
 */
async function authenticate(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    const secret = process.env.JWT_SECRET || 'stms_super_secure_jwt_secret_key_college_project_2026!';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. User no longer exists.'
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact system administrator.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
      error: err.message
    });
  }
}

/**
 * Optional authentication: attaches user if token is valid, but allows unauthenticated pass-through.
 */
async function optionalAuth(req, res, next) {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const secret = process.env.JWT_SECRET || 'stms_super_secure_jwt_secret_key_college_project_2026!';
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (user && user.active) {
        req.user = user;
      }
    }
  } catch {
    // Ignore error for optional auth
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuth
};
