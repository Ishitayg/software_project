const { sequelize, DataTypes } = require('../config/database_pg');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'patient_id'
  },
  doctorId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'doctor_id'
  },
  clinicId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'clinic_id'
  },
  appointmentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'appointment_date'
  },
  appointmentTime: {
    type: DataTypes.STRING(5),
    allowNull: false,
    field: 'appointment_time'
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 30
  },
  type: {
    type: DataTypes.ENUM('consultation', 'follow_up', 'emergency', 'procedure'),
    defaultValue: 'consultation'
  },
  bookingSource: {
    type: DataTypes.ENUM('walk_in', 'phone', 'whatsapp', 'online', 'manual'),
    defaultValue: 'walk_in',
    field: 'booking_source'
  },
  notes: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'confirmed', 'waiting', 'in_consultation', 'completed', 'cancelled', 'no_show'),
    defaultValue: 'scheduled'
  },
  checkedInAt: {
    type: DataTypes.DATE,
    field: 'checked_in_at'
  },
  checkedInBy: {
    type: DataTypes.UUID,
    field: 'checked_in_by'
  },
  checkedOutAt: {
    type: DataTypes.DATE,
    field: 'checked_out_at'
  },
  checkedOutBy: {
    type: DataTypes.UUID,
    field: 'checked_out_by'
  },
  consultationStartTime: {
    type: DataTypes.DATE,
    field: 'consultation_start_time'
  },
  consultationEndTime: {
    type: DataTypes.DATE,
    field: 'consultation_end_time'
  },
  consultationNotes: {
    type: DataTypes.TEXT,
    field: 'consultation_notes'
  },
  diagnosis: {
    type: DataTypes.TEXT
  },
  prescription: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  followUpDate: {
    type: DataTypes.DATEONLY,
    field: 'follow_up_date'
  },
  vitals: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  consultationDocuments: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'consultation_documents'
  },
  consultationFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'consultation_fee'
  },
  additionalServices: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'additional_services'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'total_amount'
  },
  billGenerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'bill_generated'
  },
  billId: {
    type: DataTypes.UUID,
    field: 'bill_id'
  },
  reminderSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'reminder_sent'
  },
  reminderSentAt: {
    type: DataTypes.DATE,
    field: 'reminder_sent_at'
  },
  rescheduleHistory: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'reschedule_history'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  }
}, {
  tableName: 'appointments',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['clinic_id', 'appointment_date'] },
    { fields: ['doctor_id', 'appointment_date'] },
    { fields: ['patient_id', 'appointment_date'] },
    { fields: ['status'] }
  ]
});

// Instance methods
Appointment.prototype.getEndTime = function() {
  const [hours, minutes] = this.appointmentTime.split(':').map(Number);
  const endTime = new Date();
  endTime.setHours(hours, minutes + this.duration, 0, 0);
  return endTime.toTimeString().slice(0, 5);
};

Appointment.prototype.checkConflict = async function() {
  const Op = sequelize.Sequelize.Op;
  const conflict = await Appointment.findOne({
    where: {
      id: { [Op.ne]: this.id },
      doctorId: this.doctorId,
      clinicId: this.clinicId,
      appointmentDate: this.appointmentDate,
      status: { [Op.notIn]: ['cancelled', 'no_show'] },
      appointmentTime: { [Op.lt]: this.getEndTime() }
    }
  });
  return conflict;
};

module.exports = Appointment;
