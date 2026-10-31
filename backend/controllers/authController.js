const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auditService = require('../services/auditService');
const db = require('../config/db');
const seedModule = require('../scripts/seed');
const { mockStore } = require('../services/mockStoreService');
const logger = require('../utils/logger');

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
    const email = (rawBody.email || rawBody.username || '').toString().trim().toLowerCase();
    const password = (rawBody.password || '').toString();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const isDbConnected = db.getDbStatus().isConnected;
    let user = null;

    // 1. If real MongoDB is connected, query it
    if (isDbConnected) {
      try {
        user = await User.findOne({ email }).select('+passwordHash');

        // Self-Healing: If user is not found, check if database is empty or unseeded
        if (!user) {
          const totalUsers = await User.countDocuments();
          if (totalUsers === 0) {
            logger.info('Database has 0 users. Performing on-demand auto-seed of demo users...');
            await seedModule.seedAllData();
            user = await User.findOne({ email }).select('+passwordHash');
          }
        }
      } catch (dbErr) {
        logger.warn(`Database query failed during login (${dbErr.message}). Checking mock store...`);
      }
    }

    // 2. Fallback: If DB is not connected or user is not in MongoDB, verify via mock store
    if (!user) {
      const mockUser = mockStore.findUserByEmail(email);
      if (mockUser) {
        // Verify demo preset or mock password
        const isMatch = (password === 'Password123!') || (await bcrypt.compare(password, mockUser.passwordHash));
        if (isMatch) {
          const token = generateToken(mockUser.id, mockUser.role);
          return res.status(200).json({
            success: true,
            message: 'Login successful (Demonstration Mode).',
            token,
            user: {
              id: mockUser.id,
              name: mockUser.name,
              email: mockUser.email,
              role: mockUser.role,
              active: true,
              createdAt: mockUser.createdAt
            }
          });
        } else {
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials. Incorrect password.'
          });
        }
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found. (Use demo: admin@stms.gov.in / Password123!)'
      });
    }

    // 3. User was found in real MongoDB
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

    // Audit log (fail-safe)
    try {
      await auditService.logAction({
        userId: user._id.toString(),
        userName: user.name,
        action: 'USER_LOGIN',
        resourceType: 'User',
        resourceId: user._id.toString(),
        ipAddress: req.ip || '127.0.0.1'
      });
    } catch {
      // Ignore audit failure
    }

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
    const isDbConnected = db.getDbStatus().isConnected;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const allowedRoles = ['admin', 'traffic_admin', 'officer'];
    const assignedRole = allowedRoles.includes(role) ? role : 'officer';

    // Real MongoDB Registration
    if (isDbConnected) {
      try {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'An account with this email address already exists. Please login instead.'
          });
        }

        const user = new User({
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: assignedRole,
          active: true
        });

        await user.save();
        const token = generateToken(user._id, user.role);

        try {
          await auditService.logAction({
            userId: user._id.toString(),
            userName: user.name,
            action: 'USER_REGISTERED',
            resourceType: 'User',
            resourceId: user._id.toString(),
            newValue: user.toSafeObject(),
            ipAddress: req.ip || '127.0.0.1'
          });
        } catch {}

        return res.status(201).json({
          success: true,
          message: 'Account registered successfully! Logged in.',
          token,
          user: user.toSafeObject()
        });
      } catch (dbErr) {
        logger.warn(`Database registration failed (${dbErr.message}), registering to mock store...`);
      }
    }

    // Fallback Mock Store Registration
    const existingMock = mockStore.findUserByEmail(normalizedEmail);
    if (existingMock) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please login instead.'
      });
    }

    const newMockUser = mockStore.addUser({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole
    });

    const token = generateToken(newMockUser.id, newMockUser.role);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully (Demo Mode)! Logged in.',
      token,
      user: {
        id: newMockUser.id,
        name: newMockUser.name,
        email: newMockUser.email,
        role: newMockUser.role,
        active: true,
        createdAt: newMockUser.createdAt
      }
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
    if (req.user && req.user._id) {
      try {
        await auditService.logAction({
          userId: req.user._id.toString(),
          userName: req.user.name,
          action: 'USER_LOGOUT',
          resourceType: 'User',
          resourceId: req.user._id.toString(),
          ipAddress: req.ip || '127.0.0.1'
        });
      } catch {}
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

    const safeUser = typeof req.user.toSafeObject === 'function' ? req.user.toSafeObject() : req.user;

    res.status(200).json({
      success: true,
      user: safeUser
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
