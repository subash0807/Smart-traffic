const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auditService = require('../services/auditService');

/**
 * Get all users
 * GET /api/users
 */
async function getUsers(req, res, next) {
  try {
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

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
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
      email: email.toLowerCase().trim(),
      passwordHash,
      role: role || 'officer',
      active: active !== undefined ? active : true
    });

    await newUser.save();

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'System Admin',
      action: 'USER_CREATED',
      resourceType: 'User',
      resourceId: newUser._id.toString(),
      newValue: newUser.toSafeObject(),
      ipAddress: req.ip
    });

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
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const previousValue = user.toSafeObject();
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

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'System Admin',
      action: 'USER_UPDATED',
      resourceType: 'User',
      resourceId: user._id.toString(),
      previousValue,
      newValue: user.toSafeObject(),
      ipAddress: req.ip
    });

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
    if (req.user && req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Security protection: You cannot delete your own active administrator account.'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'System Admin',
      action: 'USER_DELETED',
      resourceType: 'User',
      resourceId: req.params.id,
      previousValue: user.toSafeObject(),
      ipAddress: req.ip
    });

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
