'use strict';

const sequelize      = require('../config/database');
const Employee       = require('./Employee');
const Department     = require('./Department');
const Role           = require('./Role');
const Project        = require('./Project');
const EmployeeProject = require('./EmployeeProject');

// ── Associations ──────────────────────────────────────────────────────────

// Employee →  Department  (Many-to-One)
Employee.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(Employee,   { foreignKey: 'departmentId', as: 'employees' });

// Employee →  Role  (Many-to-One)
Employee.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(Employee,   { foreignKey: 'roleId', as: 'employees' });

// Employee ↔  Project  (Many-to-Many via EmployeeProject)
Employee.belongsToMany(Project,  { through: EmployeeProject, foreignKey: 'employeeId', as: 'projects' });
Project.belongsToMany(Employee,  { through: EmployeeProject, foreignKey: 'projectId',  as: 'employees' });

module.exports = { sequelize, Employee, Department, Role, Project, EmployeeProject };
