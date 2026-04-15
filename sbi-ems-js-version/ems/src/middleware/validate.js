'use strict';

const { validationResult } = require('express-validator');

/**
 * Collects express-validator errors and returns a 400 if any exist.
 * Place after the validator rule arrays in every route:
 *   router.post('/', [...rules], validate, controller)
 *
 * DevSecOps training note (A03 — Injection / Input Validation):
 *   Every user-supplied field must be validated before reaching the service layer.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = validate;
