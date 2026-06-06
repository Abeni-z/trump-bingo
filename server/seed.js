const bcrypt = require('bcryptjs');
const { sequelize, Admin } = require('./models');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await sequelize.sync({ alter: true });
    console.log('✅ Tables synced');

    // Check if admin already exists
    const existing = await Admin.findOne({ where: { username: 'admin' } });
    if (existing) {
      console.log('ℹ️  Admin account already exists');
      process.exit(0);
    }

    // Create default admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await Admin.create({
      username: 'admin',
      password: hashedPassword
    });

    console.log('✅ Default admin created:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
