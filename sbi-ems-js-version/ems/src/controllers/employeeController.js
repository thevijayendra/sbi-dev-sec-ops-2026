'use strict';

const { Employee, Department, Role, Project, EmployeeProject } = require('../models');

// Attributes returned to callers who are NOT admin/self (salary stripped)
const PUBLIC_ATTRS = ['id', 'firstName', 'lastName', 'email', 'phone',
                      'hireDate', 'status', 'authRole', 'departmentId', 'roleId',
                      'createdAt', 'updatedAt'];

const isAdminOrSelf = (req, employeeId) =>
  req.user.authRole === 'ADMIN' || req.user.id === employeeId;

const includeRelations = [
  { model: Department, as: 'department', attributes: ['id', 'name'] },
  { model: Role,       as: 'role',       attributes: ['id', 'name', 'level'] },
];

/**
 * GET /api/v1/employees  — paginated list
 * Salary field is stripped for non-admin callers.
 */
exports.getAll = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));

    const { count, rows } = await Employee.findAndCountAll({
      attributes: { exclude: ['passwordHash'] },
      include:    includeRelations,
      limit,
      offset: (page - 1) * limit,
      order:  [['lastName', 'ASC'], ['firstName', 'ASC']],
    });

    const isAdmin = req.user.authRole === 'ADMIN';
    const data = rows.map(e => {
      const obj = e.toJSON();
      if (!isAdmin) delete obj.salary;
      return obj;
    });

    res.json({ total: count, page, limit, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/employees/:id
 * DevSecOps training note (A01 — Broken Access Control):
 *   Salary is PII — masked unless requester is ADMIN or the employee themselves.
 */
exports.getById = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      attributes: { exclude: ['passwordHash'] },
      include:    includeRelations,
    });

    if (!employee) {
      const err = new Error('Employee not found'); err.statusCode = 404; throw err;
    }

    const obj = employee.toJSON();
    if (!isAdminOrSelf(req, employee.id)) delete obj.salary;

    res.json(obj);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/employees/department/:deptId
 */
exports.getByDepartment = async (req, res, next) => {
  try {
    const employees = await Employee.findAll({
      where:      { departmentId: req.params.deptId },
      attributes: { exclude: ['passwordHash'] },
      include:    includeRelations,
    });

    const isAdmin = req.user.authRole === 'ADMIN';
    const data = employees.map(e => {
      const obj = e.toJSON();
      if (!isAdmin) delete obj.salary;
      return obj;
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/employees  (ADMIN only — handled at route level)
 */
exports.create = async (req, res, next) => {
  try {
    const bcrypt = require('bcrypt');
    const { password, ...rest } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);

    const employee = await Employee.create({ ...rest, passwordHash });

    const { passwordHash: _, ...safe } = employee.toJSON();
    res.status(201).json(safe);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      err.statusCode = 409;
      err.message    = 'An employee with this email already exists';
    }
    next(err);
  }
};

/**
 * PUT /api/v1/employees/:id
 * ADMIN can update any field; non-admin can only update their own non-PII fields.
 */
exports.update = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      const err = new Error('Employee not found'); err.statusCode = 404; throw err;
    }

    // Only ADMIN may change salary or authRole
    if (!isAdminOrSelf(req, employee.id)) {
      const err = new Error('Forbidden'); err.statusCode = 403; throw err;
    }
    if (req.user.authRole !== 'ADMIN') {
      delete req.body.salary;
      delete req.body.authRole;
    }

    await employee.update(req.body);
    const { passwordHash: _, ...safe } = employee.toJSON();
    res.json(safe);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/employees/:id  (ADMIN only)
 * Soft-delete: sets status to TERMINATED — record preserved for audit.
 * DevSecOps training note (A04 — Insecure Design): hard deletes are prohibited.
 */
exports.terminate = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      const err = new Error('Employee not found'); err.statusCode = 404; throw err;
    }

    await employee.update({ status: 'TERMINATED' });
    res.json({ message: 'Employee terminated (soft-deleted)', id: employee.id });
  } catch (err) {
    next(err);
  }
};
