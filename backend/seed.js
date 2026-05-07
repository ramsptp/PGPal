// ============================================================
// seed.js — Creates an admin account in MongoDB Atlas
// Run once: node seed.js
// ============================================================

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const dotenv   = require('dotenv');
dotenv.config();

const Tenant = require('./models/Tenant');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  // Check if admin already exists
  const existing = await Tenant.findOne({ email: 'admin@pgpal.com' });
  if (existing) {
    console.log('Admin already exists. Email: admin@pgpal.com');
    process.exit(0);
  }

  const hashed = await bcrypt.hash('admin123', 10);

  await Tenant.create({
    name:     'PGPal Admin',
    email:    'admin@pgpal.com',
    phone:    '9999999999',
    password: hashed,
    role:     'admin',
    preferences: {
      sleepSchedule:  'Flexible',
      hobbies:        [],
      smokingAllowed: false,
      guestPolicy:    'Occasional'
    }
  });

  console.log('✅ Admin account created!');
  console.log('   Email:    admin@pgpal.com');
  console.log('   Password: admin123');
  console.log('   ⚠️  Change the password after first login!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
