'use strict';

const { Department, Employee } = require('../models');

exports.getAll = async (req, res, next) => {
  try {
    const departments = await Department.findAll({ order: [['name', 'ASC']] });
    res.json(departments);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) { const e = new Error('Department not found'); e.statusCode = 404; throw e; }
    res.json(dept);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const dept = await Department.create(req.body);
    res.status(201).json(dept);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      err.statusCode = 409; err.message = 'A department with this name already exists';
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) { const e = new Error('Department not found'); e.statusCode = 404; throw e; }
    await dept.update(req.body);
    res.json(dept);
  } catch (err) { next(err); }
};

/**
 * DELETE /api/v1/departments/:id  (ADMIN only)
 * Business rule: cannot delete if active employees are assigned.
 */
exports.remove = async (req, res, next) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) { const e = new Error('Department not found'); e.statusCode = 404; throw e; }

    const activeCount = await Employee.count({
      where: { departmentId: dept.id, status: ['ACTIVE', 'INACTIVE', 'ON_LEAVE'] },
    });
    if (activeCount > 0) {
      const e = new Error(`Cannot delete department — ${activeCount} active employee(s) assigned`);
      e.statusCode = 409; throw e;
    }

    await dept.destroy();
    res.json({ message: 'Department deleted', id: dept.id });
  } catch (err) { next(err); }
};
