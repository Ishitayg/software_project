const { Op } = require('sequelize');
const express = require('express');
const { body, validationResult } = require('express-validator');
const { Patient, User, Clinic } = require('../models');
const { 
  authenticate, 
  authorize, 
  auditLog 
} = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/patients';
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

// Get patients with pagination and filtering
router.get('/', authenticate, authorize('management', 'system_admin', 'doctor', 'front_desk', 'nurse'), auditLog('patients_list'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      clinicId, 
      status,
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

    // Search functionality
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { patientId: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    const order = [[sortBy, sortOrder.toUpperCase()]];

    const { count, rows: patients } = await Patient.findAndCountAll({
      where,
      include: [
        { model: Clinic, as: 'clinic', attributes: ['id', 'name', 'code'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order
    });

    // Transform data to match frontend expectations
    const transformedPatients = patients.map(p => ({
      ...p.toJSON(),
      personalInfo: {
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        phone: p.phone,
        email: p.email,
        address: p.address
      },
      registrationInfo: {
        patientId: p.patientId,
        status: p.status,
        registrationDate: p.registrationDate
      },
      _id: p.id
    }));

    res.json({
      patients: transformedPatients,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(count / limit),
        total: count
      }
    });
  } catch (error) {
    console.error('Patients fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch patients.' });
  }
});

// Get patient by ID
router.get('/:id', authenticate, authorize('management', 'system_admin', 'doctor', 'front_desk', 'nurse'), auditLog('patient_view'), async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id, {
      include: [
        { model: Clinic, as: 'clinic', attributes: ['id', 'name', 'addressStreet', 'addressCity', 'phone'] }
      ]
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        patient.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ patient });
  } catch (error) {
    console.error('Patient fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch patient.' });
  }
});

// Create new patient
router.post('/', authenticate, authorize('management', 'system_admin', 'doctor', 'front_desk'), [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('phone').trim().isMobilePhone().withMessage('Valid phone number is required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('clinicId').isUUID().withMessage('Valid clinic ID is required')
], auditLog('patient_create'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const patientData = req.body;

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        patientData.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Check if patient with same phone already exists
    const existingPatient = await Patient.findOne({
      where: { phone: patientData.phone }
    });

    if (existingPatient) {
      return res.status(400).json({ 
        error: 'Patient with this phone number already exists.',
        existingPatient: {
          id: existingPatient.id,
          name: `${existingPatient.firstName} ${existingPatient.lastName}`,
          patientId: existingPatient.patientId
        }
      });
    }

    // Validate clinic exists
    const clinic = await Clinic.findByPk(patientData.clinicId);
    if (!clinic) {
      return res.status(400).json({ error: 'Invalid clinic selected.' });
    }

    // Create patient
    const patient = await Patient.create(patientData);

    res.status(201).json({
      message: 'Patient created successfully.',
      patient
    });
  } catch (error) {
    console.error('Patient creation error:', error);
    res.status(500).json({ error: 'Failed to create patient.' });
  }
});

// Update patient
router.put('/:id', authenticate, authorize('management', 'system_admin', 'doctor', 'front_desk'), [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().trim().isMobilePhone().withMessage('Valid phone number is required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required')
], auditLog('patient_update'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const patient = await Patient.findByPk(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        patient.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Check if phone number is being changed and if it conflicts with existing patient
    if (req.body.phone && req.body.phone !== patient.phone) {
      const existingPatient = await Patient.findOne({
        where: { 
          phone: req.body.phone,
          id: { [Op.ne]: patient.id }
        }
      });

      if (existingPatient) {
        return res.status(400).json({ 
          error: 'Patient with this phone number already exists.' 
        });
      }
    }

    // Update patient fields
    await patient.update(req.body);

    res.json({
      message: 'Patient updated successfully.',
      patient
    });
  } catch (error) {
    console.error('Patient update error:', error);
    res.status(500).json({ error: 'Failed to update patient.' });
  }
});

// Upload patient document
router.post('/:id/documents', authenticate, authorize('management', 'system_admin', 'doctor', 'front_desk', 'nurse'), 
  upload.single('document'), 
  auditLog('patient_document_upload'), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      const { type, name } = req.body;
      if (!type || !name) {
        return res.status(400).json({ error: 'Document type and name are required.' });
      }

      const patient = await Patient.findByPk(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found.' });
      }

      // Check clinic access
      if (req.user.role !== 'system_admin' && 
          patient.clinicId !== req.user.clinicId) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      // Add document to patient
      const documents = patient.documents || [];
      const newDocument = {
        id: require('uuid').v4(),
        type,
        name,
        url: `/uploads/patients/${req.file.filename}`,
        uploadedBy: req.user.id,
        uploadedAt: new Date()
      };
      documents.push(newDocument);
      patient.documents = documents;
      await patient.save();

      res.status(201).json({
        message: 'Document uploaded successfully.',
        document: newDocument
      });
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: 'Failed to upload document.' });
    }
  }
);

// Delete patient document
router.delete('/:id/documents/:documentId', authenticate, authorize('management', 'system_admin'), 
  auditLog('patient_document_delete'), 
  async (req, res) => {
    try {
      const patient = await Patient.findByPk(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found.' });
      }

      // Check clinic access
      if (req.user.role !== 'system_admin' && 
          patient.clinicId !== req.user.clinicId) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      const documents = patient.documents || [];
      const documentIndex = documents.findIndex(doc => doc.id === req.params.documentId);
      
      if (documentIndex === -1) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const document = documents[documentIndex];

      // Delete file from filesystem
      const filePath = path.join(__dirname, '../../', document.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Remove document from patient
      documents.splice(documentIndex, 1);
      patient.documents = documents;
      await patient.save();

      res.json({ message: 'Document deleted successfully.' });
    } catch (error) {
      console.error('Document deletion error:', error);
      res.status(500).json({ error: 'Failed to delete document.' });
    }
  }
);

// Get patient statistics
router.get('/:id/statistics', authenticate, authorize('management', 'system_admin', 'doctor', 'front_desk', 'nurse'), async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        patient.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { Appointment, Bill } = require('../models');
    
    // Get appointment statistics
    const totalAppointments = await Appointment.count({ where: { patientId: patient.id } });
    const completedAppointments = await Appointment.count({ 
      where: { patientId: patient.id, status: 'completed' } 
    });
    
    // Get billing statistics
    const bills = await Bill.findAll({ where: { patientId: patient.id } });
    const totalBilled = bills.reduce((sum, bill) => sum + (parseFloat(bill.totalAmount) || 0), 0);
    const totalPaid = bills.reduce((sum, bill) => sum + (parseFloat(bill.paidAmount) || 0), 0);
    const outstandingBalance = totalBilled - totalPaid;

    const statistics = {
      totalAppointments,
      completedAppointments,
      totalBilled: totalBilled.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      outstandingBalance: outstandingBalance.toFixed(2)
    };

    res.json({ statistics });
  } catch (error) {
    console.error('Patient statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch patient statistics.' });
  }
});

// Search patients (for autocomplete/typeahead)
router.get('/search/query', authenticate, authorize('management', 'system_admin', 'doctor', 'front_desk'), async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json({ patients: [] });
    }

    const where = {
      [Op.or]: [
        { firstName: { [Op.iLike]: `%${q}%` } },
        { lastName: { [Op.iLike]: `%${q}%` } },
        { phone: { [Op.iLike]: `%${q}%` } },
        { patientId: { [Op.iLike]: `%${q}%` } }
      ]
    };

    // Filter by user's clinic unless system admin
    if (req.user.role !== 'system_admin') {
      where.clinicId = req.user.clinicId;
    }

    const patients = await Patient.findAll({
      where,
      attributes: ['id', 'firstName', 'lastName', 'phone', 'patientId'],
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({ patients });
  } catch (error) {
    console.error('Patient search error:', error);
    res.status(500).json({ error: 'Failed to search patients.' });
  }
});

// Update patient status
router.put('/:id/status', authenticate, authorize('management', 'system_admin'), [
  body('status').isIn(['active', 'inactive', 'deceased']).withMessage('Invalid status')
], auditLog('patient_status_update'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const patient = await Patient.findByPk(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    // Check clinic access
    if (req.user.role !== 'system_admin' && 
        patient.clinicId !== req.user.clinicId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    patient.status = req.body.status;
    await patient.save();

    res.json({
      message: 'Patient status updated successfully.',
      status: patient.status
    });
  } catch (error) {
    console.error('Patient status update error:', error);
    res.status(500).json({ error: 'Failed to update patient status.' });
  }
});

module.exports = router;
