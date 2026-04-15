'use strict';

const router       = require('express').Router();
const { param }    = require('express-validator');
const controller   = require('../controllers/projectController');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const validate     = require('../middleware/validate');
const {
  createProjectRules, updateProjectRules,
  assignEmployeeRules, filterProjectRules,
} = require('../validators/projectValidator');

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management and staffing
 */

router.get('/',    authenticate, filterProjectRules, validate, controller.getAll);
router.get('/:id', authenticate, [param('id').isInt({ min: 1 })], validate, controller.getById);

router.post('/',
  authenticate, authorize('ADMIN', 'MANAGER'),
  createProjectRules, validate, controller.create);

router.put('/:id',
  authenticate, authorize('ADMIN', 'MANAGER'),
  updateProjectRules, validate, controller.update);

router.delete('/:id',
  authenticate, authorize('ADMIN', 'MANAGER'),
  [param('id').isInt({ min: 1 })], validate, controller.remove);

// Project ↔ Employee assignment
router.post('/:id/employees',
  authenticate, authorize('ADMIN', 'MANAGER'),
  assignEmployeeRules, validate, controller.assignEmployee);

router.delete('/:id/employees/:empId',
  authenticate, authorize('ADMIN', 'MANAGER'),
  [param('id').isInt({ min: 1 }), param('empId').isInt({ min: 1 })],
  validate, controller.removeEmployee);

router.get('/:id/employees',
  authenticate,
  [param('id').isInt({ min: 1 })], validate,
  controller.getProjectEmployees);

module.exports = router;
