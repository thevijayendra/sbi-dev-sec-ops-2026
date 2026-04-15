'use strict';

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, json, colorize, simple } = format;

// Audit logger — writes salary access events to audit.log
const auditLogger = createLogger({
  level:  'info',
  format: combine(timestamp(), json()),
  transports: [
    new transports.File({ filename: 'audit.log' }),
  ],
});

// Application logger — console in dev, JSON file in production
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), json()),
  transports:
    process.env.NODE_ENV === 'production'
      ? [new transports.File({ filename: 'app.log' })]
      : [new transports.Console({ format: combine(colorize(), simple()) })],
});

module.exports = { logger, auditLogger };
