'use strict';

const router       = require('express').Router();
const { body, param } = require('express-validator');
const controller   = require('../controllers/departmentController');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const validate     = require('../middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Department management
 */

const deptRules = [
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
];

router.get('/',    authenticate, controller.getAll);
router.get('/:id', authenticate, [param('id').isInt({ min: 1 })], validate, controller.getById);
router.post('/',   authenticate, authorize('ADMIN'), deptRules, validate, controller.create);
router.put('/:id', authenticate, authorize('ADMIN'),
  [param('id').isInt({ min: 1 }), ...deptRules.map(r => r.optional())], validate, controller.update);
router.delete('/:id', authenticate, authorize('ADMIN'),
  [param('id').isInt({ min: 1 })], validate, controller.remove);

module.exports = router;
