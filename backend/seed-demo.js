// ============================================================
// seed-demo.js — Clears existing data and inserts demo data
// Run: node seed-demo.js
// ============================================================

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const dotenv   = require('dotenv');
dotenv.config();

const Tenant      = require('./models/Tenant');
const Room        = require('./models/Room');
const Maintenance = require('./models/Maintenance');
const Notice      = require('./models/Notice');
const RentPayment = require('./models/RentPayment');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas');

  // ── Clear all existing data ────────────────────────────────
  await Promise.all([
    Tenant.deleteMany({}),
    Room.deleteMany({}),
    Maintenance.deleteMany({}),
    Notice.deleteMany({}),
    RentPayment.deleteMany({})
  ]);
  console.log('🗑  Cleared existing data');

  // ── Rooms ──────────────────────────────────────────────────
  const rooms = await Room.insertMany([
    {
      roomNumber: '101', type: 'Single', pricePerMonth: 6000,
      capacity: 1, occupiedBeds: 1, status: 'Occupied',
      amenities: ['AC', 'Attached Bathroom', 'WiFi']
    },
    {
      roomNumber: '102', type: 'Double', pricePerMonth: 4000,
      capacity: 2, occupiedBeds: 1, status: 'Vacant',
      amenities: ['WiFi', 'Fan']
    },
    {
      roomNumber: '201', type: 'Double', pricePerMonth: 4500,
      capacity: 2, occupiedBeds: 2, status: 'Occupied',
      amenities: ['AC', 'WiFi', 'Study Table']
    },
    {
      roomNumber: '202', type: 'Triple', pricePerMonth: 3000,
      capacity: 3, occupiedBeds: 1, status: 'Vacant',
      amenities: ['Fan', 'WiFi']
    },
    {
      roomNumber: '301', type: 'Quad', pricePerMonth: 2500,
      capacity: 4, occupiedBeds: 0, status: 'Vacant',
      amenities: ['Fan']
    },
    {
      roomNumber: '501', type: '5-Sharing', pricePerMonth: 2000,
      capacity: 5, occupiedBeds: 0, status: 'Vacant',
      amenities: ['Fan', 'Common Bathroom']
    }
  ]);
  console.log(`🏠 Created ${rooms.length} rooms`);

  // ── Users ──────────────────────────────────────────────────
  const hash = async (pw) => bcrypt.hash(pw, 10);

  const admin = await Tenant.create({
    name: 'PGPal Admin', email: 'admin@pgpal.com',
    phone: '9000000000', password: await hash('Admin@123'),
    role: 'admin',
    preferences: { sleepSchedule: 'Flexible', guestPolicy: 'Occasional', hobbies: [] }
  });

  const arjun = await Tenant.create({
    name: 'Arjun Menon', email: 'arjun@pgpal.com',
    phone: '9495806827', password: await hash('Arjun@123'),
    role: 'tenant', roomId: rooms[0]._id,
    moveInDate: new Date('2026-01-05'), rentDueDay: 5,
    roomPreferences: ['Single', 'Double'],
    preferences: {
      sleepSchedule: 'Early Bird', guestPolicy: 'No Guests',
      hobbies: ['Reading', 'Chess', 'Cycling']
    }
  });

  const meera = await Tenant.create({
    name: 'Meera Krishnan', email: 'meera@pgpal.com',
    phone: '9876543210', password: await hash('Meera@123'),
    role: 'tenant', roomId: rooms[2]._id,
    moveInDate: new Date('2026-02-01'), rentDueDay: 1,
    roomPreferences: ['Double', 'Triple'],
    preferences: {
      sleepSchedule: 'Early Bird', guestPolicy: 'Occasional',
      hobbies: ['Reading', 'Music', 'Cooking']
    }
  });

  const rahul = await Tenant.create({
    name: 'Rahul Das', email: 'rahul@pgpal.com',
    phone: '9123456780', password: await hash('Rahul@123'),
    role: 'tenant', roomId: rooms[2]._id,
    moveInDate: new Date('2026-03-10'), rentDueDay: 10,
    roomPreferences: ['Double', 'Triple'],
    preferences: {
      sleepSchedule: 'Night Owl', guestPolicy: 'Frequent',
      hobbies: ['Gaming', 'Music', 'Movies']
    }
  });

  const priya = await Tenant.create({
    name: 'Priya Nair', email: 'priya@pgpal.com',
    phone: '9988776655', password: await hash('Priya@123'),
    role: 'tenant', roomId: null,
    rentDueDay: 5,
    roomPreferences: ['Single', 'Double'],
    preferences: {
      sleepSchedule: 'Flexible', guestPolicy: 'No Guests',
      hobbies: ['Chess', 'Reading', 'Cycling']
    }
  });

  console.log('👤 Created admin + 4 tenants');

  // ── Maintenance Requests ───────────────────────────────────
  await Maintenance.insertMany([
    {
      tenantId: arjun._id, roomId: rooms[0]._id,
      title: 'Leaking tap in bathroom',
      description: 'The tap has been dripping since yesterday morning. Water is being wasted.',
      status: 'In Progress', adminNote: 'Plumber scheduled for tomorrow.'
    },
    {
      tenantId: meera._id, roomId: rooms[2]._id,
      title: 'WiFi not working',
      description: 'The WiFi router on the 2nd floor is not connecting since last night.',
      status: 'Pending', adminNote: ''
    },
    {
      tenantId: rahul._id, roomId: rooms[2]._id,
      title: 'Broken window latch',
      description: 'The window latch in room 201 is broken and the window cannot be shut properly.',
      status: 'Resolved', adminNote: 'Repaired on 5th May 2026.'
    }
  ]);
  console.log('🔧 Created 3 maintenance requests');

  // ── Notices ────────────────────────────────────────────────
  await Notice.insertMany([
    {
      title: 'Water supply interruption — 10th May',
      message: 'There will be no water supply between 10 AM and 2 PM on 10th May due to tank cleaning. Please store water in advance.',
      targetType: 'General'
    },
    {
      title: 'Rent due reminder',
      message: 'Kindly ensure rent is paid before the due date. Please submit your payment receipt through the portal after payment.',
      targetType: 'General'
    },
    {
      title: 'New WiFi password',
      message: 'The WiFi password has been updated. Please contact admin at the office to get the new password.',
      targetType: 'General'
    }
  ]);
  console.log('📋 Created 3 notices');

  // ── Rent Payments ──────────────────────────────────────────
  await RentPayment.insertMany([
    {
      tenantId: arjun._id, roomId: rooms[0]._id,
      month: 4, year: 2026, amount: 6000,
      referenceNote: 'UPI Ref: 482039481720',
      status: 'Confirmed', adminNote: 'Payment received. Thank you.'
    },
    {
      tenantId: arjun._id, roomId: rooms[0]._id,
      month: 5, year: 2026, amount: 6000,
      referenceNote: 'UPI Ref: 591823048571',
      status: 'Pending', adminNote: ''
    },
    {
      tenantId: meera._id, roomId: rooms[2]._id,
      month: 5, year: 2026, amount: 4500,
      referenceNote: 'Bank Ref: SBIN50928301',
      status: 'Confirmed', adminNote: 'Confirmed.'
    }
  ]);
  console.log('💰 Created 3 rent payment records');

  console.log('\n✅ Demo data seeded successfully!\n');
  console.log('┌─────────────────────────────────────────┐');
  console.log('│  ADMIN     admin@pgpal.com  / Admin@123  │');
  console.log('│  TENANT 1  arjun@pgpal.com  / Arjun@123  │');
  console.log('│  TENANT 2  meera@pgpal.com  / Meera@123  │');
  console.log('└─────────────────────────────────────────┘');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
