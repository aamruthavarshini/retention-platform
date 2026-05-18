const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const db = require('../db/database');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body;

    const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM customers").get().count;
    const activeCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE status = 'Active'").get().count;
    const cancelledCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE status = 'Cancelled'").get().count;
    const highRisk = db.prepare("SELECT COUNT(*) as count FROM customers WHERE risk_score >= 0.7 AND status = 'Active'").get().count;
    const mrr = db.prepare("SELECT SUM(subscription_value) as total FROM customers WHERE status = 'Active'").get().total || 0;
    const atRiskMrr = db.prepare("SELECT SUM(subscription_value) as total FROM customers WHERE risk_score >= 0.7 AND status = 'Active'").get().total || 0;

    const topAtRisk = db.prepare(`
      SELECT name, email, plan_type, risk_score, subscription_value, industry, usage_hours, support_tickets, last_login
      FROM customers WHERE status = 'Active'
      ORDER BY risk_score DESC LIMIT 10
    `).all();

    const planBreakdown = db.prepare(`
      SELECT plan_type, COUNT(*) as count, SUM(subscription_value) as mrr
      FROM customers WHERE status = 'Active'
      GROUP BY plan_type
    `).all();

    const industryBreakdown = db.prepare(`
      SELECT industry, COUNT(*) as count, AVG(risk_score) as avg_risk
      FROM customers WHERE status = 'Active'
      GROUP BY industry ORDER BY avg_risk DESC
    `).all();

    const recentCancellations = db.prepare(`
      SELECT name, email, plan_type, subscription_value, sentiment_score, support_tickets, usage_hours
      FROM customers WHERE status = 'Cancelled'
      ORDER BY last_login DESC LIMIT 10
    `).all();

    const avgMetrics = db.prepare(`
      SELECT 
        AVG(usage_hours) as avg_usage,
        AVG(support_tickets) as avg_tickets,
        AVG(sentiment_score) as avg_sentiment,
        AVG(risk_score) as avg_risk
      FROM customers WHERE status = 'Active'
    `).get();

    const systemPrompt = `
You are an expert customer success analyst with access to real-time customer data. 
Answer questions concisely and helpfully. Use specific numbers from the data provided.
Format your responses clearly. If asked for a list, use bullet points.

CURRENT DATA SNAPSHOT:
- Total Customers: ${totalCustomers}
- Active Customers: ${activeCustomers}
- Cancelled Customers: ${cancelledCustomers}
- Churn Rate: ${totalCustomers > 0 ? ((cancelledCustomers / totalCustomers) * 100).toFixed(1) : 0}%
- Monthly MRR: $${mrr.toFixed(0)}
- MRR at Risk (high risk customers): $${atRiskMrr.toFixed(0)}
- High Risk Customers (score >= 70%): ${highRisk}

AVERAGE METRICS (Active Customers):
- Avg Usage Hours: ${avgMetrics?.avg_usage?.toFixed(1) || 0}h
- Avg Support Tickets: ${avgMetrics?.avg_tickets?.toFixed(1) || 0}
- Avg Sentiment Score: ${((avgMetrics?.avg_sentiment || 0) * 100).toFixed(0)}%
- Avg Risk Score: ${((avgMetrics?.avg_risk || 0) * 100).toFixed(0)}%

TOP 10 AT-RISK CUSTOMERS:
${topAtRisk.map(c => `- ${c.name} (${c.plan_type}, $${c.subscription_value}/mo) — Risk: ${(c.risk_score * 100).toFixed(0)}%, Usage: ${c.usage_hours}h, Tickets: ${c.support_tickets}, Last login: ${c.last_login}`).join('\n')}

PLAN BREAKDOWN:
${planBreakdown.map(p => `- ${p.plan_type}: ${p.count} customers, $${p.mrr?.toFixed(0) || 0} MRR`).join('\n')}

INDUSTRY BREAKDOWN (by avg risk):
${industryBreakdown.map(i => `- ${i.industry}: ${i.count} customers, avg risk ${(i.avg_risk * 100).toFixed(0)}%`).join('\n')}

RECENT CANCELLATIONS:
${recentCancellations.map(c => `- ${c.name} (${c.plan_type}, $${c.subscription_value}/mo) — Sentiment: ${(c.sentiment_score * 100).toFixed(0)}%, Tickets: ${c.support_tickets}, Usage: ${c.usage_hours}h`).join('\n')}
    `;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: message }
    ];

    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content || '';
    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chat failed', detail: err.message });
  }
});

module.exports = router;