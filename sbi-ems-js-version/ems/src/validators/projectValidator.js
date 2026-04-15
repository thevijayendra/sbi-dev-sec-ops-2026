'use strict';

const { body, param, query } = require('express-validator');

const createProjectRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Project name is required')
    .isLength({ min: 2, max: 150 }).withMessage('Project name must be 2–150 characters'),

  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),

  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isDate().withMessage('Start date must be a valid date (YYYY-MM-DD)'),

  body('endDate')
    .optional({ nullable: true })
    .isDate().withMessage('End date must be a valid date (YYYY-MM-DD)')
    .custom((val, { req }) => {
      if (val && req.body.startDate && new Date(val) <= new Date(req.body.startDate))
        throw new Error('End date must be after start date');
      return true;
    }),
];

const updateProjectRules = [
  param('id').isInt({ min: 1 }).withMessage('Project ID must be a positive integer'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 }).withMessage('Project name must be 2–150 characters'),

  body('status')
    .optional()
    .isIn(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .withMessage('Invalid status value'),

  body('endDate')
    .optional({ nullable: true })
    .isDate().withMessage('End date must be a valid date'),
];

const assignEmployeeRules = [
  param('id').isInt({ min: 1 }).withMessage('Project ID must be a positive integer'),

  body('employeeId')
    .notEmpty().withMessage('Employee ID is required')
    .isInt({ min: 1 }).withMessage('Employee ID must be a positive integer'),

  body('projectRole')
    .trim()
    .notEmpty().withMessage('Project role is required')
    .isLength({ max: 100 }).withMessage('Project role must be at most 100 characters'),

  body('assignedDate')
    .optional()
    .isDate().withMessage('Assigned date must be a valid date'),
];

const filterProjectRules = [
  query('status')
    .optional()
    .isIn(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .withMessage('Invalid status filter value'),
];

module.exports = { createProjectRules, updateProjectRules, assignEmployeeRules, filterProjectRules };
