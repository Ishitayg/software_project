const request = require('supertest');
const express = require('express');

// Mock the models before importing routes
jest.mock('../models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Clinic: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(() => ({
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
    Op: { or: Symbol('or') },
  },
}));

// Mock the direct User model import
jest.mock('../models/User', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}));

const { User } = require('../models');
const UserModel = require('../models/User');

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => next(),
  authorize: () => (req, res, next) => next(),
  auditLog: () => (req, res, next) => next(),
  createRateLimit: () => (req, res, next) => next(),
  generateToken: () => 'test-token',
  updateLastLogin: () => Promise.resolve(),
  validatePasswordStrength: () => ({ isValid: true }),
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', require('../routes/auth'));

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      UserModel.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials.');
    });

    it('should return 401 for wrong password', async () => {
      UserModel.findOne.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(false),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials.');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          username: 'testuser',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should create a new user with valid data', async () => {
      UserModel.findOne.mockResolvedValue(null);
      UserModel.create.mockResolvedValue({
        id: 'new-id',
        email: 'test@test.com',
        username: 'testuser',
        role: 'management',
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'StrongPass123!',
          username: 'testuser',
          role: 'management',
          profile: {
            firstName: 'Test',
            lastName: 'User',
          },
          clinic: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
    });

    it('should return successful login with valid credentials', async () => {
      UserModel.findOne.mockResolvedValue({
        id: '1',
        username: 'testuser',
        email: 'test@test.com',
        role: 'management',
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(true),
      });
      UserModel.update.mockResolvedValue([1]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'correctpassword',
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
    });
  });
});
