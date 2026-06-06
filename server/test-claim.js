const http = require('http');

async function test() {
  // First, we need to bypass auth or just run the raw sequelize code
  const sequelize = require('./config/database');
  const { Shop } = require('./models');

  // Find a shop
  const shop = await Shop.findOne();
  if (!shop) {
    console.log("No shop found");
    return;
  }
  
  // Set pending_credits to 100
  shop.pending_credits = 100;
  await shop.save();
  console.log("Set pending_credits to 100");

  const shopId = shop.id;

  async function claim() {
    return sequelize.transaction(async (t) => {
      const [rows] = await sequelize.query(
        `SELECT "pending_credits", "is_active" FROM "shops" WHERE "id" = :shopId FOR UPDATE`,
        { replacements: { shopId }, transaction: t }
      );

      const credits = parseFloat(rows[0].pending_credits) || 0;

      if (credits > 0) {
        await sequelize.query(
          `UPDATE "shops" SET "pending_credits" = 0, "updated_at" = NOW() WHERE "id" = :shopId`,
          { replacements: { shopId }, transaction: t }
        );
      }
      return credits;
    });
  }

  // Run 3 concurrently
  const results = await Promise.all([claim(), claim(), claim()]);
  console.log("Results of 3 concurrent claims:", results);
  process.exit(0);
}

test().catch(console.error);
