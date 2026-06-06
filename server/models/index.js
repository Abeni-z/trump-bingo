const sequelize = require('../config/database');
const Shop = require('./Shop');
const Admin = require('./Admin');
const TopupTransaction = require('./TopupTransaction');
const AppSetting = require('./AppSetting');

// Associations
Shop.hasMany(TopupTransaction, { foreignKey: 'shop_id', as: 'topups' });
TopupTransaction.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });

module.exports = {
  sequelize,
  Shop,
  Admin,
  TopupTransaction,
  AppSetting
};
