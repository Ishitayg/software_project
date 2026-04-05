const { sequelize, DataTypes } = require('../config/database_pg');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('front_desk', 'doctor', 'nurse', 'billing', 'insurance', 'management', 'system_admin'),
    allowNull: false,
    defaultValue: 'front_desk'
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'last_name'
  },
  phone: {
    type: DataTypes.STRING(20),
    field: 'phone'
  },
  avatar: {
    type: DataTypes.STRING(255)
  },
  licenseNumber: {
    type: DataTypes.STRING(50),
    field: 'license_number'
  },
  specialization: {
    type: DataTypes.STRING(100)
  },
  clinicId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'clinic_id',
    references: {
      model: 'clinics',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  lastLogin: {
    type: DataTypes.DATE,
    field: 'last_login'
  },
  permissions: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.getDisplayName = function() {
  return `${this.firstName} ${this.lastName}`;
};

User.prototype.hasPermission = function(permission) {
  const rolePermissions = {
    front_desk: ['appointments.create', 'appointments.read', 'appointments.update', 'patients.create', 'patients.read'],
    doctor: ['appointments.read', 'patients.read', 'patients.update', 'clinical.create', 'clinical.read'],
    nurse: ['appointments.read', 'patients.read', 'patients.update', 'vitals.create', 'vitals.read'],
    billing: ['billing.create', 'billing.read', 'billing.update', 'patients.read'],
    insurance: ['insurance.create', 'insurance.read', 'insurance.update', 'patients.read'],
    management: ['appointments.read', 'patients.read', 'billing.read', 'insurance.read', 'reports.read'],
    system_admin: ['*']
  };
  
  const userPermissions = rolePermissions[this.role] || [];
  return userPermissions.includes('*') || userPermissions.includes(permission) || (this.permissions || []).includes(permission);
};

// Class methods
User.findByCredentials = async function(username, password) {
  const user = await this.findOne({
    where: {
      [sequelize.Sequelize.Op.or]: [
        { username },
        { email: username }
      ],
      isActive: true
    }
  });
  
  if (!user) return null;
  
  const isMatch = await user.comparePassword(password);
  return isMatch ? user : null;
};

module.exports = User;
