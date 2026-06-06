const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TopupTransaction = sequelize.define('TopupTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  shop_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'shops',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  bank: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  screenshot: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Payment screenshot stored as hexadecimal bytes'
  },
  screenshot_mime: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'approved', 'rejected']]
    }
  },
  admin_note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  credits_added: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'topup_transactions',
  timestamps: true,
  underscored: true
});

module.exports = TopupTransaction;
