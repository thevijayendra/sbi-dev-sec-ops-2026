'use strict';

const jwt = require('jsonwebtoken');

/**
 * Verifies the Bearer JWT on every protected route.
 * Attaches req.user = { id, authRole, email } on success.
 *
 * DevSecOps training note (A07 — Auth Failures):
 *   - Token must be in the Authorization header, NEVER in the URL
 *   - Signing secret comes from process.env.JWT_SECRET (never hardcoded)
 *   - Short expiry enforced at sign-time (see authController)
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;           // { id, authRole, email, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authenticate;
