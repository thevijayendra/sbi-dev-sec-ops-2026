'use strict';

const { DataTypes } = require('sequelize');
const sequelize      = require('../config/database');

const Project = sequelize.define('Project', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  name: {
    type:      DataTypes.STRING(150),
    allowNull: false,
    unique:    true,
    validate:  { notEmpty: true, len: [2, 150] },
  },
  description: {
    type:      DataTypes.TEXT,
    allowNull: true,
    validate:  { len: [0, 500] },
  },
  startDate: {
    type:      DataTypes.DATEONLY,
    allowNull: false,
    validate:  { isDate: true },
  },
  endDate: {
    type:      DataTypes.DATEONLY,
    allowNull: true,
    validate:  {
      isDate: true,
      isAfterStart(v) {
        if (v && this.startDate && new Date(v) <= new Date(this.startDate))
          throw new Error('End date must be after start date');
      },
    },
  },
  status: {
    type:         DataTypes.ENUM('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'),
    allowNull:    false,
    defaultValue: 'PLANNED',
  },
}, {
  tableName:  'Projects',
  timestamps: true,
});

module.exports = Project;
