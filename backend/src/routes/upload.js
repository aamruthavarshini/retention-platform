const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const db = require('../db/database');

const upload = multer({ dest: 'uploads/' });

function calculateRiskScore(usageHours, supportTickets, lastLogin) {
  const daysSinceLogin = Math.floor(
    (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24)
  );
  const usageRisk = usageHours < 2 ? 0.4 : usageHours < 10 ? 0.25 : usageHours < 20 ? 0.1 : 0;
  const ticketRisk = supportTickets >= 7 ? 0.4 : supportTickets >= 4 ? 0.25 : supportTickets >= 2 ? 0.1 : 0;
  const loginRisk = daysSinceLogin > 30 ? 0.35 : daysSinceLogin > 14 ? 0.2 : daysSinceLogin > 7 ? 0.1 : 0;
  return Math.min(parseFloat((usageRisk + ticketRisk + loginRisk).toFixed(2)), 1);
}

function calculateSentimentScore(supportTickets, riskScore) {
  return Math.max(0.05, parseFloat((1 - (supportTickets * 0.07) - (riskScore * 0.25)).toFixed(2)));
}

function inferStatus(riskScore, lastLogin) {
  const daysSinceLogin = Math.floor(
    (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceLogin > 90 && riskScore > 0.7) return 'Cancelled';
  return 'Active';
}

// POST /api/upload/preview
router.post('/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const results = [];
  let totalRows = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => {
      totalRows++;
      if (results.length < 5) results.push(data);
    })
    .on('end', () => {
      const headers = results.length > 0 ? Object.keys(results[0]) : [];
      fs.unlinkSync(req.file.path);
      res.json({ headers, preview: results, totalRows });
    })
    .on('error', () => {
      res.status(500).json({ error: 'Failed to parse CSV' });
    });
});

// POST /api/upload/validate
router.post('/validate', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let mapping;
  try {
    mapping = JSON.parse(req.body.mapping);
  } catch {
    return res.status(400).json({ error: 'Invalid mapping' });
  }

  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      fs.unlinkSync(req.file.path);

      const errors = [];
      const warnings = [];
      let validRows = 0;

      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        const rowNum = i + 1;
        const mapped = {};
        for (const [ourField, theirColumn] of Object.entries(mapping)) {
          mapped[ourField] = theirColumn ? row[theirColumn] : null;
        }

        if (!mapped.name || String(mapped.name).trim() === '') {
          errors.push({ row: rowNum, message: `Row ${rowNum}: Missing customer name` });
        }
        if (!mapped.email || !String(mapped.email).includes('@')) {
          errors.push({ row: rowNum, message: `Row ${rowNum}: Missing or invalid email address` });
        }
        if (mapped.usage_hours && parseFloat(mapped.usage_hours) < 0) {
          warnings.push({ row: rowNum, message: `Row ${rowNum}: Negative usage hours (${mapped.usage_hours})` });
        }
        if (mapped.support_tickets && parseInt(mapped.support_tickets) < 0) {
          warnings.push({ row: rowNum, message: `Row ${rowNum}: Negative support ticket count` });
        }
        if (mapped.last_login && isNaN(Date.parse(mapped.last_login))) {
          warnings.push({ row: rowNum, message: `Row ${rowNum}: Last login date can't be parsed ("${mapped.last_login}")` });
        }
        if (mapped.join_date && isNaN(Date.parse(mapped.join_date))) {
          warnings.push({ row: rowNum, message: `Row ${rowNum}: Join date can't be parsed ("${mapped.join_date}")` });
        }
        if (mapped.subscription_value && parseFloat(mapped.subscription_value) < 0) {
          warnings.push({ row: rowNum, message: `Row ${rowNum}: Negative subscription value` });
        }

        validRows++;
      }

      res.json({
        total: results.length,
        validRows,
        errorCount: errors.length,
        warningCount: warnings.length,
        errors: errors.slice(0, 20),
        warnings: warnings.slice(0, 20),
        canImport: errors.length === 0,
      });
    })
    .on('error', () => {
      res.status(500).json({ error: 'Failed to parse CSV' });
    });
});

// POST /api/upload/import
router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const company_id = req.user.company_id;

  let mapping;
  try {
    mapping = JSON.parse(req.body.mapping);
  } catch {
    return res.status(400).json({ error: 'Invalid mapping' });
  }

  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      try {
        db.prepare('DELETE FROM customers WHERE company_id = ?').run(company_id);
        db.prepare('DELETE FROM activity_log WHERE company_id = ?').run(company_id);
        db.prepare('DELETE FROM retention_actions WHERE company_id = ?').run(company_id);
        db.prepare('DELETE FROM risk_scores WHERE company_id = ?').run(company_id);

        const insert = db.prepare(`
          INSERT INTO customers (
            company_id, customer_id, name, email, plan_type, join_date, last_login,
            usage_hours, support_tickets, sentiment_score, subscription_value,
            risk_score, status, industry, company_size
          ) VALUES (
            @company_id, @customer_id, @name, @email, @plan_type, @join_date, @last_login,
            @usage_hours, @support_tickets, @sentiment_score, @subscription_value,
            @risk_score, @status, @industry, @company_size
          )
        `);

        let autoCalculated = { risk_score: 0, sentiment_score: 0, status: 0, customer_id: 0 };

        const insertMany = db.transaction((rows) => {
          for (const row of rows) {
            const mapped = {};
            for (const [ourField, theirColumn] of Object.entries(mapping)) {
              mapped[ourField] = theirColumn ? row[theirColumn] : null;
            }

            const usageHours = parseFloat(mapped.usage_hours) || 0;
            const supportTickets = parseInt(mapped.support_tickets) || 0;
            const lastLogin = mapped.last_login || new Date().toISOString().split('T')[0];
            const joinDate = mapped.join_date || new Date().toISOString().split('T')[0];

            let riskScore = parseFloat(mapped.risk_score);
            if (isNaN(riskScore)) {
              riskScore = calculateRiskScore(usageHours, supportTickets, lastLogin);
              autoCalculated.risk_score++;
            }

            let sentimentScore = parseFloat(mapped.sentiment_score);
            if (isNaN(sentimentScore)) {
              sentimentScore = calculateSentimentScore(supportTickets, riskScore);
              autoCalculated.sentiment_score++;
            }

            let status = mapped.status;
            if (!status) {
              status = inferStatus(riskScore, lastLogin);
              autoCalculated.status++;
            }

            let customerId = mapped.customer_id;
            if (!customerId) {
              customerId = `CUST-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
              autoCalculated.customer_id++;
            }

            insert.run({
              company_id,
              customer_id: customerId,
              name: mapped.name || 'Unknown',
              email: mapped.email || '',
              plan_type: mapped.plan_type || 'Starter',
              join_date: joinDate,
              last_login: lastLogin,
              usage_hours: usageHours,
              support_tickets: supportTickets,
              sentiment_score: sentimentScore,
              subscription_value: parseFloat(mapped.subscription_value) || 0,
              risk_score: riskScore,
              status: status,
              industry: mapped.industry || 'Other',
              company_size: mapped.company_size || '1-10',
            });
          }
        });

        insertMany(results);
        fs.unlinkSync(req.file.path);

        res.json({
          success: true,
          message: `Successfully imported ${results.length} customers`,
          count: results.length,
          autoCalculated,
        });

      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Import failed', detail: err.message });
      }
    })
    .on('error', () => {
      res.status(500).json({ error: 'Failed to parse CSV' });
    });
});

// GET /api/upload/template
router.get('/template', (req, res) => {
  const headers = 'customer_id,name,email,plan_type,join_date,last_login,usage_hours,support_tickets,sentiment_score,subscription_value,risk_score,status,industry,company_size';
  const sample = 'CUST-0001,John Smith,john@acme.com,Professional,2024-01-15,2024-12-01,45.5,2,0.72,149,0.23,Active,SaaS,51-200';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=customer_template.csv');
  res.send(`${headers}\n${sample}`);
});

module.exports = router;