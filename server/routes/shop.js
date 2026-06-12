const express = require('express');
const { Shop, AppSetting } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/shop/me — Get current shop profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const shop = await Shop.findByPk(req.user.id);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    if (!shop.is_active) {
      return res.status(403).json({ error: 'Shop deactivated', deactivated: true });
    }

    res.json({
      id: shop.id,
      shop_name: shop.shop_name,
      username: shop.username,
      phone: shop.phone,
      pending_credits: parseFloat(shop.pending_credits) || 0,
      is_active: shop.is_active
    });
  } catch (err) {
    console.error('Get shop error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/shop/claim-credits — Atomically read and clear pending credits
// Uses SELECT FOR UPDATE inside a transaction so concurrent requests
// are serialized — only one request can read the credits before they're zeroed
router.post('/claim-credits', authMiddleware, async (req, res) => {
  console.log(`[CLAIM-CREDITS] Request from shop ${req.user.id} at ${new Date().toISOString()}`);
  try {
    const sequelize = require('../config/database');
    
    const result = await sequelize.transaction(async (t) => {
      // Lock the row — any concurrent request will WAIT here
      const [rows] = await sequelize.query(
        `SELECT "pending_credits", "is_active" FROM "shops" WHERE "id" = :shopId FOR UPDATE`,
        { replacements: { shopId: req.user.id }, transaction: t }
      );

      if (!rows || rows.length === 0) {
        throw { status: 404, message: 'Shop not found' };
      }
      if (!rows[0].is_active) {
        throw { status: 403, message: 'Shop deactivated', deactivated: true };
      }

      const credits = parseFloat(rows[0].pending_credits) || 0;

      if (credits > 0) {
        await sequelize.query(
          `UPDATE "shops" SET "pending_credits" = 0, "updated_at" = NOW() WHERE "id" = :shopId`,
          { replacements: { shopId: req.user.id }, transaction: t }
        );
      }

      return credits;
    });

    console.log(`[CLAIM-CREDITS] Returning ${result} credits for shop ${req.user.id}`);
    res.json({ pending_credits: result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, deactivated: err.deactivated });
    }
    console.error('Claim pending credits error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/shop/report-override — Fetch admin-set report override for this shop
// Returns { totalRounds, totalPayout, totalIncome } (only the fields admin has set)
router.get('/report-override', authMiddleware, async (req, res) => {
  try {
    const settingKey = `report_override:${req.user.id}`;
    const setting = await AppSetting.findByPk(settingKey);
    if (!setting) return res.json({});
    const override = JSON.parse(setting.value);
    res.json(override);
  } catch (err) {
    console.error('Report override fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
