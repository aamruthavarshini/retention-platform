const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const { status } = req.query;
  const company_id = req.user.company_id;

  let query = `
    SELECT ra.*, c.name as customer_name, c.email, c.plan_type, c.risk_score
    FROM retention_actions ra
    JOIN customers c ON ra.customer_id = c.customer_id AND c.company_id = ra.company_id
    WHERE ra.company_id = ?
  `;
  const params = [company_id];

  if (status) { query += ' AND ra.status = ?'; params.push(status); }
  query += ' ORDER BY c.risk_score DESC';

  const actions = db.prepare(query).all(...params);
  res.json(actions);
});

router.patch('/:id', (req, res) => {
  const { status } = req.body;
  const company_id = req.user.company_id;
  const validStatuses = ['Pending', 'Approved', 'Sent', 'Completed', 'Dismissed'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  const result = db.prepare(
    'UPDATE retention_actions SET status = ?, actioned_at = ? WHERE id = ? AND company_id = ?'
  ).run(status, new Date().toISOString(), req.params.id, company_id);

  if (result.changes === 0) return res.status(404).json({ error: 'Action not found' });
  res.json({ success: true, id: req.params.id, status });
});

module.exports = router;