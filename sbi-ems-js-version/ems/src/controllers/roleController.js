'use strict';

const { Role, Employee } = require('../models');

exports.getAll = async (req, res, next) => {
  try {
    const roles = await Role.findAll({ order: [['level', 'ASC'], ['name', 'ASC']] });
    res.json(roles);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) { const e = new Error('Role not found'); e.statusCode = 404; throw e; }
    res.json(role);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const role = await Role.create(req.body);
    res.status(201).json(role);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      err.statusCode = 409; err.message = 'A role with this name already exists';
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) { const e = new Error('Role not found'); e.statusCode = 404; throw e; }
    await role.update(req.body);
    res.json(role);
  } catch (err) { next(err); }
};

/**
 * DELETE /api/v1/roles/:id  (ADMIN only)
 * Business rule: cannot delete if employees are currently assigned.
 */
exports.remove = async (req, res, next) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) { const e = new Error('Role not found'); e.statusCode = 404; throw e; }

    const assignedCount = await Employee.count({ where: { roleId: role.id } });
    if (assignedCount > 0) {
      const e = new Error(`Cannot delete role — ${assignedCount} employee(s) assigned`);
      e.statusCode = 409; throw e;
    }

    await role.destroy();
    res.json({ message: 'Role deleted', id: role.id });
  } catch (err) { next(err); }
};
