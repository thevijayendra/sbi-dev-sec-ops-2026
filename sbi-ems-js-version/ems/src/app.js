'use strict';

require('dotenv').config();

const express        = require('express');
const helmet         = require('helmet');
const cors           = require('cors');
const morgan         = require('morgan');
const swaggerUi      = require('swagger-ui-express');
const swaggerSpec    = require('./config/swagger');
const errorHandler   = require('./middleware/errorHandler');
const { logger }     = require('./config/logger');

// ── Route imports ─────────────────────────────────────────────────────────
const authRoutes       = require('./routes/authRoutes');
const employeeRoutes   = require('./routes/employeeRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const roleRoutes       = require('./routes/roleRoutes');
const projectRoutes    = require('./routes/projectRoutes');

const app = express();

// ── Security headers (DevSecOps Module 1 — A05 Misconfiguration) ──────────
// helmet sets: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, and more
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      frameAncestors: ["'none'"],
      // Allow Swagger UI inline scripts in non-production
      scriptSrc: process.env.NODE_ENV === 'production'
        ? ["'self'"]
        : ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// Remove Express fingerprinting header
app.disable('x-powered-by');

// ── CORS (DevSecOps Module 1 — A05 Misconfiguration) ─────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3001').split(',');
app.use(cors({
  origin:  process.env.NODE_ENV === 'production' ? allowedOrigins : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Request logging ───────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Health endpoint (public — no auth required) ───────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// ── Swagger UI (disabled in production) ───────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
  logger.info('Swagger UI available at http://localhost:3000/api-docs');
}

// ── API routes ────────────────────────────────────────────────────────────
app.use('/api/v1/auth',        authRoutes);
app.use('/api/v1/employees',   employeeRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/roles',       roleRoutes);
app.use('/api/v1/projects',    projectRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Global error handler (must be last) ───────────────────────────────────
// DevSecOps Module 1 — A05/A09: never leak internals; always log with correlation ID
app.use(errorHandler);

// ── Server startup ────────────────────────────────────────────────────────
if (require.main === module) {
  const { sequelize } = require('./models');
  const PORT = parseInt(process.env.PORT || '3000', 10);

  (async () => {
    try {
      await sequelize.authenticate();
      logger.info('Database connection established');

      // Sync models in development; use migrations in production
      if (process.env.NODE_ENV !== 'production') {
        await sequelize.sync({ alter: true });
        logger.info('Database models synchronised');
      }

      app.listen(PORT, () => {
        logger.info(`EMS API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      });
    } catch (err) {
      logger.error('Failed to start server:', err);
      process.exit(1);
    }
  })();
}

module.exports = app;
