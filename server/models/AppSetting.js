const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AppSetting = sequelize.define('AppSetting', {
  key: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  value: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'app_settings',
  timestamps: true,
  underscored: true
});

module.exports = AppSetting;
