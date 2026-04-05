const { sequelize } = require('../config/database_pg');

// Import models
const Clinic = require('./Clinic');
const User = require('./User');
const Patient = require('./Patient');
const Appointment = require('./Appointment');
const Bill = require('./Bill');
const InsuranceClaim = require('./InsuranceClaim');

// Define associations
// Clinic associations
Clinic.hasMany(User, { foreignKey: 'clinicId', as: 'users' });
Clinic.hasMany(Patient, { foreignKey: 'clinicId', as: 'patients' });
Clinic.hasMany(Appointment, { foreignKey: 'clinicId', as: 'appointments' });
Clinic.hasMany(Bill, { foreignKey: 'clinicId', as: 'bills' });
Clinic.hasMany(InsuranceClaim, { foreignKey: 'clinicId', as: 'insuranceClaims' });

// User associations
User.belongsTo(Clinic, { foreignKey: 'clinicId', as: 'clinic' });
User.hasMany(Appointment, { foreignKey: 'doctorId', as: 'doctorAppointments' });
User.hasMany(Bill, { foreignKey: 'createdBy', as: 'createdBills' });

// Patient associations
Patient.belongsTo(Clinic, { foreignKey: 'clinicId', as: 'clinic' });
Patient.hasMany(Appointment, { foreignKey: 'patientId', as: 'appointments' });
Patient.hasMany(Bill, { foreignKey: 'patientId', as: 'bills' });
Patient.hasMany(InsuranceClaim, { foreignKey: 'patientId', as: 'insuranceClaims' });

// Appointment associations
Appointment.belongsTo(Clinic, { foreignKey: 'clinicId', as: 'clinic' });
Appointment.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
Appointment.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
Appointment.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Appointment.belongsTo(Bill, { foreignKey: 'billId', as: 'bill' });

// Bill associations
Bill.belongsTo(Clinic, { foreignKey: 'clinicId', as: 'clinic' });
Bill.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
Bill.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Bill.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'appointment' });
Bill.hasOne(InsuranceClaim, { foreignKey: 'billId', as: 'insuranceClaim' });

// InsuranceClaim associations
InsuranceClaim.belongsTo(Clinic, { foreignKey: 'clinicId', as: 'clinic' });
InsuranceClaim.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
InsuranceClaim.belongsTo(Bill, { foreignKey: 'billId', as: 'bill' });
InsuranceClaim.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = {
  sequelize,
  Clinic,
  User,
  Patient,
  Appointment,
  Bill,
  InsuranceClaim
};
