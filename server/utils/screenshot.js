const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const HEX_PATTERN = /^[0-9a-fA-F]+$/;

function isLegacyScreenshotPath(value) {
  return typeof value === 'string' && value.startsWith('/uploads/');
}

function hasStoredScreenshot(screenshot, screenshotMime) {
  return Boolean(
    screenshot
    && screenshotMime
    && !isLegacyScreenshotPath(screenshot)
    && HEX_PATTERN.test(screenshot)
  );
}

function validateScreenshotHex(hex, mime) {
  if (!hex && !mime) {
    return { valid: true, hex: null, mime: null };
  }

  if (!hex || !mime) {
    return { valid: false, error: 'Screenshot requires both screenshot_hex and screenshot_mime' };
  }

  if (!ALLOWED_MIMES.has(mime)) {
    return { valid: false, error: 'Only JPG, PNG, or WebP images are allowed' };
  }

  if (!HEX_PATTERN.test(hex) || hex.length % 2 !== 0) {
    return { valid: false, error: 'screenshot_hex must be an even-length hexadecimal string' };
  }

  const byteLength = hex.length / 2;
  if (byteLength > MAX_BYTES) {
    return { valid: false, error: 'Screenshot must be under 5MB' };
  }

  return { valid: true, hex: hex.toLowerCase(), mime, byteLength };
}

function hexToDataUrl(hex, mime) {
  if (!hasStoredScreenshot(hex, mime)) return null;
  const base64 = Buffer.from(hex, 'hex').toString('base64');
  return `data:${mime};base64,${base64}`;
}

module.exports = {
  MAX_BYTES,
  ALLOWED_MIMES,
  isLegacyScreenshotPath,
  hasStoredScreenshot,
  validateScreenshotHex,
  hexToDataUrl
};
