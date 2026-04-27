const request = require('supertest');
const express = require('express');

// Use a valid UUID for clinicId
const TEST_CLINIC_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

// Mock authentication middleware
jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'management', clinicId: TEST_CLINIC_ID };
    next();
  },
  authorize: () => (req, res, next) => next(),
  auditLog: () => (req, res, next) => next(),
}));

// Mock models
jest.mock('../models', () => ({
  Patient: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  User: {
    findByPk: jest.fn(),
  },
  Clinic: {
    findByPk: jest.fn(),
  },
}));

const { Patient } = require('../models');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/patients', require('../routes/patients'));

describe('Patient Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/patients', () => {
    it('should return paginated list of patients', async () => {
      const mockPatients = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          patientId: 'P001',
          status: 'active',
          toJSON: function() { return this; },
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          patientId: 'P002',
          status: 'active',
          toJSON: function() { return this; },
        },
      ];

      Patient.findAndCountAll.mockResolvedValue({
        rows: mockPatients,
        count: 2,
      });

      const res = await request(app)
        .get('/api/patients')
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.patients).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should search patients by name', async () => {
      const mockPatients = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          patientId: 'P001',
          status: 'active',
          toJSON: function() { return this; },
        },
      ];

      Patient.findAndCountAll.mockResolvedValue({
        rows: mockPatients,
        count: 1,
      });

      const res = await request(app)
        .get('/api/patients')
        .query({ search: 'John' });

      expect(res.status).toBe(200);
      expect(res.body.patients).toHaveLength(1);
    });
  });

  describe('POST /api/patients', () => {
    it('should create a new patient', async () => {
      const newPatient = {
        id: 'new-id',
        firstName: 'Test',
        lastName: 'Patient',
        patientId: 'P003',
        status: 'active',
      };

      // Mock clinic exists - use the same clinicId as the test user
      const { Clinic } = require('../models');
      Clinic.findByPk.mockResolvedValue({ id: TEST_CLINIC_ID, name: 'Test Clinic' });
      Patient.findOne.mockResolvedValue(null); // No existing patient with same phone
      Patient.create.mockResolvedValue(newPatient);

      const res = await request(app)
        .post('/api/patients')
        .send({
          firstName: 'Test',
          lastName: 'Patient',
          dateOfBirth: '1990-01-01',
          gender: 'male',
          phone: '+12345678901',
          email: 'test@example.com',
          addressStreet: '123 Test St',
          addressCity: 'Test City',
          clinicId: TEST_CLINIC_ID,
        });

      expect(res.status).toBe(201);
      expect(Patient.create).toHaveBeenCalled();
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({
          firstName: 'Test',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });
});
