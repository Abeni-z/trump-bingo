require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

// Routes
const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shop');
const topupRoutes = require('./routes/topup');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim().replace(/^["']|["']$/g, ''))
  .filter(Boolean);

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
// Screenshots are sent as hex in JSON (up to ~5MB image)
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/topup', topupRoutes);
app.use('/api/admin', adminRoutes);

// Public: conversion rate (no auth needed)
app.get('/api/conversion-rate', async (req, res) => {
  try {
    const { AppSetting } = require('./models');
    const setting = await AppSetting.findByPk('conversion_rate');
    const rate = setting ? parseFloat(setting.value) : 10;
    res.json({ conversionRate: rate });
  } catch (err) {
    res.json({ conversionRate: 10 }); // fallback default
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Alter app_settings table columns to avoid key/value truncation/errors
    try {
      await sequelize.query('ALTER TABLE app_settings ALTER COLUMN key TYPE VARCHAR(255);');
      await sequelize.query('ALTER TABLE app_settings ALTER COLUMN value TYPE TEXT;');
      console.log('✅ app_settings columns altered successfully');
    } catch (dbErr) {
      console.log('⚠️ Could not alter app_settings columns (might already be altered or SQLite/other DB):', dbErr.message);
    }

    // Production: tables already exist in Supabase — do not alter (enum casts fail).
    // Development: allow alter for local schema tweaks.
    if (process.env.NODE_ENV === 'production') {
      console.log('✅ Production mode — skipping sequelize.sync()');
    } else {
      await sequelize.sync({ alter: true });
      console.log('✅ Tables synced');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
