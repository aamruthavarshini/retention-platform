const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const campaigns = db.prepare(
    'SELECT * FROM winback_campaigns ORDER BY created_at DESC'
  ).all();
  res.json(campaigns);
});

router.post('/', (req, res) => {
  const { customer_id, customer_name, email, plan_type, subscription_value, cancellation_reason } = req.body;

  const existing = db.prepare(
    'SELECT * FROM winback_campaigns WHERE customer_id = ?'
  ).get(customer_id);

  if (existing) {
    return res.status(400).json({ error: 'Customer already in winback tracker' });
  }

  const result = db.prepare(`
    INSERT INTO winback_campaigns 
    (customer_id, customer_name, email, plan_type, subscription_value, cancellation_reason, status, outreach_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'In Progress', 0, ?)
  `).run(customer_id, customer_name, email, plan_type, subscription_value, cancellation_reason || '', new Date().toISOString());

  res.json({ success: true, id: result.lastInsertRowid });
});

router.patch('/:id', (req, res) => {
  const { status, notes, last_contact_date, next_followup_date, outcome, outreach_count } = req.body;

  const result = db.prepare(`
    UPDATE winback_campaigns SET
      status = COALESCE(?, status),
      notes = COALESCE(?, notes),
      last_contact_date = COALESCE(?, last_contact_date),
      next_followup_date = COALESCE(?, next_followup_date),
      outcome = COALESCE(?, outcome),
      outreach_count = COALESCE(?, outreach_count)
    WHERE id = ?
  `).run(status, notes, last_contact_date, next_followup_date, outcome, outreach_count, req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Campaign not found' });
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM winback_campaigns WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;