'use strict';

const { DataTypes } = require('sequelize');
const sequelize      = require('../config/database');

const EmployeeProject = sequelize.define('EmployeeProject', {
  employeeId: {
    type:       DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'Employees', key: 'id' },
  },
  projectId: {
    type:       DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'Projects', key: 'id' },
  },
  assignedDate: {
    type:         DataTypes.DATEONLY,
    allowNull:    false,
    defaultValue: DataTypes.NOW,
  },
  projectRole: {
    type:      DataTypes.STRING(100),
    allowNull: false,
    comment:   'Role on this specific project — e.g. Tech Lead, QA',
  },
}, {
  tableName:  'EmployeeProjects',
  timestamps: false,
});

module.exports = EmployeeProject;
