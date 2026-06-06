const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Shop = sequelize.define('Shop', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  shop_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  pending_credits: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  }
}, {
  tableName: 'shops',
  timestamps: true,
  underscored: true
});

module.exports = Shop;
