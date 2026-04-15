'use strict';

/**
 * Auth endpoint tests — used in Lab 1 (SAST) to generate coverage for SonarQube.
 * Run: npm test
 */

const request = require('supertest');
const bcrypt  = require('bcrypt');

// Mock sequelize before loading app
jest.mock('../src/models', () => {
  const mockEmployee = {
    id: 1,
    email: 'admin@sbi.com',
    authRole: 'ADMIN',
    status: 'ACTIVE',
    passwordHash: null,    // set in beforeAll
    toJSON() { return { ...this }; },
  };
  return {
    sequelize:   { authenticate: jest.fn().mockResolvedValue(), sync: jest.fn().mockResolvedValue() },
    Employee:    { findOne: jest.fn(), create: jest.fn() },
    Department:  {},
    Role:        {},
    Project:     {},
    EmployeeProject: {},
  };
});

const app = require('../src/app');
const { Employee } = require('../src/models');

beforeAll(async () => {
  process.env.JWT_SECRET  = 'test-secret-for-unit-tests-only';
  process.env.JWT_EXPIRY  = '15m';
  process.env.NODE_ENV    = 'test';
});

afterEach(() => jest.clearAllMocks());

// ── POST /api/v1/auth/login ───────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'Admin@123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@sbi.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when employee not found', async () => {
    Employee.findOne.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@sbi.com', password: 'wrong' });
    expect(res.status).toBe(401);
    // Generic message — must not reveal whether email exists (A07)
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('returns 401 when password is incorrect', async () => {
    const hash = await bcrypt.hash('correctPassword', 10);
    Employee.findOne.mockResolvedValue({
      id: 1, email: 'admin@sbi.com', authRole: 'ADMIN',
      status: 'ACTIVE', passwordHash: hash,
    });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@sbi.com', password: 'wrongPassword' });
    expect(res.status).toBe(401);
  });

  it('returns JWT token on valid credentials', async () => {
    const hash = await bcrypt.hash('Admin@123', 10);
    Employee.findOne.mockResolvedValue({
      id: 1, email: 'admin@sbi.com', authRole: 'ADMIN',
      status: 'ACTIVE', passwordHash: hash,
    });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@sbi.com', password: 'Admin@123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  it('returns 403 for TERMINATED employees', async () => {
    const hash = await bcrypt.hash('Admin@123', 10);
    Employee.findOne.mockResolvedValue({
      id: 2, email: 'ex@sbi.com', authRole: 'EMPLOYEE',
      status: 'TERMINATED', passwordHash: hash,
    });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ex@sbi.com', password: 'Admin@123' });
    expect(res.status).toBe(403);
  });
});
