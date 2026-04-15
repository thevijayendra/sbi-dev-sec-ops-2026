# SBI Employee Management System (EMS)

> **DevSecOps Training Project — State Bank of India**
> Node.js · Express.js · Sequelize · MySQL · JWT · Swagger

---

## Overview

EMS is the backbone hands-on project for the SBI DevSecOps Intermediate training programme. It is a fully functional REST API covering employees, departments, roles, and project assignments — with intentional security vulnerabilities baked in at strategic points for the labs.

---

## Quick Start

### Prerequisites

- Node.js 20 LTS
- Docker Desktop (WSL2 backend on Windows)
- MySQL 8.x (or use the included `docker-compose.yml`)

### 1. Clone and install

```bash
git clone https://github.com/sbi-training/ems.git
cd ems
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in DB_PASSWORD and JWT_SECRET
# Generate a strong JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start with Docker Compose (recommended for labs)

```bash
docker compose up -d
# API available at http://localhost:3000
# Swagger UI at http://localhost:3000/api-docs
```

### 4. Start locally (without Docker)

```bash
# Ensure MySQL is running and .env is configured
npm run dev      # nodemon with hot-reload
```

---

## API Reference

Swagger UI: **http://localhost:3000/api-docs**
OpenAPI JSON: **http://localhost:3000/api-docs.json**

| Resource | Base Path |
|---|---|
| Auth | `/api/v1/auth` |
| Employees | `/api/v1/employees` |
| Departments | `/api/v1/departments` |
| Roles | `/api/v1/roles` |
| Projects | `/api/v1/projects` |

### Authentication

All endpoints except `POST /api/v1/auth/login` require a JWT Bearer token.

```bash
# Get a token
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sbi.com","password":"Admin@123"}'

# Use the token
curl -s http://localhost:3000/api/v1/employees \
  -H "Authorization: Bearer <token>"
```

### Default Seed Credentials (development only)

| Email | Password | Role |
|---|---|---|
| admin@sbi.com | Admin@123 | ADMIN |
| manager@sbi.com | Manager@123 | MANAGER |
| employee@sbi.com | Employee@123 | EMPLOYEE |

> ⚠️ These credentials exist only in the development seed. Never use them in any other environment.

---

## Running Tests

```bash
npm test                    # run all tests
npm run test:coverage       # with coverage report (required for SonarQube)
```

Coverage report is written to `coverage/` — the `lcov.info` file is consumed by SonarQube.

---

## DevSecOps Lab Reference

### Lab 1 — SAST Scan (SonarQube)

```bash
# 1. Generate coverage
npm run test:coverage

# 2. Run SonarQube scan (trainer provides SONAR_IP and TOKEN)
npx sonar-scanner \
  -Dsonar.host.url=http://SONAR_IP:9000 \
  -Dsonar.token=YOUR_TOKEN
```

### Lab 2 — DAST Scan (OWASP ZAP)

```bash
# 1. Start EMS
docker compose up -d

# 2. In ZAP: Import > OpenAPI from URL
#    URL: http://localhost:3000/api-docs.json

# 3. Get JWT for authenticated scanning
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sbi.com","password":"Admin@123"}'
```

### Lab 3 — Container Scan (Trivy)

```bash
# Build insecure image
docker build -f Dockerfile.insecure -t ems:insecure .
trivy image --severity HIGH,CRITICAL ems:insecure

# Build hardened image
docker build -f Dockerfile.secure -t ems:secure .
trivy image --severity HIGH,CRITICAL ems:secure

# Compare image sizes
docker images | grep ems

# Scan Dockerfile for misconfigurations
trivy config ./Dockerfile.secure
```

### Lab 4 — IaC Scan (Checkov)

```bash
cd terraform/ems

# Scan with built-in policies
checkov -d . --compact

# Scan with custom SBI policy (Multi-AZ check)
checkov -d . --external-checks-dir ../../custom_policies --compact

# After fixing misconfigurations, re-scan to confirm 0 failures
checkov -d . --compact
```

### Capstone Lab — Introduce and Fix SQL Injection

The following code is the intentionally vulnerable endpoint used in the Capstone Lab.
Add it to `src/routes/employeeRoutes.js`, run the full pipeline, observe SAST catching it,
then fix and re-run.

```javascript
// ⚠️  VULNERABLE — add this for the Capstone Lab only
router.get('/search', authenticate, async (req, res, next) => {
  try {
    const { dept } = req.query;
    const { sequelize } = require('../models');
    const [results] = await sequelize.query(
      `SELECT * FROM Employees JOIN Departments
       ON Employees.departmentId = Departments.id
       WHERE Departments.name = '${dept}'`   // injection point
    );
    res.json(results);
  } catch (err) { next(err); }
});
```

---

## Project Structure

```
ems/
├── src/
│   ├── app.js                     # Express app + middleware setup
│   ├── config/
│   │   ├── database.js            # Sequelize connection
│   │   ├── logger.js              # Winston loggers (app + audit)
│   │   └── swagger.js             # OpenAPI spec generation
│   ├── models/
│   │   ├── index.js               # Model registry + associations
│   │   ├── Employee.js
│   │   ├── Department.js
│   │   ├── Role.js
│   │   ├── Project.js
│   │   └── EmployeeProject.js     # Join table
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── departmentRoutes.js
│   │   ├── roleRoutes.js
│   │   └── projectRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── employeeController.js
│   │   ├── departmentController.js
│   │   ├── roleController.js
│   │   └── projectController.js
│   ├── middleware/
│   │   ├── authenticate.js        # JWT verification
│   │   ├── authorize.js           # RBAC
│   │   ├── validate.js            # express-validator error handler
│   │   ├── errorHandler.js        # Global error handler
│   │   └── auditLogger.js         # PII access audit trail
│   └── validators/
│       ├── employeeValidator.js
│       └── projectValidator.js
├── tests/
│   ├── auth.test.js
│   ├── employee.test.js
│   └── project.test.js
├── terraform/
│   └── ems/
│       ├── main.tf                # ⚠️  Intentionally misconfigured (Lab 4)
│       └── main.tf.secure         # ✅  Reference solution for Lab 4
├── custom_policies/
│   └── CKV_SBI_001.py             # Custom Checkov policy — RBI Multi-AZ
├── .github/
│   └── workflows/
│       └── devsecops.yml          # Full CI/CD security pipeline
├── Dockerfile.insecure            # ⚠️  Intentionally insecure (Lab 3)
├── Dockerfile.secure              # ✅  Hardened production Dockerfile
├── docker-compose.yml
├── sonar-project.properties
├── .env.example
└── package.json
```

---

## Security Notes for Trainers

| File | Purpose |
|---|---|
| `Dockerfile.insecure` | Lab 3 target — 7 annotated security problems for participants to find |
| `Dockerfile.secure` | Lab 3 solution — multi-stage, non-root, `--omit=dev`, health check |
| `terraform/ems/main.tf` | Lab 4 target — 8 Checkov failures: open SG, public DB, unencrypted S3, no Multi-AZ |
| `terraform/ems/main.tf.secure` | Lab 4 reference solution — all misconfigs remediated |
| `custom_policies/CKV_SBI_001.py` | Lab 4 — example custom Checkov policy for RBI BCM requirement |
| `src/middleware/authenticate.js` | A07 training point — JWT secret via env var, token expiry enforced |
| `src/middleware/auditLogger.js` | A09 training point — salary access audit trail (RBI requirement) |
| `src/controllers/projectController.js` | A04 training point — project status state machine |
| `src/controllers/employeeController.js` | A01 training point — salary PII masked for non-admin callers |

---

*Confidential — For Training Purposes Only*
*DevSecOps Intermediate · State Bank of India · Technology Training Programme*
