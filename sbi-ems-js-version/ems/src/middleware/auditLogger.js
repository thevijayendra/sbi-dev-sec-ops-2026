'use strict';

const { auditLogger } = require('../config/logger');

/**
 * Wraps res.json to detect when salary data is returned,
 * then writes a structured audit log entry.
 *
 * DevSecOps training note (A09 — Security Logging):
 *   RBI mandates audit trails for all PII access.
 *   Every read of salary data is recorded: who, which employee, when, from where.
 *
 * Usage: router.get('/:id', authenticate, auditSalaryAccess, controller)
 */
const auditSalaryAccess = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // Log when salary is present in response (single employee or array)
    const hasSalary = (obj) => obj && typeof obj === 'object' && 'salary' in obj;
    const salaryExposed =
      hasSalary(body) ||
      (Array.isArray(body) && body.some(hasSalary));

    if (salaryExposed) {
      auditLogger.info({
        event:      'SALARY_ACCESS',
        actor:      req.user?.email || 'unknown',
        actorId:    req.user?.id,
        actorRole:  req.user?.authRole,
        resourceId: req.params?.id || 'list',
        method:     req.method,
        path:       req.originalUrl,
        ip:         req.ip,
        timestamp:  new Date().toISOString(),
      });
    }

    return originalJson(body);
  };

  next();
};

module.exports = auditSalaryAccess;
