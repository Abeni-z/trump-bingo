const express = require('express');
const { Shop, TopupTransaction, AppSetting } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');
const { hasStoredScreenshot, hexToDataUrl } = require('../utils/screenshot');

const router = express.Router();

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// Helper: get conversion rate
async function getConversionRate() {
  const setting = await AppSetting.findByPk('conversion_rate');
  return setting ? parseFloat(setting.value) : 10; // default 1 ETB = 10 credits
}

// ===== SETTINGS =====

// GET /api/admin/settings/conversion-rate
router.get('/settings/conversion-rate', async (req, res) => {
  try {
    const rate = await getConversionRate();
    res.json({ conversionRate: rate });
  } catch (err) {
    console.error('Get conversion rate error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/settings/conversion-rate
router.put('/settings/conversion-rate', async (req, res) => {
  try {
    const { rate } = req.body;
    if (!rate || isNaN(parseFloat(rate)) || parseFloat(rate) <= 0) {
      return res.status(400).json({ error: 'Valid positive rate is required' });
    }

    await AppSetting.upsert({ key: 'conversion_rate', value: String(rate) });

    res.json({ conversionRate: parseFloat(rate), message: 'Conversion rate updated' });
  } catch (err) {
    console.error('Update conversion rate error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== SHOP MANAGEMENT =====

// GET /api/admin/shops — List all shops
router.get('/shops', async (req, res) => {
  try {
    const shops = await Shop.findAll({
      attributes: ['id', 'shop_name', 'username', 'phone', 'is_active', 'pending_credits', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    res.json(shops.map(s => ({
      ...s.toJSON(),
      pending_credits: parseFloat(s.pending_credits) || 0
    })));
  } catch (err) {
    console.error('List shops error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/shops/:id/toggle — Toggle shop active/kill
router.put('/shops/:id/toggle', async (req, res) => {
  try {
    const shop = await Shop.findByPk(req.params.id);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    shop.is_active = !shop.is_active;
    await shop.save();

    res.json({
      id: shop.id,
      shop_name: shop.shop_name,
      is_active: shop.is_active,
      message: shop.is_active ? 'Shop activated' : 'Shop deactivated (killed)'
    });
  } catch (err) {
    console.error('Toggle shop error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/shops/:id/balance — Update shop pending_credits
router.put('/shops/:id/balance', async (req, res) => {
  try {
    const { balance } = req.body;
    if (balance === undefined || isNaN(parseFloat(balance))) {
      return res.status(400).json({ error: 'Valid amount to add is required' });
    }

    const shop = await Shop.findByPk(req.params.id);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const previousCredits = parseFloat(shop.pending_credits || 0);
    shop.pending_credits = previousCredits + parseFloat(balance);
    await shop.save();
    console.log(`[ADMIN-BALANCE] Shop ${shop.id}: added ${balance}, was ${previousCredits}, now ${shop.pending_credits}`);

    res.json({
      id: shop.id,
      shop_name: shop.shop_name,
      pending_credits: parseFloat(shop.pending_credits),
      message: 'Credits added successfully'
    });
  } catch (err) {
    console.error('Add credits error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/shops/:id — Delete a shop
router.delete('/shops/:id', async (req, res) => {
  try {
    const shop = await Shop.findByPk(req.params.id);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    await TopupTransaction.destroy({ where: { shop_id: shop.id } });
    await shop.destroy();

    res.json({ message: 'Shop deleted successfully' });
  } catch (err) {
    console.error('Delete shop error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/shops/:id/report — Override game report stats for a specific shop
// Stores per-shop overrides in app_settings as JSON: key = "report_override:<shopId>"
// Client reads this via GET /api/shop/report-override and merges into local stats.
router.put('/shops/:id/report', async (req, res) => {
  try {
    const { totalRounds, totalPayout, totalIncome } = req.body;
    const shop = await Shop.findByPk(req.params.id);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    // Validate provided fields
    const override = {};
    if (totalRounds !== undefined) {
      const v = parseInt(totalRounds);
      if (isNaN(v) || v < 0) return res.status(400).json({ error: 'totalRounds must be a non-negative integer' });
      override.totalRounds = v;
    }
    if (totalPayout !== undefined) {
      const v = parseFloat(totalPayout);
      if (isNaN(v) || v < 0) return res.status(400).json({ error: 'totalPayout must be a non-negative number' });
      override.totalPayout = v;
    }
    if (totalIncome !== undefined) {
      const v = parseFloat(totalIncome);
      if (isNaN(v) || v < 0) return res.status(400).json({ error: 'totalIncome must be a non-negative number' });
      override.totalIncome = v;
    }

    if (Object.keys(override).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const settingKey = `report_override:${shop.id}`;

    // Merge with existing override (so partial updates don't clear other fields)
    const existing = await AppSetting.findByPk(settingKey);
    const existingData = existing ? JSON.parse(existing.value) : {};
    const merged = { ...existingData, ...override };

    await AppSetting.upsert({ key: settingKey, value: JSON.stringify(merged) });

    console.log(`[REPORT-OVERRIDE] Shop ${shop.id} (${shop.shop_name}): set override`, merged);
    res.json({ shopId: shop.id, override: merged, message: 'Report override saved' });
  } catch (err) {
    console.error('Report override error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== TOP-UP MANAGEMENT =====

// GET /api/admin/topups — List all top-up requests
router.get('/topups', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const conversionRate = await getConversionRate();

    const topups = await TopupTransaction.findAll({
      where,
      include: [{
        model: Shop,
        as: 'shop',
        attributes: ['id', 'shop_name', 'username', 'phone', 'pending_credits']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json(topups.map(t => ({
      id: t.id,
      amount: parseFloat(t.amount),
      credits: t.credits_added !== null ? parseFloat(t.credits_added) : Math.round(parseFloat(t.amount) * conversionRate),
      bank: t.bank,
      has_screenshot: hasStoredScreenshot(t.screenshot, t.screenshot_mime),
      status: t.status,
      admin_note: t.admin_note,
      created_at: t.created_at,
      shop: t.shop ? {
        id: t.shop.id,
        shop_name: t.shop.shop_name,
        username: t.shop.username,
        phone: t.shop.phone,
        pending_credits: parseFloat(t.shop.pending_credits) || 0
      } : null
    })));
  } catch (err) {
    console.error('List topups error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/topups/:id/screenshot — Fetch screenshot from database
router.get('/topups/:id/screenshot', async (req, res) => {
  try {
    const topup = await TopupTransaction.findByPk(req.params.id);

    if (!topup) {
      return res.status(404).json({ error: 'Top-up not found' });
    }

    if (!hasStoredScreenshot(topup.screenshot, topup.screenshot_mime)) {
      return res.status(404).json({ error: 'No screenshot for this top-up' });
    }

    res.json({
      mime: topup.screenshot_mime,
      data_url: hexToDataUrl(topup.screenshot, topup.screenshot_mime)
    });
  } catch (err) {
    console.error('Get admin topup screenshot error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/topups/:id/approve — Approve a top-up
router.put('/topups/:id/approve', async (req, res) => {
  try {
    const { admin_note, credits_override } = req.body;
    const topup = await TopupTransaction.findByPk(req.params.id);
    if (!topup) return res.status(404).json({ error: 'Top-up request not found' });

    if (topup.status !== 'pending') {
      return res.status(400).json({ error: `Cannot approve — already ${topup.status}` });
    }

    const conversionRate = await getConversionRate();
    const creditsToAdd = credits_override !== undefined
      ? parseFloat(credits_override)
      : Math.round(parseFloat(topup.amount) * conversionRate);

    topup.status = 'approved';
    topup.admin_note = admin_note || null;
    topup.credits_added = creditsToAdd;
    await topup.save();

    const shop = await Shop.findByPk(topup.shop_id);
    if (shop) {
      const prevCredits = parseFloat(shop.pending_credits || 0);
      shop.pending_credits = prevCredits + creditsToAdd;
      await shop.save();
      console.log(`[TOPUP-APPROVE] Shop ${shop.id}: added ${creditsToAdd}, was ${prevCredits}, now ${shop.pending_credits}`);
    }

    res.json({
      id: topup.id,
      status: topup.status,
      amount: parseFloat(topup.amount),
      credits_added: creditsToAdd,
      shop_new_pending_credits: shop ? parseFloat(shop.pending_credits) : null,
      message: 'Top-up approved and credits added to pending'
    });
  } catch (err) {
    console.error('Approve topup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/topups/:id/reject — Reject a top-up
router.put('/topups/:id/reject', async (req, res) => {
  try {
    const { admin_note } = req.body;
    const topup = await TopupTransaction.findByPk(req.params.id);
    if (!topup) return res.status(404).json({ error: 'Top-up request not found' });

    if (topup.status !== 'pending') {
      return res.status(400).json({ error: `Cannot reject — already ${topup.status}` });
    }

    topup.status = 'rejected';
    topup.admin_note = admin_note || null;
    await topup.save();

    res.json({
      id: topup.id,
      status: topup.status,
      message: 'Top-up rejected'
    });
  } catch (err) {
    console.error('Reject topup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== DASHBOARD STATS =====

router.get('/stats', async (req, res) => {
  try {
    const totalShops = await Shop.count();
    const activeShops = await Shop.count({ where: { is_active: true } });
    const inactiveShops = await Shop.count({ where: { is_active: false } });
    const pendingTopups = await TopupTransaction.count({ where: { status: 'pending' } });
    const approvedTopups = await TopupTransaction.count({ where: { status: 'approved' } });
    const rejectedTopups = await TopupTransaction.count({ where: { status: 'rejected' } });
    const conversionRate = await getConversionRate();

    const { sequelize } = require('../models');
    const [result] = await sequelize.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM topup_transactions WHERE status = 'approved'`
    );
    const totalApprovedAmount = parseFloat(result[0].total) || 0;

    res.json({
      totalShops,
      activeShops,
      inactiveShops,
      pendingTopups,
      approvedTopups,
      rejectedTopups,
      totalApprovedAmount,
      conversionRate
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
