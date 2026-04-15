'use strict';

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { Employee, Department, Role } = require('../models');

const SALT_ROUNDS = 12;

/**
 * POST /api/v1/auth/login
 * DevSecOps training note (A07 — Auth Failures):
 *   - Tokens are short-lived (default 15m — configurable via JWT_EXPIRY)
 *   - Secret comes from process.env.JWT_SECRET — never hardcoded
 *   - Generic error message to prevent username enumeration
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const employee = await Employee.findOne({ where: { email } });

    // Constant-time comparison path — always run bcrypt to prevent timing attacks
    const hash = employee ? employee.passwordHash : '$2b$12$invalidhashtopreventtimingattack';
    const valid = await bcrypt.compare(password, hash);

    if (!employee || !valid) {
      // Generic message — do not reveal whether email exists
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (employee.status === 'TERMINATED') {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const token = jwt.sign(
      { id: employee.id, email: employee.email, authRole: employee.authRole },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '15m', algorithm: 'HS256' }
    );

    res.json({ token, expiresIn: process.env.JWT_EXPIRY || '15m' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/register  (ADMIN only)
 */
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, salary, hireDate,
            departmentId, roleId, authRole, phone } = req.body;

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const employee = await Employee.create({
      firstName, lastName, email, passwordHash, salary,
      hireDate, departmentId, roleId, phone,
      authRole: authRole || 'EMPLOYEE',
    });

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
