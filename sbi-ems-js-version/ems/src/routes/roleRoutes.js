'use strict';

const router       = require('express').Router();
const { body, param } = require('express-validator');
const controller   = require('../controllers/roleController');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const validate     = require('../middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Organisational role management
 */

const roleRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('level').isInt({ min: 1, max: 10 }).withMessage('Level must be between 1 and 10'),
];

router.get('/',    authenticate, controller.getAll);
router.get('/:id', authenticate, [param('id').isInt({ min: 1 })], validate, controller.getById);
router.post('/',   authenticate, authorize('ADMIN'), roleRules, validate, controller.create);
router.put('/:id', authenticate, authorize('ADMIN'),
  [param('id').isInt({ min: 1 }), body('name').optional().trim(), body('level').optional().isInt({ min: 1, max: 10 })],
  validate, controller.update);
router.delete('/:id', authenticate, authorize('ADMIN'),
  [param('id').isInt({ min: 1 })], validate, controller.remove);

module.exports = router;
