'use strict';

const { body, param } = require('express-validator');

/**
 * Validation rules for employee creation.
 * DevSecOps training note (A03 — Injection / Input Validation):
 *   Every user-supplied field is typed, length-bounded, and pattern-matched
 *   before reaching the service layer.
 */
const createEmployeeRules = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2–50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name must contain only letters, spaces, hyphens, or apostrophes'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2–50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name must contain only letters, spaces, hyphens, or apostrophes'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional({ nullable: true })
    .trim()
    .matches(/^\+?[0-9\s\-().]{7,20}$/).withMessage('Phone must be a valid number'),

  body('salary')
    .notEmpty().withMessage('Salary is required')
    .isFloat({ min: 0.01, max: 9999999.99 }).withMessage('Salary must be a positive number up to 9,999,999.99'),

  body('hireDate')
    .notEmpty().withMessage('Hire date is required')
    .isDate().withMessage('Hire date must be a valid date (YYYY-MM-DD)')
    .custom((val) => {
      if (new Date(val) > new Date()) throw new Error('Hire date cannot be in the future');
      return true;
    }),

  body('departmentId')
    .notEmpty().withMessage('Department is required')
    .isInt({ min: 1 }).withMessage('Department ID must be a positive integer'),

  body('roleId')
    .notEmpty().withMessage('Role is required')
    .isInt({ min: 1 }).withMessage('Role ID must be a positive integer'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('authRole')
    .optional()
    .isIn(['ADMIN', 'MANAGER', 'EMPLOYEE']).withMessage('Auth role must be ADMIN, MANAGER, or EMPLOYEE'),
];

const updateEmployeeRules = [
  param('id').isInt({ min: 1 }).withMessage('Employee ID must be a positive integer'),

  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2–50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name contains invalid characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2–50 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('salary')
    .optional()
    .isFloat({ min: 0.01, max: 9999999.99 }).withMessage('Salary must be a positive number'),

  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']).withMessage('Invalid status value'),

  body('departmentId')
    .optional()
    .isInt({ min: 1 }).withMessage('Department ID must be a positive integer'),

  body('roleId')
    .optional()
    .isInt({ min: 1 }).withMessage('Role ID must be a positive integer'),
];

module.exports = { createEmployeeRules, updateEmployeeRules };
