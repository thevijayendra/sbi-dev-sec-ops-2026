'use strict';

/**
 * Role-Based Access Control middleware.
 * Usage: router.get('/...', authenticate, authorize('ADMIN'), handler)
 *
 * DevSecOps training note (A01 — Broken Access Control):
 *   Authorization is enforced at the route level AND inside controllers
 *   (defence in depth). Never rely on a single layer.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.authRole)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};

module.exports = authorize;
