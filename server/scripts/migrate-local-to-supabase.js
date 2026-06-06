/**
 * One-time migration: copy data from local PostgreSQL (bingo_app) → Supabase
 * Run: node scripts/migrate-local-to-supabase.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');
const remote = require('../config/database');

const local = new Sequelize(
  process.env.LOCAL_DB_NAME || 'bingo_app',
  process.env.LOCAL_DB_USER || 'postgres',
  process.env.LOCAL_DB_PASSWORD || '8594',
  {
    host: process.env.LOCAL_DB_HOST || 'localhost',
    port: Number(process.env.LOCAL_DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function copyTable(table, orderBy = 'created_at') {
  const [rows] = await local.query(`SELECT * FROM ${table} ORDER BY ${orderBy} ASC`);
  if (!rows.length) {
    console.log(`  ${table}: 0 rows (skipped)`);
    return 0;
  }

  const cols = Object.keys(rows[0]);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const colList = cols.map(c => `"${c}"`).join(', ');

  for (const row of rows) {
    const values = cols.map(c => row[c]);
    await remote.query(
      `INSERT INTO ${table} (${colList}) VALUES (${placeholders})
       ON CONFLICT DO NOTHING`,
      { bind: values }
    );
  }

  console.log(`  ${table}: ${rows.length} rows copied`);
  return rows.length;
}

async function copyAppSettings() {
  const [rows] = await local.query('SELECT * FROM app_settings');
  for (const row of rows) {
    await remote.query(
      `INSERT INTO app_settings (key, value, created_at, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      { bind: [row.key, row.value, row.created_at, row.updated_at] }
    );
  }
  console.log(`  app_settings: ${rows.length} rows synced`);
}

async function main() {
  console.log('Connecting to local database...');
  await local.authenticate();
  console.log('Connecting to Supabase...');
  await remote.authenticate();
  console.log('Migrating data...\n');

  await copyTable('admins');
  await copyTable('shops');
  await copyTable('topup_transactions');
  await copyAppSettings();

  const [shops] = await remote.query('SELECT COUNT(*)::int AS c FROM shops');
  const [admins] = await remote.query('SELECT COUNT(*)::int AS c FROM admins');
  const [topups] = await remote.query('SELECT COUNT(*)::int AS c FROM topup_transactions');
  console.log('\nSupabase after migration:');
  console.log(`  shops: ${shops[0].c}, admins: ${admins[0].c}, topups: ${topups[0].c}`);
  console.log('\nDone.');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
