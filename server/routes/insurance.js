const { Op } = require('sequelize');
const express = require('express');
const { body, validationResult } = require('express-validator');
const { InsuranceClaim, Bill, Patient, Clinic } = require('../models');
const { 
  authenticate, 
  authorize, 
  auditLog 
} = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/insurance';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'));
    }
  }
});

// Get insurance claims with pagination and filtering
router.get('/', authenticate, authorize('insurance', 'management', 'system_admin'), auditLog('insurance_claims_list'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      clinicId, 
      patientId,
      provider,
      startDate,
      endDate,
      sortBy = 'submissionDate',
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

    if (provider) {
      where.provider = { [Op.iLike]: `%${provider}%` };
    }

    if (startDate && endDate) {
      where.submissionDate = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }

    const offset = (page - 1) * limit;
    const order = [[sortBy, sortOrder.toUpperCase()]];

    const { count, rows: claims } = await InsuranceClaim.findAndCountAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName', 'phone'] },
        { model: Clinic, as: 'clinic', attributes: ['id', 'name', 'code'] },
        { model: Bill, as: 'bill', attributes: ['id', 'billNumber', 'totalAmount'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order
    });

    res.json({
      claims,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(count / limit),
        total: count
      }
    });
  } catch (error) {
    console.error('Insurance claims fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch insurance claims.' });
  }
});

// Get insurance claim by ID
router.get('/:id', authenticate, authorize('insurance', 'management', 'system_admin'), auditLog('insurance_claim_view'), async (req, res) => {
  try {
    const claim = await InsuranceClaim.findByPk(req.params.id, {
      include: [
        { model: Patient, as: 'patient' },
        { model: Clinic, as: 'clinic', attributes: ['id', 'name', 'addressStreet', 'addressCity', 'phone'] },
        { model: Bill, as: 'bill', attributes: ['id', 'billNumber', 'items', 'totalAmount'] }
      ]
    });

    if (!claim) {
      return res.status(404).json({ error: 'Insurance claim not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        claim.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ claim });
  } catch (error) {
    console.error('Insurance claim fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch insurance claim.' });
  }
});

// Create new insurance claim
router.post('/', authenticate, authorize('insurance', 'management', 'system_admin'), [
  body('patientId').isUUID().withMessage('Valid patient ID is required'),
  body('clinicId').isUUID().withMessage('Valid clinic ID is required'),
  body('billId').isUUID().withMessage('Valid bill ID is required'),
  body('provider').trim().notEmpty().withMessage('Insurance provider is required'),
  body('policyNumber').trim().notEmpty().withMessage('Policy number is required'),
  body('policyHolderName').trim().notEmpty().withMessage('Policy holder is required'),
  body('services').isArray({ min: 1 }).withMessage('At least one service is required'),
  body('services.*.serviceDate').isISO8601().withMessage('Valid service date is required'),
  body('services.*.serviceCode').trim().notEmpty().withMessage('Service code is required'),
  body('services.*.serviceName').trim().notEmpty().withMessage('Service name is required'),
  body('services.*.billedAmount').isNumeric().withMessage('Billed amount must be a number')
], auditLog('insurance_claim_create'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const claimData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        claimData.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Validate patient exists
    const patient = await Patient.findByPk(claimData.patientId);
    if (!patient) {
      return res.status(400).json({ error: 'Patient not found.' });
    }

    // Validate clinic exists
    const clinic = await Clinic.findByPk(claimData.clinicId);
    if (!clinic) {
      return res.status(400).json({ error: 'Clinic not found.' });
    }

    // Validate bill exists and is paid
    const bill = await Bill.findByPk(claimData.billId);
    if (!bill) {
      return res.status(400).json({ error: 'Bill not found.' });
    }

    if (bill.status !== 'paid') {
      return res.status(400).json({ error: 'Can only create insurance claims for paid bills.' });
    }

    // Check if claim already exists for this bill
    const existingClaim = await InsuranceClaim.findOne({ where: { billId: claimData.billId } });
    if (existingClaim) {
      return res.status(400).json({ 
        error: 'Insurance claim already exists for this bill.',
        existingClaim: {
          id: existingClaim.id,
          claimNumber: existingClaim.claimNumber,
          status: existingClaim.status
        }
      });
    }

    // Create claim
    claimData.status = 'draft';
    claimData.claimNumber = `CLM-${Date.now()}`;
    const claim = await InsuranceClaim.create(claimData);

    res.status(201).json({
      message: 'Insurance claim created successfully.',
      claim
    });
  } catch (error) {
    console.error('Insurance claim creation error:', error);
    res.status(500).json({ error: 'Failed to create insurance claim.' });
  }
});

// Submit insurance claim
router.post('/:id/submit', authenticate, authorize('insurance', 'management', 'system_admin'), auditLog('insurance_claim_submit'), async (req, res) => {
  try {
    const claim = await InsuranceClaim.findByPk(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: 'Insurance claim not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        claim.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (claim.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft claims can be submitted.' });
    }

    // Check if required documents are uploaded
    const requiredDocuments = ['claim_form', 'medical_report', 'invoice'];
    const documents = claim.documents || [];
    const uploadedDocumentTypes = documents.map(doc => doc.type);
    const missingDocuments = requiredDocuments.filter(type => !uploadedDocumentTypes.includes(type));

    if (missingDocuments.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required documents.',
        missingDocuments 
      });
    }

    claim.status = 'submitted';
    claim.submissionDate = new Date();
    await claim.save();

    res.json({
      message: 'Insurance claim submitted successfully.',
      claim
    });
  } catch (error) {
    console.error('Insurance claim submission error:', error);
    res.status(500).json({ error: 'Failed to submit insurance claim.' });
  }
});

// Upload claim document
router.post('/:id/documents', authenticate, authorize('insurance', 'management', 'system_admin'), 
  upload.single('document'), 
  auditLog('insurance_document_upload'), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      const { type, name } = req.body;
      if (!type || !name) {
        return res.status(400).json({ error: 'Document type and name are required.' });
      }

      const claim = await InsuranceClaim.findByPk(req.params.id);
      if (!claim) {
        return res.status(404).json({ error: 'Insurance claim not found.' });
      }

      // Check clinic access
      if (req.user.role !== 'system_admin' && 
          claim.clinicId !== req.user.clinicId) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      // Add document to claim
      const documents = claim.documents || [];
      documents.push({
        id: require('uuid').v4(),
        type,
        name,
        url: `/uploads/insurance/${req.file.filename}`,
        uploadedBy: req.user.id,
        uploadedAt: new Date()
      });
      claim.documents = documents;
      await claim.save();

      res.status(201).json({
        message: 'Document uploaded successfully.',
        document: documents[documents.length - 1]
      });
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: 'Failed to upload document.' });
    }
  }
);

// Add follow-up
router.post('/:id/followups', authenticate, authorize('insurance', 'management', 'system_admin'), [
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('type').isIn(['phone_call', 'email', 'letter', 'submission']).withMessage('Invalid follow-up type'),
  body('description').trim().notEmpty().withMessage('Description is required')
], auditLog('insurance_followup_add'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const claim = await InsuranceClaim.findByPk(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: 'Insurance claim not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        claim.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { dueDate, type, description } = req.body;
    const followUps = claim.followUps || [];
    followUps.push({
      id: require('uuid').v4(),
      dueDate: new Date(dueDate),
      type,
      description,
      completed: false
    });
    claim.followUps = followUps;
    await claim.save();

    res.status(201).json({
      message: 'Follow-up added successfully.',
      followUp: followUps[followUps.length - 1]
    });
  } catch (error) {
    console.error('Follow-up addition error:', error);
    res.status(500).json({ error: 'Failed to add follow-up.' });
  }
});

// Complete follow-up
router.put('/:id/followups/:followUpId/complete', authenticate, authorize('insurance', 'management', 'system_admin'), [
  body('notes').optional().trim()
], auditLog('insurance_followup_complete'), async (req, res) => {
  try {
    const claim = await InsuranceClaim.findByPk(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: 'Insurance claim not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        claim.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { notes } = req.body;
    const followUps = claim.followUps || [];
    const followUpIndex = followUps.findIndex(f => f.id === req.params.followUpId);
    
    if (followUpIndex === -1) {
      return res.status(404).json({ error: 'Follow-up not found.' });
    }

    followUps[followUpIndex].completed = true;
    followUps[followUpIndex].completedAt = new Date();
    followUps[followUpIndex].completedBy = req.user.id;
    followUps[followUpIndex].notes = notes;
    claim.followUps = followUps;
    await claim.save();

    res.json({
      message: 'Follow-up completed successfully.',
      followUp: followUps[followUpIndex]
    });
  } catch (error) {
    console.error('Follow-up completion error:', error);
    res.status(500).json({ error: 'Failed to complete follow-up.' });
  }
});

// Update claim status (adjudication)
router.put('/:id/adjudicate', authenticate, authorize('management', 'system_admin'), [
  body('status').isIn(['approved', 'partially_approved', 'rejected']).withMessage('Invalid adjudication status'),
  body('approvedAmount').optional().isNumeric().withMessage('Approved amount must be a number'),
  body('adjudicationDate').optional().isISO8601(),
  body('referenceNumber').optional().trim(),
  body('denialReasons').optional().isArray()
], auditLog('insurance_claim_adjudicate'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const claim = await InsuranceClaim.findByPk(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: 'Insurance claim not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        claim.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (!['submitted', 'pending', 'under_review'].includes(claim.status)) {
      return res.status(400).json({ error: 'Claim must be submitted or under review to adjudicate.' });
    }

    const { status, approvedAmount, adjudicationDate, referenceNumber, denialReasons } = req.body;

    claim.status = status;
    if (approvedAmount) claim.approvedAmount = approvedAmount;
    if (adjudicationDate) claim.adjudicationDate = new Date(adjudicationDate);
    if (referenceNumber) claim.referenceNumber = referenceNumber;
    if (denialReasons) claim.denialReasons = denialReasons;

    await claim.save();

    res.json({
      message: `Insurance claim ${status} successfully.`,
      claim
    });
  } catch (error) {
    console.error('Claim adjudication error:', error);
    res.status(500).json({ error: 'Failed to adjudicate insurance claim.' });
  }
});

// Get overdue follow-ups
router.get('/followups/overdue', authenticate, authorize('insurance', 'management', 'system_admin'), async (req, res) => {
  try {
    const { clinicId } = req.query;
    
    // Check clinic access
    const filterClinicId = req.user.role === 'system_admin' ? clinicId : req.user.clinicId;

    const where = {
      clinicId: filterClinicId
    };

    const claims = await InsuranceClaim.findAll({ where });
    
    const overdueFollowUps = [];
    claims.forEach(claim => {
      const followUps = claim.followUps || [];
      followUps.forEach(followUp => {
        if (!followUp.completed && new Date(followUp.dueDate) < new Date()) {
          overdueFollowUps.push({
            ...followUp,
            claimId: claim.id,
            claimNumber: claim.claimNumber
          });
        }
      });
    });

    res.json({ overdueFollowUps });
  } catch (error) {
    console.error('Overdue follow-ups fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch overdue follow-ups.' });
  }
});

// Get claims by status
router.get('/status/:status', authenticate, authorize('insurance', 'management', 'system_admin'), async (req, res) => {
  try {
    const { status } = req.params;
    const { clinicId } = req.query;
    
    if (!['draft', 'submitted', 'pending', 'under_review', 'approved', 'partially_approved', 'rejected', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    // Check clinic access
    const filterClinicId = req.user.role === 'system_admin' ? clinicId : req.user.clinicId;

    const where = {
      status,
      clinicId: filterClinicId
    };

    const claims = await InsuranceClaim.findAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName'] },
        { model: Bill, as: 'bill', attributes: ['id', 'billNumber', 'totalAmount'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ claims });
  } catch (error) {
    console.error('Claims by status fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch claims by status.' });
  }
});

// Get insurance statistics
router.get('/statistics/summary', authenticate, authorize('management', 'system_admin'), async (req, res) => {
  try {
    const { clinicId, startDate, endDate } = req.query;
    
    // Check clinic access
    const filterClinicId = req.user.role === 'system_admin' ? clinicId : req.user.clinicId;

    const where = {
      clinicId: filterClinicId
    };
    
    if (startDate && endDate) {
      where.submissionDate = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }

    const claims = await InsuranceClaim.findAll({ where });
    
    const statistics = {
      totalClaims: claims.length,
      byStatus: {},
      totalClaimed: 0,
      totalApproved: 0
    };

    claims.forEach(claim => {
      // Count by status
      statistics.byStatus[claim.status] = (statistics.byStatus[claim.status] || 0) + 1;
      
      // Sum amounts
      const services = claim.services || [];
      services.forEach(service => {
        statistics.totalClaimed += parseFloat(service.billedAmount) || 0;
      });
      statistics.totalApproved += parseFloat(claim.approvedAmount) || 0;
    });

    res.json({ statistics });
  } catch (error) {
    console.error('Insurance statistics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch insurance statistics.' });
  }
});

module.exports = router;
