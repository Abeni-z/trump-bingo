const express = require('express');
const { TopupTransaction } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { validateScreenshotHex, hasStoredScreenshot, hexToDataUrl } = require('../utils/screenshot');

const router = express.Router();

function formatTopup(t, { includeScreenshot = false } = {}) {
  const payload = {
    id: t.id,
    amount: parseFloat(t.amount),
    credits: t.credits_added !== null ? parseFloat(t.credits_added) : null,
    bank: t.bank,
    has_screenshot: hasStoredScreenshot(t.screenshot, t.screenshot_mime),
    status: t.status,
    admin_note: t.admin_note,
    created_at: t.created_at
  };

  if (includeScreenshot && payload.has_screenshot) {
    payload.screenshot_data_url = hexToDataUrl(t.screenshot, t.screenshot_mime);
  }

  return payload;
}

// POST /api/topup — Submit a top-up request (screenshot as hex in JSON body)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { amount, bank, screenshot_hex, screenshot_mime } = req.body;

    if (!amount || !bank) {
      return res.status(400).json({ error: 'Amount and bank are required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const screenshotCheck = validateScreenshotHex(screenshot_hex, screenshot_mime);
    if (!screenshotCheck.valid) {
      return res.status(400).json({ error: screenshotCheck.error });
    }

    const topup = await TopupTransaction.create({
      shop_id: req.user.id,
      amount: parsedAmount,
      bank,
      screenshot: screenshotCheck.hex,
      screenshot_mime: screenshotCheck.mime,
      status: 'pending'
    });

    res.status(201).json(formatTopup(topup));
  } catch (err) {
    console.error('Top-up submit error:', err);
    res.status(500).json({ error: 'Server error during top-up submission' });
  }
});

// GET /api/topup/my — Get my top-up requests
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const topups = await TopupTransaction.findAll({
      where: { shop_id: req.user.id },
      order: [['created_at', 'DESC']]
    });

    res.json(topups.map((t) => formatTopup(t)));
  } catch (err) {
    console.error('Get topups error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/topup/:id/screenshot — Shop views own screenshot
router.get('/:id/screenshot', authMiddleware, async (req, res) => {
  try {
    const topup = await TopupTransaction.findOne({
      where: { id: req.params.id, shop_id: req.user.id }
    });

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
    console.error('Get topup screenshot error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
