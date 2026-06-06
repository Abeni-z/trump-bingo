-- Run once in Supabase SQL Editor (or psql) before/after deploy.
-- Converts screenshot column from file paths to hex storage.

ALTER TABLE topup_transactions
  ALTER COLUMN screenshot TYPE TEXT;

ALTER TABLE topup_transactions
  ADD COLUMN IF NOT EXISTS screenshot_mime VARCHAR(50);

-- Old disk paths from local dev are no longer valid on Render
UPDATE topup_transactions
SET screenshot = NULL, screenshot_mime = NULL
WHERE screenshot LIKE '/uploads/%';
