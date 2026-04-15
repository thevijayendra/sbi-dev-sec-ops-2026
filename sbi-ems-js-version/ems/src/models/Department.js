'use strict';

const { DataTypes } = require('sequelize');
const sequelize      = require('../config/database');

const Department = sequelize.define('Department', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  name: {
    type:      DataTypes.STRING(100),
    allowNull: false,
    unique:    true,
    validate:  { notEmpty: true, len: [2, 100] },
  },
  description: {
    type:      DataTypes.STRING(500),
    allowNull: true,
  },
}, {
  tableName:  'Departments',
  timestamps: true,
});

module.exports = Department;
