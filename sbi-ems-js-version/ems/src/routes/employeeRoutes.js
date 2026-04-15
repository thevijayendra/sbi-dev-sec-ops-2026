'use strict';

const router       = require('express').Router();
const { param, query } = require('express-validator');
const controller   = require('../controllers/employeeController');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const validate     = require('../middleware/validate');
const auditSalaryAccess = require('../middleware/auditLogger');
const { createEmployeeRules, updateEmployeeRules } = require('../validators/employeeValidator');

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Employee management endpoints
 */

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: Get all employees (paginated)
 *     tags: [Employees]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated employee list }
 */
router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  auditSalaryAccess,
  controller.getAll
);

/**
 * @swagger
 * /employees/department/{deptId}:
 *   get:
 *     summary: Get all employees in a department
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: deptId
 *         required: true
 *         schema: { type: integer }
 */
router.get('/department/:deptId',
  authenticate,
  [param('deptId').isInt({ min: 1 }).withMessage('Department ID must be a positive integer')],
  validate,
  controller.getByDepartment
);

/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: Get employee by ID (salary masked for non-admin)
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 */
router.get('/:id',
  authenticate,
  [param('id').isInt({ min: 1 }).withMessage('Employee ID must be a positive integer')],
  validate,
  auditSalaryAccess,
  controller.getById
);

/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Create (onboard) a new employee — ADMIN only
 *     tags: [Employees]
 */
router.post('/',
  authenticate,
  authorize('ADMIN'),
  createEmployeeRules,
  validate,
  controller.create
);

/**
 * @swagger
 * /employees/{id}:
 *   put:
 *     summary: Update employee details
 *     tags: [Employees]
 */
router.put('/:id',
  authenticate,
  updateEmployeeRules,
  validate,
  controller.update
);

/**
 * @swagger
 * /employees/{id}:
 *   delete:
 *     summary: Terminate employee (soft-delete) — ADMIN only
 *     tags: [Employees]
 */
router.delete('/:id',
  authenticate,
  authorize('ADMIN'),
  [param('id').isInt({ min: 1 })],
  validate,
  controller.terminate
);

module.exports = router;
