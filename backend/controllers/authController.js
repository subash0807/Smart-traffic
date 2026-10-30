const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auditService = require('../services/auditService');

function generateToken(userId, role) {
  const secret = process.env.JWT_SECRET || 'stms_super_secure_jwt_secret_key_college_project_2026!';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign({ id: userId, role }, secret, { expiresIn });
}

/**
 * User Login
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const rawBody = req.body || {};
    const email = (rawBody.email || rawBody.username || '').toString().trim();
    const password = (rawBody.password || '').toString();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact an administrator.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    const token = generateToken(user._id, user.role);

    // Audit log
    await auditService.logAction({
      userId: user._id.toString(),
      userName: user.name,
      action: 'USER_LOGIN',
      resourceType: 'User',
      resourceId: user._id.toString(),
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: user.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * User Registration / Sign Up
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password, role = 'officer' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please login instead.'
      });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const allowedRoles = ['admin', 'traffic_admin', 'officer'];
    const assignedRole = allowedRoles.includes(role) ? role : 'officer';

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      active: true
    });

    await user.save();

    const token = generateToken(user._id, user.role);

    await auditService.logAction({
      userId: user._id.toString(),
      userName: user.name,
      action: 'USER_REGISTERED',
      resourceType: 'User',
      resourceId: user._id.toString(),
      newValue: user.toSafeObject(),
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully! Logged in.',
      token,
      user: user.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * User Logout
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    if (req.user) {
      await auditService.logAction({
        userId: req.user._id.toString(),
        userName: req.user.name,
        action: 'USER_LOGOUT',
        resourceType: 'User',
        resourceId: req.user._id.toString(),
        ipAddress: req.ip || '127.0.0.1'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Current User Profile
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.'
      });
    }

    res.status(200).json({
      success: true,
      user: req.user.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  register,
  logout,
  getMe
};

