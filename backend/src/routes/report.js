const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const db = require('../db/database');

router.get('/executive', (req, res) => {
  try {
    const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM customers").get().count;
    const activeCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE status = 'Active'").get().count;
    const cancelledCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE status = 'Cancelled'").get().count;
    const highRisk = db.prepare("SELECT COUNT(*) as count FROM customers WHERE risk_score >= 0.7 AND status = 'Active'").get().count;
    const mediumRisk = db.prepare("SELECT COUNT(*) as count FROM customers WHERE risk_score >= 0.4 AND risk_score < 0.7 AND status = 'Active'").get().count;
    const mrr = db.prepare("SELECT SUM(subscription_value) as total FROM customers WHERE status = 'Active'").get().total || 0;
    const atRiskMrr = db.prepare("SELECT SUM(subscription_value) as total FROM customers WHERE risk_score >= 0.7 AND status = 'Active'").get().total || 0;
    const avgSentiment = db.prepare("SELECT AVG(sentiment_score) as avg FROM customers WHERE status = 'Active'").get().avg || 0;

    const topAtRisk = db.prepare(`
      SELECT name, email, plan_type, risk_score, subscription_value
      FROM customers WHERE status = 'Active'
      ORDER BY risk_score DESC LIMIT 10
    `).all();

    const planBreakdown = db.prepare(`
      SELECT plan_type, COUNT(*) as count, SUM(subscription_value) as mrr
      FROM customers WHERE status = 'Active'
      GROUP BY plan_type ORDER BY mrr DESC
    `).all();

    const industryBreakdown = db.prepare(`
      SELECT industry, COUNT(*) as count, AVG(risk_score) as avg_risk
      FROM customers WHERE status = 'Active'
      GROUP BY industry ORDER BY avg_risk DESC LIMIT 5
    `).all();

    const churnRate = totalCustomers > 0 ? ((cancelledCustomers / totalCustomers) * 100).toFixed(1) : 0;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=retention-report-${new Date().toISOString().split('T')[0]}.pdf`);
    doc.pipe(res);

    const drawLine = (y) => {
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    };

    doc.rect(0, 0, 595, 80).fillColor('#1e1b4b').fill();
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('CustomerPulse', 50, 20);
    doc.fontSize(11).font('Helvetica').fillColor('#a5b4fc').text('Executive Retention Report', 50, 46);
    doc.fillColor('#c7d2fe').fontSize(9).text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 62);

    let y = 100;

    doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Executive Summary', 50, y);
    y += 25;
    drawLine(y);
    y += 15;

    const kpis = [
      { label: 'Active Customers', value: activeCustomers.toString(), color: '#4f46e5' },
      { label: 'Churn Rate', value: `${churnRate}%`, color: '#dc2626' },
      { label: 'Monthly MRR', value: `$${Math.round(mrr).toLocaleString()}`, color: '#16a34a' },
      { label: 'High Risk', value: highRisk.toString(), color: '#d97706' },
    ];

    kpis.forEach((kpi, i) => {
      const x = 50 + (i % 2) * 250;
      const ky = y + Math.floor(i / 2) * 60;
      doc.rect(x, ky, 230, 50).fillColor('#f9fafb').fill();
      doc.rect(x, ky, 4, 50).fillColor(kpi.color).fill();
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica').text(kpi.label, x + 14, ky + 10);
      doc.fillColor('#111827').fontSize(18).font('Helvetica-Bold').text(kpi.value, x + 14, ky + 24);
    });

    y += 140;

    doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Risk Overview', 50, y);
    y += 25;
    drawLine(y);
    y += 15;

    const riskData = [
      { label: 'High Risk Customers (>=70%)', count: highRisk, color: '#dc2626', bar: highRisk / activeCustomers },
      { label: 'Medium Risk Customers (40-70%)', count: mediumRisk, color: '#d97706', bar: mediumRisk / activeCustomers },
      { label: 'Low Risk Customers (<40%)', count: activeCustomers - highRisk - mediumRisk, color: '#16a34a', bar: (activeCustomers - highRisk - mediumRisk) / activeCustomers },
    ];

    riskData.forEach(r => {
      doc.fillColor('#374151').fontSize(10).font('Helvetica').text(r.label, 50, y);
      doc.fillColor('#6b7280').fontSize(10).text(r.count.toString(), 380, y);
      doc.rect(420, y + 2, 125, 10).fillColor('#f3f4f6').fill();
      doc.rect(420, y + 2, Math.max(2, 125 * (r.bar || 0)), 10).fillColor(r.color).fill();
      y += 25;
    });

    doc.fillColor('#374151').fontSize(10).font('Helvetica').text('MRR at Risk', 50, y);
    doc.fillColor('#dc2626').fontSize(10).font('Helvetica-Bold').text(`$${Math.round(atRiskMrr).toLocaleString()}`, 380, y);
    y += 35;

    doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Top At-Risk Customers', 50, y);
    y += 25;
    drawLine(y);
    y += 10;

    doc.rect(50, y, 495, 22).fillColor('#f3f4f6').fill();
    doc.fillColor('#6b7280').fontSize(9).font('Helvetica-Bold');
    doc.text('CUSTOMER', 58, y + 7);
    doc.text('PLAN', 260, y + 7);
    doc.text('MRR', 340, y + 7);
    doc.text('RISK SCORE', 420, y + 7);
    y += 22;

    topAtRisk.forEach((c, i) => {
      if (i % 2 === 0) doc.rect(50, y, 495, 22).fillColor('#fafafa').fill();
      const riskPct = (c.risk_score * 100).toFixed(0);
      const riskColor = c.risk_score >= 0.7 ? '#dc2626' : c.risk_score >= 0.4 ? '#d97706' : '#16a34a';
      doc.fillColor('#111827').fontSize(9).font('Helvetica').text(c.name, 58, y + 7, { width: 190 });
      doc.fillColor('#6b7280').text(c.plan_type, 260, y + 7);
      doc.fillColor('#16a34a').text(`$${c.subscription_value}`, 340, y + 7);
      doc.fillColor(riskColor).font('Helvetica-Bold').text(`${riskPct}%`, 420, y + 7);
      y += 22;
    });

    y += 20;
    if (y > 650) { doc.addPage(); y = 50; }

    doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Plan Breakdown', 50, y);
    y += 25;
    drawLine(y);
    y += 15;

    planBreakdown.forEach(p => {
      doc.fillColor('#374151').fontSize(10).font('Helvetica').text(p.plan_type, 50, y);
      doc.fillColor('#6b7280').text(`${p.count} customers`, 200, y);
      doc.fillColor('#16a34a').font('Helvetica-Bold').text(`$${Math.round(p.mrr || 0).toLocaleString()}/mo`, 340, y);
      y += 20;
    });

    y += 20;
    if (y > 650) { doc.addPage(); y = 50; }

    doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Industry Risk Analysis', 50, y);
    y += 25;
    drawLine(y);
    y += 15;

    industryBreakdown.forEach(ind => {
      const avgRisk = (ind.avg_risk * 100).toFixed(0);
      const riskColor = ind.avg_risk >= 0.7 ? '#dc2626' : ind.avg_risk >= 0.4 ? '#d97706' : '#16a34a';
      doc.fillColor('#374151').fontSize(10).font('Helvetica').text(ind.industry, 50, y);
      doc.fillColor('#6b7280').text(`${ind.count} customers`, 200, y);
      doc.fillColor(riskColor).font('Helvetica-Bold').text(`${avgRisk}% avg risk`, 340, y);
      y += 20;
    });

    y += 20;
    if (y > 600) { doc.addPage(); y = 50; }

    doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Recommendations', 50, y);
    y += 25;
    drawLine(y);
    y += 15;

    const recommendations = [];
    if (highRisk > 0) recommendations.push(`Immediately action ${highRisk} high-risk customers representing $${Math.round(atRiskMrr).toLocaleString()} MRR.`);
    if (churnRate > 15) recommendations.push(`Churn rate of ${churnRate}% is above the healthy 5-10% benchmark — prioritise retention campaigns.`);
    if (avgSentiment < 0.5) recommendations.push(`Average sentiment score of ${(avgSentiment * 100).toFixed(0)}% indicates widespread dissatisfaction — investigate support quality.`);
    if (mediumRisk > activeCustomers * 0.3) recommendations.push(`${mediumRisk} medium-risk customers need proactive outreach before they escalate to high risk.`);
    recommendations.push(`Use the Retention Assistant to approve and send personalised outreach to at-risk customers.`);
    recommendations.push(`Run AI forensics reports on churned accounts to identify and fix systemic issues.`);

    recommendations.forEach((rec) => {
      doc.rect(50, y, 4, 30).fillColor('#4f46e5').fill();
      doc.fillColor('#374151').fontSize(10).font('Helvetica').text(rec, 62, y + 8, { width: 480 });
      y += 35;
    });

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report', detail: err.message });
  }
});

module.exports = router;