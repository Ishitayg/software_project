const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { 
  authenticate, 
  authorize, 
  generateToken, 
  updateLastLogin, 
  validatePasswordStrength,
  auditLog,
  createRateLimit
} = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth endpoints
const loginRateLimit = createRateLimit(15 * 60 * 1000, 5, 'Too many login attempts. Please try again later.');
const registerRateLimit = createRateLimit(60 * 60 * 1000, 3, 'Too many registration attempts. Please try again later.');

// Register a new user
router.post('/register', registerRateLimit, [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').isIn(['front_desk', 'doctor', 'nurse', 'billing', 'insurance', 'management', 'system_admin']).withMessage('Invalid role'),
  body('profile.firstName').trim().notEmpty().withMessage('First name is required'),
  body('profile.lastName').trim().notEmpty().withMessage('Last name is required'),
  body('clinic').isUUID().withMessage('Valid clinic ID is required')
], auditLog('user_register'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, role, profile, clinic } = req.body;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ errors: passwordValidation.errors });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [User.sequelize?.Sequelize?.Op?.or || require('sequelize').Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      role,
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      phone: profile?.phone,
      specialization: profile?.specialization,
      clinicId: clinic
    });

    // Generate token
    const token = generateToken(user.id);
    await User.update({ lastLogin: new Date() }, { where: { id: user.id } });

    res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        clinicId: user.clinicId
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login user
router.post('/login', loginRateLimit, [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], auditLog('user_login'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Find user by username or email
    const { Op } = require('sequelize');
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email: username }
        ],
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Generate token
    const token = generateToken(user.id);
    await User.update({ lastLogin: new Date() }, { where: { id: user.id } });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        clinicId: user.clinicId,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Get current user profile
router.get('/profile', authenticate, auditLog('profile_view'), async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// Update user profile
router.put('/profile', authenticate, [
  body('profile.firstName').trim().notEmpty().withMessage('First name is required'),
  body('profile.lastName').trim().notEmpty().withMessage('Last name is required'),
  body('profile.phone').optional().trim().isMobilePhone().withMessage('Invalid phone number'),
  body('profile.email').optional().isEmail().normalizeEmail().withMessage('Invalid email')
], auditLog('profile_update'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, phone } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Update profile fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    await user.save();

    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        clinicId: user.clinicId
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Change password
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], auditLog('password_change'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ errors: passwordValidation.errors });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', authenticate, auditLog('user_logout'), (req, res) => {
  res.json({ message: 'Logout successful.' });
});

// Verify token
router.get('/verify', authenticate, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      phone: req.user.phone,
      clinicId: req.user.clinicId,
      permissions: req.user.permissions
    }
  });
});

// Get all users (management/admin only)
router.get('/users', authenticate, authorize('front_desk', 'doctor', 'management', 'system_admin'), auditLog('users_list'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, clinic, isActive } = req.query;
    const where = {};
    const offset = (page - 1) * limit;

    if (role) where.role = role;
    if (clinic) where.clinicId = clinic;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(count / limit),
        total: count
      }
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Update user status (admin only)
router.put('/users/:userId/status', authenticate, authorize('system_admin'), [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
], auditLog('user_status_update'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully.`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        clinicId: user.clinicId,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('User status update error:', error);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

module.exports = router;
