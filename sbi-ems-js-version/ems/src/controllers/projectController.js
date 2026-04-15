'use strict';

const { Project, Employee, EmployeeProject, Department, Role } = require('../models');

// Valid project status transitions (state machine — A04 Insecure Design)
const VALID_TRANSITIONS = {
  PLANNED:   ['ACTIVE', 'CANCELLED'],
  ACTIVE:    ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD:   ['ACTIVE', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

exports.getAll = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;

    const projects = await Project.findAll({
      where,
      order: [['startDate', 'DESC']],
    });
    res.json(projects);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) { const e = new Error('Project not found'); e.statusCode = 404; throw e; }
    res.json(project);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      err.statusCode = 409; err.message = 'A project with this name already exists';
    }
    next(err);
  }
};

/**
 * PUT /api/v1/projects/:id
 * Status changes are validated against the state machine.
 * DevSecOps training note (A04 — Insecure Design):
 *   Business rules (PLANNED → COMPLETED is forbidden) must be enforced
 *   in the service/controller layer, not just in UI validation.
 */
exports.update = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) { const e = new Error('Project not found'); e.statusCode = 404; throw e; }

    if (req.body.status && req.body.status !== project.status) {
      const allowed = VALID_TRANSITIONS[project.status] || [];
      if (!allowed.includes(req.body.status)) {
        const e = new Error(
          `Invalid status transition: ${project.status} → ${req.body.status}. ` +
          `Allowed: ${allowed.join(', ') || 'none'}`
        );
        e.statusCode = 422; throw e;
      }
    }

    await project.update(req.body);
    res.json(project);
  } catch (err) { next(err); }
};

/**
 * DELETE /api/v1/projects/:id  (ADMIN + MANAGER)
 * Cascade-deletes all EmployeeProject assignments for this project.
 */
exports.remove = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) { const e = new Error('Project not found'); e.statusCode = 404; throw e; }

    await EmployeeProject.destroy({ where: { projectId: project.id } });
    await project.destroy();
    res.json({ message: 'Project deleted', id: project.id });
  } catch (err) { next(err); }
};

/**
 * POST /api/v1/projects/:id/employees
 * Assigns an employee to a project with a project-specific role.
 * Business rule: an employee cannot be assigned to the same project twice.
 */
exports.assignEmployee = async (req, res, next) => {
  try {
    const project  = await Project.findByPk(req.params.id);
    const employee = await Employee.findByPk(req.body.employeeId);

    if (!project)  { const e = new Error('Project not found');  e.statusCode = 404; throw e; }
    if (!employee) { const e = new Error('Employee not found'); e.statusCode = 404; throw e; }

    const existing = await EmployeeProject.findOne({
      where: { projectId: project.id, employeeId: employee.id },
    });
    if (existing) {
      const e = new Error('Employee is already assigned to this project');
      e.statusCode = 409; throw e;
    }

    const assignment = await EmployeeProject.create({
      projectId:    project.id,
      employeeId:   employee.id,
      projectRole:  req.body.projectRole,
      assignedDate: req.body.assignedDate || new Date(),
    });

    res.status(201).json(assignment);
  } catch (err) { next(err); }
};

/**
 * DELETE /api/v1/projects/:id/employees/:empId
 */
exports.removeEmployee = async (req, res, next) => {
  try {
    const deleted = await EmployeeProject.destroy({
      where: { projectId: req.params.id, employeeId: req.params.empId },
    });
    if (!deleted) {
      const e = new Error('Assignment not found'); e.statusCode = 404; throw e;
    }
    res.json({ message: 'Employee removed from project' });
  } catch (err) { next(err); }
};

/**
 * GET /api/v1/projects/:id/employees
 */
exports.getProjectEmployees = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [{
        model:      Employee,
        as:         'employees',
        attributes: { exclude: ['passwordHash', 'salary'] },
        through:    { attributes: ['projectRole', 'assignedDate'] },
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: Role,       as: 'role',       attributes: ['id', 'name', 'level'] },
        ],
      }],
    });
    if (!project) { const e = new Error('Project not found'); e.statusCode = 404; throw e; }
    res.json(project.employees);
  } catch (err) { next(err); }
};
