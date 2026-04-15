'use strict';

/**
 * Project endpoint tests.
 * Covers A04 (state machine — PLANNED → COMPLETED forbidden).
 */

const request = require('supertest');
const jwt     = require('jsonwebtoken');

jest.mock('../src/models', () => ({
  sequelize:  { authenticate: jest.fn().mockResolvedValue(), sync: jest.fn().mockResolvedValue() },
  Employee:   { findByPk: jest.fn() },
  Department: {},
  Role:       {},
  Project:    { findByPk: jest.fn(), findAll: jest.fn(), create: jest.fn() },
  EmployeeProject: { findOne: jest.fn(), create: jest.fn(), destroy: jest.fn() },
}));

const app = require('../src/app');
const { Project, EmployeeProject } = require('../src/models');

const SECRET = 'test-secret-for-unit-tests-only';
const adminToken = () =>
  jwt.sign({ id: 1, email: 'admin@sbi.com', authRole: 'ADMIN' }, SECRET, { expiresIn: '1h' });

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
  process.env.NODE_ENV   = 'test';
});
afterEach(() => jest.clearAllMocks());

// ── State machine tests (A04 — Insecure Design) ───────────────────────────

describe('PUT /api/v1/projects/:id — status state machine', () => {
  it('allows PLANNED → ACTIVE', async () => {
    const mockUpdate = jest.fn().mockImplementation(function(data) {
      Object.assign(this, data); return Promise.resolve(this);
    });
    Project.findByPk.mockResolvedValue({
      id: 1, status: 'PLANNED', update: mockUpdate,
      toJSON() { return { id: 1, status: 'ACTIVE' }; },
    });
    const res = await request(app)
      .put('/api/v1/projects/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'ACTIVE' });
    expect(res.status).toBe(200);
  });

  it('rejects PLANNED → COMPLETED (invalid transition)', async () => {
    Project.findByPk.mockResolvedValue({
      id: 2, status: 'PLANNED',
      update: jest.fn(),
    });
    const res = await request(app)
      .put('/api/v1/projects/2')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/PLANNED.*COMPLETED/);
  });

  it('rejects COMPLETED → ACTIVE (terminal state)', async () => {
    Project.findByPk.mockResolvedValue({
      id: 3, status: 'COMPLETED', update: jest.fn(),
    });
    const res = await request(app)
      .put('/api/v1/projects/3')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'ACTIVE' });
    expect(res.status).toBe(422);
  });
});

// ── Assignment tests ───────────────────────────────────────────────────────

describe('POST /api/v1/projects/:id/employees', () => {
  const { Employee } = require('../src/models');

  it('assigns an employee to a project successfully', async () => {
    Project.findByPk.mockResolvedValue({ id: 1 });
    Employee.findByPk.mockResolvedValue({ id: 5 });
    EmployeeProject.findOne.mockResolvedValue(null);
    EmployeeProject.create.mockResolvedValue({ projectId: 1, employeeId: 5, projectRole: 'Dev' });

    const res = await request(app)
      .post('/api/v1/projects/1/employees')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ employeeId: 5, projectRole: 'Dev' });
    expect(res.status).toBe(201);
  });

  it('prevents duplicate assignment (business rule)', async () => {
    Project.findByPk.mockResolvedValue({ id: 1 });
    Employee.findByPk.mockResolvedValue({ id: 5 });
    EmployeeProject.findOne.mockResolvedValue({ projectId: 1, employeeId: 5 }); // already exists

    const res = await request(app)
      .post('/api/v1/projects/1/employees')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ employeeId: 5, projectRole: 'Dev' });
    expect(res.status).toBe(409);
  });
});
