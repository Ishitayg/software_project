const { sequelize, DataTypes } = require('../config/database_pg');

const Clinic = sequelize.define('Clinic', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100)
  },
  website: {
    type: DataTypes.STRING(255)
  },
  addressStreet: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'address_street'
  },
  addressCity: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'address_city'
  },
  addressState: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'address_state'
  },
  addressPostalCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'address_postal_code'
  },
  addressCountry: {
    type: DataTypes.STRING(50),
    defaultValue: 'India',
    field: 'address_country'
  },
  latitude: {
    type: DataTypes.FLOAT,
    field: 'latitude'
  },
  longitude: {
    type: DataTypes.FLOAT,
    field: 'longitude'
  },
  operatingHours: {
    type: DataTypes.JSONB,
    defaultValue: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '14:00', closed: false },
      sunday: { open: '00:00', close: '00:00', closed: true }
    },
    field: 'operating_hours'
  },
  services: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  departments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  facilities: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      appointmentAdvanceBookingDays: 30,
      appointmentCancellationHours: 24,
      parallelConsultations: 1,
      currency: 'INR',
      timezone: 'Asia/Kolkata'
    }
  },
  statistics: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalPatients: 0,
      totalAppointments: 0,
      totalRevenue: 0,
      activeDoctors: 0,
      averageDailyPatients: 0
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'clinics',
  timestamps: true,
  underscored: true,
  freezeTableName: true
});

// Instance methods
Clinic.prototype.isOpen = function(dateTime = new Date()) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dateTime.getDay()];
  const daySchedule = this.operatingHours[dayName];
  
  if (!daySchedule || daySchedule.closed) return false;
  
  const currentTime = dateTime.toTimeString().slice(0, 5);
  return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
};

// Static methods
Clinic.getByCity = async function(city) {
  return this.findAll({
    where: {
      addressCity: city,
      isActive: true
    }
  });
};

module.exports = Clinic;
