const { sequelize, DataTypes } = require('../config/database_pg');

const Bill = sequelize.define('Bill', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  billNumber: {
    type: DataTypes.STRING(20),
    unique: true,
    field: 'bill_number'
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
  appointmentId: {
    type: DataTypes.UUID,
    field: 'appointment_id'
  },
  billDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'bill_date'
  },
  dueDate: {
    type: DataTypes.DATE,
    field: 'due_date'
  },
  status: {
    type: DataTypes.ENUM('draft', 'generated', 'partial_paid', 'paid', 'overdue', 'cancelled'),
    defaultValue: 'generated',
    field: 'status'
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'digital', 'insurance', 'mixed'),
    defaultValue: 'cash',
    field: 'payment_method'
  },
  items: {
    type: DataTypes.JSONB,
    defaultValue: [],
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'subtotal'
  },
  totalDiscount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'total_discount'
  },
  totalTax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'total_tax'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'total_amount'
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'paid_amount'
  },
  balanceAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'balance_amount'
  },
  payments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  insurance: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  adjustments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  internalNotes: {
    type: DataTypes.TEXT,
    field: 'internal_notes'
  },
  patientNotes: {
    type: DataTypes.TEXT,
    field: 'patient_notes'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  }
}, {
  tableName: 'bills',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  hooks: {
    beforeCreate: async (bill) => {
      if (!bill.billNumber) {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const count = await Bill.count({
          where: sequelize.where(
            sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM "bill_date"')),
            year
          )
        });
        bill.billNumber = `BILL${year}${month}${String(count + 1).padStart(4, '0')}`;
      }
    }
  }
});

// Instance method to calculate totals
Bill.prototype.calculateTotals = function() {
  let subtotal = 0;
  const items = this.items || [];
  
  items.forEach(item => {
    let itemTotal = parseFloat(item.unitPrice) * parseInt(item.quantity);
    
    if (item.discount > 0) {
      if (item.discountType === 'percentage') {
        itemTotal -= (itemTotal * item.discount) / 100;
      } else {
        itemTotal -= item.discount;
      }
    }
    
    if (item.tax > 0) {
      if (item.taxType === 'percentage') {
        itemTotal += (itemTotal * item.tax) / 100;
      } else {
        itemTotal += item.tax;
      }
    }
    
    item.total = itemTotal;
    subtotal += itemTotal;
  });
  
  this.subtotal = subtotal;
  this.totalAmount = subtotal - this.totalDiscount + this.totalTax;
  this.balanceAmount = this.totalAmount - this.paidAmount;
  
  if (this.paidAmount >= this.totalAmount) {
    this.status = 'paid';
  } else if (this.paidAmount > 0) {
    this.status = 'partial_paid';
  }
  
  if (this.dueDate && new Date() > new Date(this.dueDate) && this.status !== 'paid') {
    this.status = 'overdue';
  }
};

module.exports = Bill;
