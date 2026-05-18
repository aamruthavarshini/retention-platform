const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const { status, plan, risk_min, risk_max, search } = req.query;

  let query = 'SELECT * FROM customers WHERE 1=1';
  const params = [];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (plan) { query += ' AND plan_type = ?'; params.push(plan); }
  if (risk_min) { query += ' AND risk_score >= ?'; params.push(parseFloat(risk_min)); }
  if (risk_max) { query += ' AND risk_score <= ?'; params.push(parseFloat(risk_max)); }
  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR customer_id LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY risk_score DESC';
  const customers = db.prepare(query).all(...params);
  res.json(customers);
});

router.get('/:id', (req, res) => {
  const customer = db.prepare(
    'SELECT * FROM customers WHERE customer_id = ?'
  ).get(req.params.id);

  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const activities = db.prepare(
    'SELECT * FROM activity_log WHERE customer_id = ? ORDER BY event_date DESC LIMIT 20'
  ).all(req.params.id);

  const actions = db.prepare(
    'SELECT * FROM retention_actions WHERE customer_id = ? ORDER BY created_at DESC'
  ).all(req.params.id);

  const riskHistory = db.prepare(
    'SELECT * FROM risk_scores WHERE customer_id = ? ORDER BY score_date DESC LIMIT 30'
  ).all(req.params.id);

  res.json({ customer, activities, actions, riskHistory });
});

module.exports = router;