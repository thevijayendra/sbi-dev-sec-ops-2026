'use strict';

const { DataTypes } = require('sequelize');
const sequelize      = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  firstName: {
    type:      DataTypes.STRING(50),
    allowNull: false,
    validate:  { notEmpty: true, len: [2, 50] },
  },
  lastName: {
    type:      DataTypes.STRING(50),
    allowNull: false,
    validate:  { notEmpty: true, len: [2, 50] },
  },
  email: {
    type:      DataTypes.STRING(255),
    allowNull: false,
    unique:    true,
    validate:  { isEmail: true },
    comment:   'Used as login identity; PII',
  },
  phone: {
    type:      DataTypes.STRING(20),
    allowNull: true,
  },
  // PII — access-controlled; only ADMIN or self may see this field
  salary: {
    type:      DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate:  { min: 0.01, max: 9999999.99 },
    comment:   'PII — masked for non-admin callers',
  },
  passwordHash: {
    type:      DataTypes.STRING(255),
    allowNull: false,
  },
  hireDate: {
    type:      DataTypes.DATEONLY,
    allowNull: false,
    validate:  {
      isDate:         true,
      isNotFuture(v) {
        if (new Date(v) > new Date())
          throw new Error('Hire date cannot be in the future');
      },
    },
  },
  status: {
    type:         DataTypes.ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'),
    allowNull:    false,
    defaultValue: 'ACTIVE',
  },
  authRole: {
    type:         DataTypes.ENUM('ADMIN', 'MANAGER', 'EMPLOYEE'),
    allowNull:    false,
    defaultValue: 'EMPLOYEE',
    comment:      'JWT auth role — separate from the org-level Role entity',
  },
  departmentId: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    references: { model: 'Departments', key: 'id' },
  },
  roleId: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    references: { model: 'Roles', key: 'id' },
  },
}, {
  tableName:  'Employees',
  timestamps: true,
});

module.exports = Employee;
