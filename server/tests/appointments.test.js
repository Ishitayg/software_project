const request = require('supertest');
const express = require('express');

// Use valid v4 UUIDs (format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where y is 8,9,a,b)
const TEST_CLINIC_ID = 'a1b2c3d4-e5f6-4890-acbd-ef1234567890';
const TEST_PATIENT_ID = 'b2c3d4e5-f6a7-4901-abde-f23456789012';
const TEST_DOCTOR_ID = 'c3d4e5f6-a7b8-4912-adef-345678901234';

// Mock authentication middleware
jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'front_desk', clinicId: TEST_CLINIC_ID };
    next();
  },
  authorize: () => (req, res, next) => next(),
  auditLog: () => (req, res, next) => next(),
}));

// Mock models
jest.mock('../models', () => ({
  Appointment: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  Patient: {
    findByPk: jest.fn(),
  },
  User: {
    findByPk: jest.fn(),
  },
  Clinic: {
    findByPk: jest.fn(),
  },
}));

const { Appointment, Patient, User, Clinic } = require('../models');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/appointments', require('../routes/appointments'));

describe('Appointment Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/appointments', () => {
    it('should return list of appointments', async () => {
      const mockAppointments = [
        {
          id: 'd4e5f6a7-b8c9-4123-adef-456789012345',
          patientId: TEST_PATIENT_ID,
          doctorId: TEST_DOCTOR_ID,
          clinicId: TEST_CLINIC_ID,
          appointmentDate: '2024-01-01',
          status: 'scheduled',
        },
      ];

      Appointment.findAll.mockResolvedValue(mockAppointments);

      const res = await request(app)
        .get('/api/appointments')
        .query({ date: '2024-01-01' });

      expect(res.status).toBe(200);
      expect(res.body.appointments).toHaveLength(1);
    });
  });

  describe('POST /api/appointments', () => {
    it('should create a new appointment', async () => {
      const patientId = TEST_PATIENT_ID;
      const doctorId = TEST_DOCTOR_ID;
      const clinicId = TEST_CLINIC_ID;
      
      Patient.findByPk.mockResolvedValue({ id: patientId, isActive: true });
      User.findByPk.mockResolvedValue({ id: doctorId, role: 'doctor', isActive: true });
      Clinic.findByPk.mockResolvedValue({ id: clinicId, isActive: true });
      
      const newAppointment = {
        id: 'd4e5f6a7-b8c9-4123-9def-456789012345',
        patientId,
        doctorId,
        clinicId,
        appointmentDate: '2024-01-01',
        appointmentTime: '10:00',
        status: 'scheduled',
        checkConflict: jest.fn().mockResolvedValue(null), // No conflict
      };

      Appointment.create.mockResolvedValue(newAppointment);

      const res = await request(app)
        .post('/api/appointments')
        .send({
          patientId,
          doctorId,
          clinicId,
          appointmentDate: '2024-01-01',
          appointmentTime: '10:00',
          type: 'consultation',
          bookingSource: 'manual',
        });

      expect(res.status).toBe(201);
      expect(Appointment.create).toHaveBeenCalled();
    });

    it('should return 400 for validation errors', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .send({
          patientId: 'invalid-uuid',
          doctorId: 'invalid-uuid',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });
});
