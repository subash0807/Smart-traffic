const jwt = require('jsonwebtoken');
const User = require('../models/User');
const db = require('../config/db');
const { mockStore } = require('../services/mockStoreService');

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

    let user = null;

    // Check mock store if ID matches mock or demo prefix
    if (decoded.id && (decoded.id.toString().startsWith('mock_') || decoded.id.toString().startsWith('usr_'))) {
      const mockUser = mockStore.findUserById(decoded.id);
      if (mockUser) {
        user = {
          _id: mockUser.id,
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          active: mockUser.active,
          toSafeObject() {
            return {
              id: this.id,
              name: this.name,
              email: this.email,
              role: this.role,
              active: this.active
            };
          }
        };
      }
    }

    // If not found in mock store and DB is connected, query MongoDB
    if (!user && db.getDbStatus().isConnected) {
      try {
        user = await User.findById(decoded.id).select('-passwordHash');
      } catch {
        user = null;
      }
    }

    // Fallback: If DB disconnected or user not found, reconstruct from token role if valid
    if (!user && decoded.id && decoded.role) {
      const roleNames = {
        admin: 'System Administrator',
        traffic_admin: 'Traffic Administrator',
        officer: 'Traffic Officer'
      };
      user = {
        _id: decoded.id,
        id: decoded.id,
        name: roleNames[decoded.role] || 'STMS Officer',
        email: `${decoded.role}@stms.gov.in`,
        role: decoded.role,
        active: true,
        toSafeObject() {
          return {
            id: this.id,
            name: this.name,
            email: this.email,
            role: this.role,
            active: true
          };
        }
      };
    }

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
      
      let user = null;
      if (decoded.id && (decoded.id.toString().startsWith('mock_') || decoded.id.toString().startsWith('usr_'))) {
        user = mockStore.findUserById(decoded.id);
      } else if (db.getDbStatus().isConnected) {
        try {
          user = await User.findById(decoded.id).select('-passwordHash');
        } catch {}
      }

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
