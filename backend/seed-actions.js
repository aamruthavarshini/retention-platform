require('dotenv').config();
const db = require('./src/db/database');

const customers = db.prepare('SELECT * FROM customers WHERE risk_score >= 0.4 AND status = ?').all('Active');

const actions = [
  'Schedule a personal check-in call to understand their experience',
  'Offer a 20% discount on next billing cycle',
  'Send a feature walkthrough for underutilised tools',
  'Invite to exclusive customer success webinar',
  'Offer a free onboarding session with a product specialist',
  'Send a personalised case study relevant to their industry',
];

const actionTypes = ['Email', 'Call', 'Discount', 'Webinar', 'Onboarding', 'Content'];

const insert = db.prepare('INSERT INTO retention_actions (customer_id, action_type, suggestion, status, created_at) VALUES (?, ?, ?, ?, ?)');

const insertMany = db.transaction((customers) => {
  for (const c of customers) {
    const idx = Math.floor(Math.random() * actions.length);
    insert.run(c.customer_id, actionTypes[idx], actions[idx], 'Pending', new Date().toISOString());
  }
});

insertMany(customers);
console.log('Seeded retention actions for', customers.length, 'customers');