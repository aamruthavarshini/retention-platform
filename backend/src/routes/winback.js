const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/winback
router.get('/', (req, res) => {
  const company_id = req.user.company_id;
  const campaigns = db.prepare(
    'SELECT * FROM winback_campaigns WHERE company_id = ? ORDER BY created_at DESC'
  ).all(company_id);
  res.json(campaigns);
});

// POST /api/winback — add a cancelled customer to winback
router.post('/', (req, res) => {
  const company_id = req.user.company_id;
  const { customer_id, customer_name, email, plan_type, subscription_value, cancellation_reason } = req.body;

  const existing = db.prepare(
    'SELECT * FROM winback_campaigns WHERE company_id = ? AND customer_id = ?'
  ).get(company_id, customer_id);

  if (existing) {
    return res.status(400).json({ error: 'Customer already in winback tracker' });
  }

  const result = db.prepare(`
    INSERT INTO winback_campaigns 
    (company_id, customer_id, customer_name, email, plan_type, subscription_value, cancellation_reason, status, outreach_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'In Progress', 0, ?)
  `).run(company_id, customer_id, customer_name, email, plan_type, subscription_value, cancellation_reason || '', new Date().toISOString());

  res.json({ success: true, id: result.lastInsertRowid });
});

// PATCH /api/winback/:id — update campaign
router.patch('/:id', (req, res) => {
  const company_id = req.user.company_id;
  const { status, notes, last_contact_date, next_followup_date, outcome, outreach_count } = req.body;

  const result = db.prepare(`
    UPDATE winback_campaigns SET
      status = COALESCE(?, status),
      notes = COALESCE(?, notes),
      last_contact_date = COALESCE(?, last_contact_date),
      next_followup_date = COALESCE(?, next_followup_date),
      outcome = COALESCE(?, outcome),
      outreach_count = COALESCE(?, outreach_count)
    WHERE id = ? AND company_id = ?
  `).run(status, notes, last_contact_date, next_followup_date, outcome, outreach_count, req.params.id, company_id);

  if (result.changes === 0) return res.status(404).json({ error: 'Campaign not found' });
  res.json({ success: true });
});

// DELETE /api/winback/:id
router.delete('/:id', (req, res) => {
  const company_id = req.user.company_id;
  db.prepare('DELETE FROM winback_campaigns WHERE id = ? AND company_id = ?').run(req.params.id, company_id);
  res.json({ success: true });
});

module.exports = router;