'use strict';

/**
 * Employee endpoint tests.
 * Covers A01 (access control / salary masking), A03 (input validation),
 * and A04 (soft-delete business rule).
 */

const request = require('supertest');
const jwt     = require('jsonwebtoken');

jest.mock('../src/models', () => ({
  sequelize:  { authenticate: jest.fn().mockResolvedValue(), sync: jest.fn().mockResolvedValue() },
  Employee:   {
    findAndCountAll: jest.fn(),
    findByPk:        jest.fn(),
    findAll:         jest.fn(),
    create:          jest.fn(),
    count:           jest.fn(),
  },
  Department: {},
  Role:       {},
  Project:    {},
  EmployeeProject: {},
}));

const app = require('../src/app');
const { Employee } = require('../src/models');

const SECRET = 'test-secret-for-unit-tests-only';

const makeToken = (payload = {}) =>
  jwt.sign({ id: 1, email: 'admin@sbi.com', authRole: 'ADMIN', ...payload }, SECRET, { expiresIn: '1h' });

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
  process.env.NODE_ENV   = 'test';
});
afterEach(() => jest.clearAllMocks());

// ── GET /api/v1/employees ─────────────────────────────────────────────────

describe('GET /api/v1/employees', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/employees');
    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
  });

  it('returns paginated employees for ADMIN — salary visible', async () => {
    Employee.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{
        toJSON: () => ({ id: 1, firstName: 'Arjun', salary: 90000, email: 'a@sbi.com' }),
      }],
    });
    const res = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${makeToken({ authRole: 'ADMIN' })}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toHaveProperty('salary');  // ADMIN sees salary
  });

  it('strips salary for EMPLOYEE role (A01 — Broken Access Control)', async () => {
    Employee.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{
        toJSON: () => ({ id: 2, firstName: 'Priya', salary: 75000, email: 'p@sbi.com' }),
      }],
    });
    const res = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${makeToken({ id: 99, authRole: 'EMPLOYEE' })}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0]).not.toHaveProperty('salary');  // salary MUST be stripped
  });
});

// ── GET /api/v1/employees/:id ─────────────────────────────────────────────

describe('GET /api/v1/employees/:id', () => {
  it('returns 404 when employee does not exist', async () => {
    Employee.findByPk.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/v1/employees/999')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });

  it('allows an employee to view their own salary (A01)', async () => {
    Employee.findByPk.mockResolvedValue({
      id: 5, toJSON: () => ({ id: 5, firstName: 'Ravi', salary: 60000 }),
    });
    const res = await request(app)
      .get('/api/v1/employees/5')
      .set('Authorization', `Bearer ${makeToken({ id: 5, authRole: 'EMPLOYEE' })}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('salary');  // own record — salary visible
  });

  it('strips salary when a different employee requests the record', async () => {
    Employee.findByPk.mockResolvedValue({
      id: 7, toJSON: () => ({ id: 7, firstName: 'Meena', salary: 55000 }),
    });
    const res = await request(app)
      .get('/api/v1/employees/7')
      .set('Authorization', `Bearer ${makeToken({ id: 99, authRole: 'EMPLOYEE' })}`);
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('salary');
  });
});

// ── POST /api/v1/employees ────────────────────────────────────────────────

describe('POST /api/v1/employees', () => {
  it('returns 403 for non-ADMIN callers', async () => {
    const res = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${makeToken({ authRole: 'EMPLOYEE' })}`)
      .send({ firstName: 'Test', email: 'test@sbi.com' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when required fields are missing (A03)', async () => {
    const res = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${makeToken({ authRole: 'ADMIN' })}`)
      .send({ firstName: 'Incomplete' });  // missing many required fields
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});

// ── DELETE /api/v1/employees/:id (soft-delete) ────────────────────────────

describe('DELETE /api/v1/employees/:id', () => {
  it('sets status to TERMINATED — does not hard-delete (A04)', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(true);
    Employee.findByPk.mockResolvedValue({
      id: 3, status: 'ACTIVE', update: mockUpdate,
    });
    const res = await request(app)
      .delete('/api/v1/employees/3')
      .set('Authorization', `Bearer ${makeToken({ authRole: 'ADMIN' })}`);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'TERMINATED' });
  });
});
