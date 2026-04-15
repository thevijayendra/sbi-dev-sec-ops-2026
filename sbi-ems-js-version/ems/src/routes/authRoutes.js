'use strict';

const router     = require('express').Router();
const { body }   = require('express-validator');
const controller = require('../controllers/authController');
const validate   = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const { createEmployeeRules } = require('../validators/employeeValidator');

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate and receive a JWT
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: JWT token }
 *       401: { description: Invalid credentials }
 */
router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  controller.login
);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new employee (ADMIN only)
 *     tags: [Auth]
 *     responses:
 *       201: { description: Employee created }
 *       409: { description: Email already exists }
 */
router.post('/register',
  authenticate,
  authorize('ADMIN'),
  createEmployeeRules,
  validate,
  controller.register
);

module.exports = router;
