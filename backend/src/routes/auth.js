const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

const SECRET = process.env.JWT_SECRET || 'retainiq-secret-key';

// Seed default company and admin if none exists
const existingCompany = db.prepare('SELECT * FROM companies LIMIT 1').get();
if (!existingCompany) {
  db.prepare('INSERT INTO companies (name, created_at) VALUES (?, ?)')
    .run('Default Company', new Date().toISOString());
}

const defaultCompany = db.prepare('SELECT * FROM companies LIMIT 1').get();

const existing = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@retainiq.com');
if (!existing) {
  const hashed = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (name, email, password, company_id, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('Admin', 'admin@retainiq.com', hashed, defaultCompany.id, 'admin', new Date().toISOString());
  console.log('Default admin user created');
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, company_id: user.company_id },
    SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, company_id: user.company_id } });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, companyName } = req.body;

  if (!name || !email || !password || !companyName) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already in use' });

  const company = db.prepare('INSERT INTO companies (name, created_at) VALUES (?, ?)')
    .run(companyName, new Date().toISOString());

  const hashed = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (name, email, password, company_id, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, email, hashed, company.lastInsertRowid, 'admin', new Date().toISOString());

  res.json({ success: true, message: 'Account created successfully' });
});

// POST /api/auth/verify
router.post('/verify', (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;