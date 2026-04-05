const { sequelize, DataTypes } = require('../config/database_pg');

const Patient = sequelize.define('Patient', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.STRING(20),
    unique: true,
    field: 'patient_id'
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
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'date_of_birth'
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100)
  },
  addressStreet: {
    type: DataTypes.STRING(255),
    field: 'address_street'
  },
  addressCity: {
    type: DataTypes.STRING(50),
    field: 'address_city'
  },
  addressState: {
    type: DataTypes.STRING(50),
    field: 'address_state'
  },
  addressPostalCode: {
    type: DataTypes.STRING(20),
    field: 'address_postal_code'
  },
  addressCountry: {
    type: DataTypes.STRING(50),
    defaultValue: 'India',
    field: 'address_country'
  },
  emergencyContactName: {
    type: DataTypes.STRING(100),
    field: 'emergency_contact_name'
  },
  emergencyContactPhone: {
    type: DataTypes.STRING(20),
    field: 'emergency_contact_phone'
  },
  emergencyContactRelation: {
    type: DataTypes.STRING(50),
    field: 'emergency_contact_relation'
  },
  bloodGroup: {
    type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
    field: 'blood_group'
  },
  allergies: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  chronicConditions: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'chronic_conditions'
  },
  medications: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  insuranceProvider: {
    type: DataTypes.STRING(100),
    field: 'insurance_provider'
  },
  insurancePolicyNumber: {
    type: DataTypes.STRING(50),
    field: 'insurance_policy_number'
  },
  insurancePolicyHolder: {
    type: DataTypes.STRING(100),
    field: 'insurance_policy_holder'
  },
  insuranceCoverageType: {
    type: DataTypes.ENUM('basic', 'premium', 'corporate'),
    field: 'insurance_coverage_type'
  },
  insuranceValidFrom: {
    type: DataTypes.DATEONLY,
    field: 'insurance_valid_from'
  },
  insuranceValidTo: {
    type: DataTypes.DATEONLY,
    field: 'insurance_valid_to'
  },
  registrationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'registration_date'
  },
  clinicId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'clinic_id'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'deceased'),
    defaultValue: 'active'
  },
  documents: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  statistics: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalVisits: 0,
      totalBilled: 0,
      lastVisit: null,
      upcomingAppointments: 0
    }
  }
}, {
  tableName: 'patients',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  hooks: {
    beforeCreate: async (patient) => {
      if (!patient.patientId) {
        const year = new Date().getFullYear();
        const count = await Patient.count({
          where: sequelize.where(
            sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM "registration_date"')),
            year
          )
        });
        patient.patientId = `PT${year}${String(count + 1).padStart(4, '0')}`;
      }
    }
  }
});

// Virtual fields
Patient.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

Patient.prototype.getAge = function() {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

module.exports = Patient;
