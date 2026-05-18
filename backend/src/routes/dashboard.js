const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/stats', (req, res) => {
  const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM customers").get().count;
  const activeCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE status = 'Active'").get().count;
  const cancelledCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE status = 'Cancelled'").get().count;

  const highRisk = db.prepare(
    "SELECT COUNT(*) as count FROM customers WHERE risk_score >= 0.7 AND status = 'Active'"
  ).get().count;

  const mediumRisk = db.prepare(
    "SELECT COUNT(*) as count FROM customers WHERE risk_score >= 0.4 AND risk_score < 0.7 AND status = 'Active'"
  ).get().count;

  const mrr = db.prepare(
    "SELECT SUM(subscription_value) as total FROM customers WHERE status = 'Active'"
  ).get().total || 0;

  const atRiskMrr = db.prepare(
    "SELECT SUM(subscription_value) as total FROM customers WHERE risk_score >= 0.7 AND status = 'Active'"
  ).get().total || 0;

  const avgSentiment = db.prepare(
    "SELECT AVG(sentiment_score) as avg FROM customers WHERE status = 'Active'"
  ).get().avg || 0;

  const planBreakdown = db.prepare(
    "SELECT plan_type, COUNT(*) as count FROM customers WHERE status = 'Active' GROUP BY plan_type"
  ).all();

  const industryBreakdown = db.prepare(
    "SELECT industry, COUNT(*) as count FROM customers WHERE status = 'Active' GROUP BY industry ORDER BY count DESC"
  ).all();

  const topAtRisk = db.prepare(
    "SELECT customer_id, name, email, plan_type, risk_score, subscription_value FROM customers WHERE status = 'Active' ORDER BY risk_score DESC LIMIT 10"
  ).all();

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