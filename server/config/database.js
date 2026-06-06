require('dotenv').config();
const { Sequelize } = require('sequelize');

const useSsl = process.env.DB_SSL !== 'false';

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      dialectOptions: useSsl ? {
        ssl: { require: true, rejectUnauthorized: false }
      } : {},
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    })
  : new Sequelize(
      process.env.DB_NAME || 'postgres',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: process.env.DB_LOGGING === 'true' ? console.log : false,
        dialectOptions: useSsl ? {
          ssl: { require: true, rejectUnauthorized: false }
        } : {},
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    );

module.exports = sequelize;
