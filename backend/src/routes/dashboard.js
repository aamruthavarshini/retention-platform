const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/stats', (req, res) => {
  const company_id = req.user.company_id;

  const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE company_id = ?").get(company_id).count;
  const activeCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE company_id = ? AND status = 'Active'").get(company_id).count;
  const cancelledCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE company_id = ? AND status = 'Cancelled'").get(company_id).count;

  const highRisk = db.prepare(
    "SELECT COUNT(*) as count FROM customers WHERE company_id = ? AND risk_score >= 0.7 AND status = 'Active'"
  ).get(company_id).count;

  const mediumRisk = db.prepare(
    "SELECT COUNT(*) as count FROM customers WHERE company_id = ? AND risk_score >= 0.4 AND risk_score < 0.7 AND status = 'Active'"
  ).get(company_id).count;

  const mrr = db.prepare(
    "SELECT SUM(subscription_value) as total FROM customers WHERE company_id = ? AND status = 'Active'"
  ).get(company_id).total || 0;

  const atRiskMrr = db.prepare(
    "SELECT SUM(subscription_value) as total FROM customers WHERE company_id = ? AND risk_score >= 0.7 AND status = 'Active'"
  ).get(company_id).total || 0;

  const avgSentiment = db.prepare(
    "SELECT AVG(sentiment_score) as avg FROM customers WHERE company_id = ? AND status = 'Active'"
  ).get(company_id).avg || 0;

  const planBreakdown = db.prepare(
    "SELECT plan_type, COUNT(*) as count FROM customers WHERE company_id = ? AND status = 'Active' GROUP BY plan_type"
  ).all(company_id);

  const industryBreakdown = db.prepare(
    "SELECT industry, COUNT(*) as count FROM customers WHERE company_id = ? AND status = 'Active' GROUP BY industry ORDER BY count DESC"
  ).all(company_id);

  const topAtRisk = db.prepare(
    "SELECT customer_id, name, email, plan_type, risk_score, subscription_value FROM customers WHERE company_id = ? AND status = 'Active' ORDER BY risk_score DESC LIMIT 10"
  ).all(company_id);

  res.json({
    totalCustomers, activeCustomers, cancelledCustomers,
    churnRate: totalCustomers > 0 ? parseFloat(((cancelledCustomers / totalCustomers) * 100).toFixed(1)) : 0,
    highRisk, mediumRisk,
    mrr: parseFloat(mrr.toFixed(2)),
    atRiskMrr: parseFloat(atRiskMrr.toFixed(2)),
    avgSentiment: parseFloat(avgSentiment.toFixed(2)),
    planBreakdown, industryBreakdown, topAtRisk
  });
});

module.exports = router;