const jwt = require('jsonwebtoken');
const { User, Clinic } = require('../models');

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findByPk(decoded.userId, {
      include: { model: Clinic, as: 'clinic' }
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token or user inactive.' });
    }

    // Convert to plain object to ensure proper property access
    req.user = user.toJSON();
    console.log('Auth debug - user role:', req.user.role);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. User not authenticated.' });
    }

    if (!roles.includes(req.user.role) && req.user.role !== 'system_admin') {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};

// Permission-based authorization middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. User not authenticated.' });
    }

    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({ error: `Access denied. Required permission: ${permission}` });
    }

    next();
  };
};

// Clinic access middleware (for multi-clinic access)
const requireClinicAccess = async (req, res, next) => {
  try {
    // System admins can access all clinics
    if (req.user.role === 'system_admin') {
      return next();
    }

    const clinicId = req.params.clinicId || req.body.clinicId || req.query.clinicId;
    
    if (!clinicId) {
      return res.status(400).json({ error: 'Clinic ID is required.' });
    }

    // Check if user belongs to the specified clinic
    if (req.user.clinic.id !== clinicId) {
      return res.status(403).json({ error: 'Access denied. User does not belong to this clinic.' });
    }

    next();
  } catch (error) {
    console.error('Clinic access middleware error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Audit logging middleware
const auditLog = (action) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after response is sent
      setImmediate(async () => {
        try {
          const logEntry = {
            user: req.user?.id,
            action: action,
            resource: req.originalUrl,
            method: req.method,
            statusCode: res.statusCode,
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            requestBody: req.method !== 'GET' ? req.body : undefined,
            params: req.params,
            query: req.query
          };

          // Store audit log (you can implement a separate AuditLog model)
          console.log('Audit Log:', JSON.stringify(logEntry, null, 2));
          
          // TODO: Save to database
          // await AuditLog.create(logEntry);
        } catch (error) {
          console.error('Audit logging error:', error);
        }
      });
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Rate limiting middleware for specific actions
const createRateLimit = (windowMs, max, message) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Password strength validation
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long.`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number.');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Session management
const updateLastLogin = async (userId) => {
  try {
    await User.update({ lastLogin: new Date() }, { where: { id: userId } });
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};

// Token generation
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Token refresh
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required.' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret');
    const user = await User.findByPk(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    const newToken = generateToken(user.id);
    
    res.json({
      token: newToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        clinic: user.clinic
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token.' });
  }
};

module.exports = {
  authenticate,
  authorize,
  requirePermission,
  requireClinicAccess,
  auditLog,
  createRateLimit,
  validatePasswordStrength,
  updateLastLogin,
  generateToken,
  refreshToken
};
