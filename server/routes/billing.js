const { Op } = require('sequelize');
const express = require('express');
const { body, validationResult } = require('express-validator');
const { Bill, Patient, Appointment } = require('../models');
const { 
  authenticate, 
  authorize, 
  auditLog 
} = require('../middleware/auth');

const router = express.Router();

// Get bills with pagination and filtering
router.get('/', authenticate, authorize('billing', 'management', 'system_admin'), auditLog('bills_list'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      clinicId, 
      patientId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const where = {};

    // Filter by user's clinic unless system admin
    if (req.user.role !== 'system_admin') {
      where.clinicId = req.user.clinicId;
    } else if (clinicId) {
      where.clinicId = clinicId;
    }

    if (status) {
      where.status = status;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (startDate && endDate) {
      where.createdAt = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }

    const offset = (page - 1) * limit;
    const order = [[sortBy, sortOrder.toUpperCase()]];

    const { count, rows: bills } = await Bill.findAndCountAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName', 'phone'] },
        { model: Appointment, as: 'appointment', attributes: ['id', 'appointmentDate', 'appointmentTime'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order
    });

    res.json({
      bills,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(count / limit),
        total: count
      }
    });
  } catch (error) {
    console.error('Bills fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch bills.' });
  }
});

// Get bill by ID
router.get('/:id', authenticate, authorize('billing', 'management', 'system_admin'), auditLog('bill_view'), async (req, res) => {
  try {
    const bill = await Bill.findByPk(req.params.id, {
      include: [
        { model: Patient, as: 'patient' },
        { model: Appointment, as: 'appointment', attributes: ['id', 'appointmentDate', 'appointmentTime', 'consultationNotes'] }
      ]
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        bill.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ bill });
  } catch (error) {
    console.error('Bill fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch bill.' });
  }
});

// Create new bill
router.post('/', authenticate, authorize('billing', 'management', 'system_admin'), [
  body('patientId').isUUID().withMessage('Valid patient ID is required'),
  body('clinicId').isUUID().withMessage('Valid clinic ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.type').isIn(['consultation', 'procedure', 'lab_test', 'medicine']).withMessage('Invalid item type'),
  body('items.*.name').trim().notEmpty().withMessage('Item name is required'),
  body('items.*.unitPrice').isNumeric().withMessage('Unit price must be a number'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('paymentMethod').isIn(['cash', 'card', 'digital', 'insurance', 'mixed']).withMessage('Invalid payment method')
], auditLog('bill_create'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { Clinic } = require('../models');
    const billData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        billData.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Validate patient exists
    const patient = await Patient.findByPk(billData.patientId);
    if (!patient) {
      return res.status(400).json({ error: 'Patient not found.' });
    }

    // Validate clinic exists
    const clinic = await Clinic.findByPk(billData.clinicId);
    if (!clinic) {
      return res.status(400).json({ error: 'Clinic not found.' });
    }

    // Validate appointment if provided
    if (billData.appointmentId) {
      const appointment = await Appointment.findByPk(billData.appointmentId);
      if (!appointment) {
        return res.status(400).json({ error: 'Appointment not found.' });
      }
    }

    // Calculate totals
    const subtotal = billData.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const taxAmount = billData.taxAmount || 0;
    const discountAmount = billData.discountAmount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    billData.subtotal = subtotal;
    billData.totalAmount = totalAmount;
    billData.paidAmount = 0;
    billData.balanceAmount = totalAmount;
    billData.status = 'draft';

    // Create bill
    const bill = await Bill.create(billData);

    res.status(201).json({
      message: 'Bill created successfully.',
      bill
    });
  } catch (error) {
    console.error('Bill creation error:', error);
    res.status(500).json({ error: 'Failed to create bill.' });
  }
});

// Update bill
router.put('/:id', authenticate, authorize('billing', 'management', 'system_admin'), [
  body('items').optional().isArray().withMessage('Items must be an array'),
  body('status').optional().isIn(['draft', 'generated', 'partial_paid', 'paid', 'overdue', 'cancelled']).withMessage('Invalid status')
], auditLog('bill_update'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const bill = await Bill.findByPk(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        bill.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Don't allow updates to paid bills
    if (bill.status === 'paid') {
      return res.status(400).json({ error: 'Cannot update paid bills.' });
    }

    // Update bill
    if (req.body.items) {
      bill.items = req.body.items;
      // Recalculate totals
      const subtotal = bill.items.reduce((sum, item) => sum + (parseFloat(item.unitPrice) * parseInt(item.quantity)), 0);
      bill.subtotal = subtotal;
      bill.totalAmount = subtotal + (parseFloat(bill.taxAmount) || 0) - (parseFloat(bill.discountAmount) || 0);
      bill.balanceAmount = bill.totalAmount - (parseFloat(bill.paidAmount) || 0);
    }
    if (req.body.status) {
      bill.status = req.body.status;
    }

    await bill.save();

    res.json({
      message: 'Bill updated successfully.',
      bill
    });
  } catch (error) {
    console.error('Bill update error:', error);
    res.status(500).json({ error: 'Failed to update bill.' });
  }
});

// Add payment to bill
router.post('/:id/payments', authenticate, authorize('billing', 'management', 'system_admin'), [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('method').isIn(['cash', 'card', 'digital', 'insurance']).withMessage('Invalid payment method'),
  body('transactionId').optional().trim(),
  body('notes').optional().trim()
], auditLog('payment_add'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const bill = await Bill.findByPk(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        bill.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (bill.status === 'paid') {
      return res.status(400).json({ error: 'Bill is already fully paid.' });
    }

    const paymentAmount = parseFloat(req.body.amount);
    const balanceAmount = parseFloat(bill.balanceAmount);

    // Check if payment amount exceeds balance
    if (paymentAmount > balanceAmount) {
      return res.status(400).json({ 
        error: 'Payment amount exceeds remaining balance.',
        balanceAmount
      });
    }

    // Add payment to payments array
    const payments = bill.payments || [];
    payments.push({
      id: require('uuid').v4(),
      amount: paymentAmount,
      method: req.body.method,
      transactionId: req.body.transactionId,
      notes: req.body.notes,
      receivedBy: req.user.id,
      receivedAt: new Date()
    });
    bill.payments = payments;

    // Update financials
    bill.paidAmount = (parseFloat(bill.paidAmount) || 0) + paymentAmount;
    bill.balanceAmount = balanceAmount - paymentAmount;
    
    // Update status based on payment
    if (bill.balanceAmount <= 0) {
      bill.status = 'paid';
    } else if (bill.paidAmount > 0) {
      bill.status = 'partial_paid';
    }

    await bill.save();

    res.status(201).json({
      message: 'Payment added successfully.',
      bill
    });
  } catch (error) {
    console.error('Payment addition error:', error);
    res.status(500).json({ error: 'Failed to add payment.' });
  }
});

// Add adjustment to bill
router.post('/:id/adjustments', authenticate, authorize('management', 'system_admin'), [
  body('type').isIn(['discount', 'write_off', 'refund']).withMessage('Invalid adjustment type'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('reason').trim().notEmpty().withMessage('Reason is required')
], auditLog('bill_adjustment'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const bill = await Bill.findByPk(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        bill.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const adjustmentAmount = parseFloat(req.body.amount);

    // Add adjustment to adjustments array
    const adjustments = bill.adjustments || [];
    adjustments.push({
      id: require('uuid').v4(),
      type: req.body.type,
      amount: adjustmentAmount,
      reason: req.body.reason,
      approvedBy: req.user.id,
      approvedAt: new Date()
    });
    bill.adjustments = adjustments;

    // Update totals
    bill.totalAmount = (parseFloat(bill.totalAmount) || 0) - adjustmentAmount;
    bill.balanceAmount = (parseFloat(bill.balanceAmount) || 0) - adjustmentAmount;

    await bill.save();

    res.status(201).json({
      message: 'Adjustment added successfully.',
      bill
    });
  } catch (error) {
    console.error('Adjustment addition error:', error);
    res.status(500).json({ error: 'Failed to add adjustment.' });
  }
});

// Get outstanding bills
router.get('/outstanding/list', authenticate, authorize('billing', 'management', 'system_admin'), async (req, res) => {
  try {
    const { clinicId } = req.query;
    
    // Check clinic access
    const filterClinicId = req.user.role === 'system_admin' ? clinicId : req.user.clinicId;

    const where = {
      clinicId: filterClinicId,
      status: { [Op.in]: ['generated', 'partial_paid', 'overdue'] }
    };

    const bills = await Bill.findAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ bills });
  } catch (error) {
    console.error('Outstanding bills fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch outstanding bills.' });
  }
});

// Get revenue statistics
router.get('/revenue/stats', authenticate, authorize('management', 'system_admin'), async (req, res) => {
  try {
    const { clinicId, startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required.' });
    }

    // Check clinic access
    const filterClinicId = req.user.role === 'system_admin' ? clinicId : req.user.clinicId;

    const where = {
      clinicId: filterClinicId,
      createdAt: {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      }
    };

    const bills = await Bill.findAll({ where });
    
    const stats = bills.reduce((acc, bill) => {
      const total = parseFloat(bill.totalAmount) || 0;
      const paid = parseFloat(bill.paidAmount) || 0;
      return {
        totalRevenue: acc.totalRevenue + paid,
        totalBilled: acc.totalBilled + total,
        billCount: acc.billCount + 1
      };
    }, { totalRevenue: 0, totalBilled: 0, billCount: 0 });

    stats.totalOutstanding = stats.totalBilled - stats.totalRevenue;

    res.json({ statistics: stats });
  } catch (error) {
    console.error('Revenue statistics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue statistics.' });
  }
});

// Generate bill PDF
router.get('/:id/pdf', authenticate, authorize('billing', 'management', 'system_admin'), async (req, res) => {
  try {
    const { Clinic } = require('../models');
    const bill = await Bill.findByPk(req.params.id, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName', 'phone', 'address'] },
        { model: Clinic, as: 'clinic', attributes: ['id', 'name', 'addressStreet', 'addressCity', 'phone'] },
        { model: Appointment, as: 'appointment', attributes: ['id', 'appointmentDate', 'appointmentTime'] }
      ]
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        bill.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // TODO: Implement PDF generation
    // For now, return bill data that can be used to generate PDF on client side
    res.json({ 
      message: 'PDF generation endpoint - implement PDF library here',
      bill 
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF.' });
  }
});

// Cancel bill
router.post('/:id/cancel', authenticate, authorize('management', 'system_admin'), [
  body('reason').trim().notEmpty().withMessage('Cancellation reason is required')
], auditLog('bill_cancel'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const bill = await Bill.findByPk(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        bill.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (bill.status === 'paid') {
      return res.status(400).json({ error: 'Cannot cancel paid bills.' });
    }

    bill.status = 'cancelled';
    bill.notes = (bill.notes || '') + 
      `\n\nCancelled: ${req.body.reason} (by ${req.user.firstName} ${req.user.lastName})`;

    await bill.save();

    res.json({
      message: 'Bill cancelled successfully.',
      bill
    });
  } catch (error) {
    console.error('Bill cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel bill.' });
  }
});

module.exports = router;
