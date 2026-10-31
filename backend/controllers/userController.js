const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auditService = require('../services/auditService');
const db = require('../config/db');
const { mockStore } = require('../services/mockStoreService');

/**
 * Get all users
 * GET /api/users
 */
async function getUsers(req, res, next) {
  try {
    if (!db.getDbStatus().isConnected) {
      const safeUsers = mockStore.users.map(u => ({
        _id: u.id,
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        createdAt: u.createdAt
      }));
      return res.status(200).json({
        success: true,
        data: safeUsers
      });
    }

    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new user (Admin only)
 * POST /api/users
 */
async function createUser(req, res, next) {
  try {
    const { name, email, password, role, active } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!db.getDbStatus().isConnected) {
      const existing = mockStore.findUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(409).json({ success: false, message: 'A user with this email address already exists.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const newUser = mockStore.addUser({
        name,
        email: normalizedEmail,
        passwordHash,
        role: role || 'officer',
        active: active !== undefined ? active : true
      });

      return res.status(201).json({
        success: true,
        message: 'User created successfully (Demo Mode).',
        data: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          active: newUser.active
        }
      });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email: normalizedEmail,
      passwordHash,
      role: role || 'officer',
      active: active !== undefined ? active : true
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: newUser.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update user details/role/status (Admin only)
 * PUT /api/users/:id
 */
async function updateUser(req, res, next) {
  try {
    if (!db.getDbStatus().isConnected) {
      const user = mockStore.findUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      const { name, role, active } = req.body;
      if (name) user.name = name;
      if (role) user.role = role;
      if (active !== undefined) user.active = active;
      return res.status(200).json({
        success: true,
        message: 'User updated successfully (Demo Mode).',
        data: user
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { name, email, role, active, password } = req.body;

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase().trim();
    if (role && ['admin', 'traffic_admin', 'officer'].includes(role)) {
      user.role = role;
    }
    if (active !== undefined) user.active = active;

    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: user.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete or deactivate user (Admin only)
 * DELETE /api/users/:id
 */
async function deleteUser(req, res, next) {
  try {
    if (req.user && req.user._id && req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Security protection: You cannot delete your own active administrator account.'
      });
    }

    if (!db.getDbStatus().isConnected) {
      const idx = mockStore.users.findIndex(u => u.id === req.params.id || u._id === req.params.id);
      if (idx >= 0) {
        mockStore.users.splice(idx, 1);
      }
      return res.status(200).json({
        success: true,
        message: 'User removed successfully (Demo Mode).'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
