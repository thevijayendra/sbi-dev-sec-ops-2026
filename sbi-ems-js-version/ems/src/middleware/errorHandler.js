'use strict';

const { v4: uuidv4 }      = require('uuid');
const { logger }           = require('../config/logger');

/**
 * Global Express error handler — must be registered last in app.js.
 *
 * DevSecOps training note (A05 — Security Misconfiguration / A09 — Logging):
 *   - Stack traces and internal paths are NEVER sent to the client.
 *   - Every error is logged internally with a correlation ID.
 *   - The correlation ID is returned to the client for support tracing.
 *
 * RBI IT Framework §3.2: error messages must not disclose system internals.
 */
const errorHandler = (err, req, res, next) => {  // eslint-disable-line no-unused-vars
  const correlationId = uuidv4();

  // Always log full detail internally
  logger.error({
    correlationId,
    method:     req.method,
    url:        req.originalUrl,
    statusCode: err.statusCode || 500,
    message:    err.message,
    stack:      err.stack,
  });

  // Validation / known client errors — safe to return detail
  if (err.statusCode === 400 || err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: err.message || 'Validation failed',
      errors:  err.errors?.map(e => e.message),
    });
  }

  if (err.statusCode === 404) {
    return res.status(404).json({ message: err.message || 'Not found' });
  }

  if (err.statusCode === 409) {
    return res.status(409).json({ message: err.message });
  }

  if (err.statusCode === 422) {
    return res.status(422).json({ message: err.message });
  }

  // All other errors — NEVER expose internals to the client
  res.status(500).json({
    message:       'An internal error occurred.',
    correlationId, // matches internal log entry — safe to share with support
  });
};

module.exports = errorHandler;
