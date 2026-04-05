const { sequelize, DataTypes } = require('../config/database_pg');

const InsuranceClaim = sequelize.define('InsuranceClaim', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  claimNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'claim_number'
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'patient_id'
  },
  clinicId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'clinic_id'
  },
  billId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'bill_id'
  },
  insuranceProvider: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'insurance_provider'
  },
  policyNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'policy_number'
  },
  policyHolder: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'policy_holder'
  },
  relationshipToPatient: {
    type: DataTypes.ENUM('self', 'spouse', 'child', 'parent', 'other'),
    field: 'relationship_to_patient'
  },
  memberId: {
    type: DataTypes.STRING(50),
    field: 'member_id'
  },
  groupNumber: {
    type: DataTypes.STRING(50),
    field: 'group_number'
  },
  dateOfService: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'date_of_service'
  },
  submissionDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'submission_date'
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'pending', 'under_review', 'approved', 'partially_approved', 'rejected', 'paid'),
    defaultValue: 'draft'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  totalClaimAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'total_claim_amount'
  },
  approvedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'approved_amount'
  },
  patientResponsibility: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'patient_responsibility'
  },
  deductible: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  coPayment: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'co_payment'
  },
  coinsurance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  services: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  documents: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  timeline: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  followUps: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'follow_ups'
  },
  internalNotes: {
    type: DataTypes.TEXT,
    field: 'internal_notes'
  },
  externalNotes: {
    type: DataTypes.TEXT,
    field: 'external_notes'
  },
  adjudicationDate: {
    type: DataTypes.DATE,
    field: 'adjudication_date'
  },
  adjudicatedBy: {
    type: DataTypes.STRING(100),
    field: 'adjudicated_by'
  },
  referenceNumber: {
    type: DataTypes.STRING(50),
    field: 'reference_number'
  },
  denialReasons: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'denial_reasons'
  },
  paymentDate: {
    type: DataTypes.DATE,
    field: 'payment_date'
  },
  paymentReference: {
    type: DataTypes.STRING(50),
    field: 'payment_reference'
  },
  checkNumber: {
    type: DataTypes.STRING(50),
    field: 'check_number'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  }
}, {
  tableName: 'insurance_claims',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  hooks: {
    beforeCreate: async (claim) => {
      if (!claim.claimNumber) {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const count = await InsuranceClaim.count({
          where: sequelize.where(
            sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM "submission_date"')),
            year
          )
        });
        claim.claimNumber = `CLAIM${year}${month}${String(count + 1).padStart(4, '0')}`;
      }
    }
  }
});

// Instance methods
InsuranceClaim.prototype.calculateTotals = function() {
  let totalBilled = 0;
  let totalApproved = 0;
  let totalDenied = 0;
  
  const services = this.services || [];
  services.forEach(service => {
    totalBilled += parseFloat(service.billedAmount) || 0;
    totalApproved += parseFloat(service.approvedAmount) || 0;
    totalDenied += parseFloat(service.deniedAmount) || 0;
  });
  
  this.totalClaimAmount = totalBilled;
  this.approvedAmount = totalApproved;
  this.patientResponsibility = totalBilled - totalApproved + parseFloat(this.deductible) + parseFloat(this.coPayment) + parseFloat(this.coinsurance);
};

InsuranceClaim.prototype.addTimelineEntry = function(action, description, performedBy, attachments = []) {
  const timeline = this.timeline || [];
  timeline.push({
    action,
    description,
    performedBy,
    attachments,
    performedAt: new Date()
  });
  this.timeline = timeline;
};

InsuranceClaim.prototype.addFollowUp = function(dueDate, type, description) {
  const followUps = this.followUps || [];
  followUps.push({
    dueDate,
    type,
    description,
    status: 'pending'
  });
  this.followUps = followUps;
};

InsuranceClaim.prototype.getOverdueFollowUps = function() {
  const now = new Date();
  const followUps = this.followUps || [];
  return followUps.filter(followUp => 
    followUp.status === 'pending' && new Date(followUp.dueDate) < now
  );
};

module.exports = InsuranceClaim;
