'use strict';

const { DataTypes } = require('sequelize');
const sequelize      = require('../config/database');

const Role = sequelize.define('Role', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  name: {
    type:      DataTypes.STRING(100),
    allowNull: false,
    unique:    true,
    validate:  { notEmpty: true },
  },
  description: {
    type:      DataTypes.STRING(500),
    allowNull: true,
  },
  level: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    validate:  { min: 1, max: 10 },
    comment:   '1 = Junior, 5 = Lead, 10 = Principal',
  },
}, {
  tableName:  'Roles',
  timestamps: true,
});

module.exports = Role;
