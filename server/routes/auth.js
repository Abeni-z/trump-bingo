const express = require('express');
const bcrypt = require('bcryptjs');
const { Shop, Admin } = require('../models');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register — Register a new shop
router.post('/register', async (req, res) => {
  try {
    const { shop_name, username, password, phone } = req.body;

    if (!shop_name || !username || !password || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if username or shop_name already exists
    const existingUser = await Shop.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const existingShop = await Shop.findOne({ where: { shop_name } });
    if (existingShop) {
      return res.status(400).json({ error: 'Shop name already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const shop = await Shop.create({
      shop_name,
      username,
      password: hashedPassword,
      phone
    });

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

    const token = generateToken({ id: shop.id, username: shop.username, role: 'shop' });

    res.json({
      token,
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

    const token = generateToken({ id: admin.id, username: admin.username, role: 'admin' });

    res.json({
      token,
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

module.exports = router;
