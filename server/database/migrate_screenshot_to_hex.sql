-- Run once in Supabase SQL Editor before/after Render deploy.
-- The API does NOT run sequelize.sync({ alter: true }) in production.

ALTER TABLE topup_transactions
  ALTER COLUMN screenshot TYPE TEXT;

ALTER TABLE topup_transactions
  ADD COLUMN IF NOT EXISTS screenshot_mime VARCHAR(50);

-- Old disk paths from local dev are no longer valid on Render
UPDATE topup_transactions
SET screenshot = NULL, screenshot_mime = NULL
WHERE screenshot LIKE '/uploads/%';

-- Optional: align status column if Sequelize enum migration failed earlier.
-- Safe when status uses Supabase enum "topup_status" — stores same values as text.
-- ALTER TABLE topup_transactions
--   ALTER COLUMN status TYPE VARCHAR(20) USING status::text;
