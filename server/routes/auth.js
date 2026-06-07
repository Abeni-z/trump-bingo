const express = require('express');
const bcrypt = require('bcryptjs');
const { Shop, Admin } = require('../models');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register — Register a new shop
router.post('/register', async (req, res) => {
  try {
    const { shop_name, username, password, phone } = req.body;

    if (!shop_name || !username || !password || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await Shop.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const existingShop = await Shop.findOne({ where: { shop_name } });
    if (existingShop) {
      return res.status(400).json({ error: 'Shop name already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await Shop.create({ shop_name, username, password: hashedPassword, phone });

    res.status(201).json({
      success: true,
      message: 'Shop registered successfully. Please wait for admin approval.'
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login — Login shop
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const shop = await Shop.findOne({ where: { username } });
    if (!shop) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!shop.is_active) {
      return res.status(403).json({ error: 'Your shop is pending admin approval or has been deactivated. Please contact admin.' });
    }

    const validPassword = await bcrypt.compare(password, shop.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = { id: shop.id, username: shop.username, role: 'shop' };
    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      token,
      refreshToken,
      shop: {
        id: shop.id,
        shop_name: shop.shop_name,
        username: shop.username,
        phone: shop.phone,
        pending_credits: parseFloat(shop.pending_credits) || 0,
        is_active: shop.is_active
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/auth/admin/login — Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ where: { username } });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = { id: admin.id, username: admin.username, role: 'admin' };
    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      token,
      refreshToken,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Server error during admin login' });
  }
});

// POST /api/auth/refresh — Get new access token using refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Make sure the user still exists and is still active
    if (decoded.role === 'shop') {
      const shop = await Shop.findByPk(decoded.id);
      if (!shop || !shop.is_active) {
        return res.status(401).json({ error: 'Shop not found or deactivated' });
      }
    } else if (decoded.role === 'admin') {
      const admin = await Admin.findByPk(decoded.id);
      if (!admin) {
        return res.status(401).json({ error: 'Admin not found' });
      }
    }

    // Issue new access token and rotate refresh token
    const payload = { id: decoded.id, username: decoded.username, role: decoded.role };
    const newToken = generateToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Server error during token refresh' });
  }
});

module.exports = router;
