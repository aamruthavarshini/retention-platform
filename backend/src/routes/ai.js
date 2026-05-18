const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const { Resend } = require('resend');
const db = require('../db/database');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/ai/forensics/:customerId
router.post('/forensics/:customerId', async (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(req.params.customerId);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const activities = db.prepare(
      'SELECT * FROM activity_log WHERE customer_id = ? ORDER BY event_date DESC LIMIT 20'
    ).all(req.params.customerId);

    const prompt = `
You are a customer success analyst. Analyze this churned customer and write a forensics report.

Customer Data:
- Name: ${customer.name}
- Plan: ${customer.plan_type} ($${customer.subscription_value}/mo)
- Industry: ${customer.industry}
- Company Size: ${customer.company_size}
- Join Date: ${customer.join_date}
- Last Login: ${customer.last_login}
- Usage Hours: ${customer.usage_hours}
- Support Tickets: ${customer.support_tickets}
- Sentiment Score: ${customer.sentiment_score} (0=very negative, 1=very positive)
- Risk Score: ${customer.risk_score} (0=low risk, 1=high risk)
- Status: ${customer.status}

Recent Activity (last 20 events):
${activities.map(a => `- ${a.event_date}: ${a.event_description}`).join('\n')}

Write a concise forensics report with these sections:
1. PRIMARY CAUSE OF CHURN (1 sentence)
2. KEY WARNING SIGNS (3 bullet points)
3. TIMELINE OF DECLINE (2-3 sentences)
4. RECOMMENDATIONS (3 bullet points to prevent this in future)

Keep it professional and specific to this customer's data. Be concise.
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
    });

    const text = completion.choices[0]?.message?.content || '';
    res.json({ report: text, customer: customer.name });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI generation failed', detail: err.message });
  }
});

// POST /api/ai/retention-email/:customerId
router.post('/retention-email/:customerId', async (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(req.params.customerId);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const prompt = `
You are a customer success manager writing a personalised retention email.

Customer Data:
- Name: ${customer.name}
- Plan: ${customer.plan_type} ($${customer.subscription_value}/mo)
- Industry: ${customer.industry}
- Usage Hours: ${customer.usage_hours} (low usage is a churn signal)
- Support Tickets: ${customer.support_tickets}
- Sentiment Score: ${(customer.sentiment_score * 100).toFixed(0)}%
- Risk Score: ${(customer.risk_score * 100).toFixed(0)}% churn risk
- Last Login: ${customer.last_login}

Write a short, warm, personalised retention email to this customer.
- Address them by first name
- Acknowledge their specific situation (low usage, support issues etc)
- Offer something concrete (a call, a discount, a feature walkthrough)
- Keep it under 150 words
- Do not sound like a template
- Sign off as "Alex, Customer Success Team"

Return only the email body, no subject line.
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
    });

    const text = completion.choices[0]?.message?.content || '';
    res.json({ email: text, customer: customer.name });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI generation failed', detail: err.message });
  }
});

// POST /api/ai/send-email
router.post('/send-email', async (req, res) => {
  try {
    const { to, customerName, emailBody } = req.body;
    console.log('Attempting to send email to:', to);

    const { data, error } = await resend.emails.send({
      from: 'CustomerPulse <onboarding@resend.dev>',
      to: ['amruthavarshini601@gmail.com'],
      subject: 'A personal note from the RetainIQ team',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <p style="color: #374151; line-height: 1.6; white-space: pre-wrap;">${emailBody.replace(/\n/g, '<br/>')}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Sent via CustomerPulse Customer Success Platform</p>
        </div>
      `,
    });

    console.log('Resend data:', JSON.stringify(data));
    console.log('Resend error:', JSON.stringify(error));

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, id: data?.id });

  } catch (err) {
    console.error('CATCH ERROR:', err.message);
    res.status(500).json({ error: 'Email sending failed', detail: err.message });
  }
});

module.exports = router;