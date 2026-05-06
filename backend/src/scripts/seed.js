const db = require('../db/database');

const firstNames = ['James','Sarah','Michael','Emma','David','Olivia','Daniel','Sophia','Chris','Ava','Ryan','Isabella','Kevin','Mia','Brian','Charlotte','Jason','Amelia','Tyler','Harper','Nathan','Evelyn','Justin','Abigail','Brandon','Emily','Samuel','Elizabeth','Benjamin','Sofia'];
const lastNames = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Young','Robinson','Lewis','Walker','Hall','Allen','King','Wright','Scott','Green','Baker','Adams','Nelson'];
const companies = ['Acme Corp','TechFlow','DataSync','CloudBase','NexGen','PixelWave','CoreSystems','Bright Labs','Apex Digital','Nova Tech','Synapse Co','Orbit Inc','Pulse Media','Vertex AI','Stellar IO'];
const plans = ['Starter','Professional','Enterprise','Business'];
const industries = ['SaaS','E-commerce','Healthcare','Finance','Education','Retail','Logistics','Media'];
const companySizes = ['1-10','11-50','51-200','201-500','500+'];

const eventTypes = [
  'login', 'logout', 'feature_used', 'support_ticket_opened',
  'support_ticket_closed', 'payment_made', 'report_generated',
  'export_data', 'settings_changed', 'integration_added',
  'user_invited', 'dashboard_viewed', 'api_called', 'upgrade_viewed'
];

const eventDescriptions = {
  login: 'User logged into the platform',
  logout: 'User logged out of the platform',
  feature_used: ['Used analytics dashboard','Used export feature','Ran churn report','Used customer segmentation','Viewed retention metrics'],
  support_ticket_opened: ['Opened ticket: Billing issue','Opened ticket: Feature not working','Opened ticket: Integration problem','Opened ticket: Performance issue'],
  support_ticket_closed: 'Support ticket resolved',
  payment_made: 'Monthly subscription payment processed',
  report_generated: 'Generated monthly analytics report',
  export_data: 'Exported customer data to CSV',
  settings_changed: 'Updated account settings',
  integration_added: ['Added Slack integration','Added Salesforce integration','Added HubSpot integration'],
  user_invited: 'Invited new team member',
  dashboard_viewed: 'Viewed main dashboard',
  api_called: 'API endpoint accessed',
  upgrade_viewed: 'Viewed upgrade/pricing page'
};

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max));
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo, daysAgoEnd = 0) {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(daysAgoEnd, daysAgo));
  return date.toISOString().split('T')[0];
}

function generateCustomer(index) {
  const firstName = randomItem(firstNames);
  const lastName = randomItem(lastNames);
  const company = randomItem(companies);
  const plan = randomItem(plans);
  const status = Math.random() < 0.18 ? 'Cancelled' : 'Active';

  const planValues = { Starter: 49, Professional: 149, Business: 299, Enterprise: 599 };
  const baseValue = planValues[plan];

  const joinDate = randomDate(730, 30);
  const lastLogin = status === 'Cancelled' ? randomDate(120, 30) : randomDate(30, 0);

  const usageHours = status === 'Cancelled'
    ? randomBetween(0.5, 8)
    : randomBetween(5, 60);

  const supportTickets = status === 'Cancelled'
    ? randomInt(3, 12)
    : randomInt(0, 5);

  const sentimentScore = status === 'Cancelled'
    ? randomBetween(0.1, 0.4)
    : randomBetween(0.4, 0.95);

  const riskScore = status === 'Cancelled'
    ? randomBetween(0.7, 0.99)
    : sentimentScore < 0.5
    ? randomBetween(0.5, 0.85)
    : randomBetween(0.05, 0.45);

  return {
    customer_id: `CUST-${String(index + 1).padStart(4, '0')}`,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s/g, '')}.com`,
    plan_type: plan,
    join_date: joinDate,
    last_login: lastLogin,
    usage_hours: parseFloat(usageHours.toFixed(1)),
    support_tickets: supportTickets,
    sentiment_score: parseFloat(sentimentScore.toFixed(2)),
    subscription_value: baseValue,
    risk_score: parseFloat(riskScore.toFixed(2)),
    status,
    industry: randomItem(industries),
    company_size: randomItem(companySizes)
  };
}

function generateActivityLog(customerId, status) {
  const events = [];
  const numEvents = status === 'Cancelled' ? randomInt(5, 15) : randomInt(10, 40);

  for (let i = 0; i < numEvents; i++) {
    const eventType = randomItem(eventTypes);
    const descSource = eventDescriptions[eventType];
    const description = Array.isArray(descSource) ? randomItem(descSource) : descSource;

    events.push({
      customer_id: customerId,
      event_type: eventType,
      event_description: description,
      event_date: randomDate(180, 0),
      metadata: JSON.stringify({ source: 'web', session: `sess_${Math.random().toString(36).substr(2, 9)}` })
    });
  }

  return events;
}

function generateRetentionActions(customerId, riskScore) {
  if (riskScore < 0.5) return [];

  const actions = [
    { type: 'discount_offer', suggestion: 'Offer 20% discount on next 3 months to retain customer' },
    { type: 'personal_outreach', suggestion: 'Schedule a personal check-in call with customer success manager' },
    { type: 'feature_demo', suggestion: 'Send personalized demo of underused Enterprise features' },
    { type: 'plan_downgrade', suggestion: 'Offer plan downgrade option to reduce friction' },
    { type: 'success_review', suggestion: 'Conduct quarterly business review to realign on value' },
  ];

  const action = randomItem(actions);
  return [{
    customer_id: customerId,
    action_type: action.type,
    suggestion: action.suggestion,
    status: randomItem(['Pending', 'Approved', 'Sent']),
    created_at: new Date().toISOString()
  }];
}

// Clear existing data
db.exec('DELETE FROM customers');
db.exec('DELETE FROM activity_log');
db.exec('DELETE FROM retention_actions');
db.exec('DELETE FROM risk_scores');
db.exec('DELETE FROM forensics_reports');

console.log('Seeding 400 customers...');

const insertCustomer = db.prepare(`
  INSERT INTO customers (customer_id, name, email, plan_type, join_date, last_login, usage_hours, support_tickets, sentiment_score, subscription_value, risk_score, status, industry, company_size)
  VALUES (@customer_id, @name, @email, @plan_type, @join_date, @last_login, @usage_hours, @support_tickets, @sentiment_score, @subscription_value, @risk_score, @status, @industry, @company_size)
`);

const insertActivity = db.prepare(`
  INSERT INTO activity_log (customer_id, event_type, event_description, event_date, metadata)
  VALUES (@customer_id, @event_type, @event_description, @event_date, @metadata)
`);

const insertRetention = db.prepare(`
  INSERT INTO retention_actions (customer_id, action_type, suggestion, status, created_at)
  VALUES (@customer_id, @action_type, @suggestion, @status, @created_at)
`);

const insertRisk = db.prepare(`
  INSERT INTO risk_scores (customer_id, score, score_date, factors)
  VALUES (@customer_id, @score, @score_date, @factors)
`);

const seedAll = db.transaction(() => {
  for (let i = 0; i < 400; i++) {
    const customer = generateCustomer(i);
    insertCustomer.run(customer);

    const activities = generateActivityLog(customer.customer_id, customer.status);
    for (const activity of activities) {
      insertActivity.run(activity);
    }

    const actions = generateRetentionActions(customer.customer_id, customer.risk_score);
    for (const action of actions) {
      insertRetention.run(action);
    }

    insertRisk.run({
      customer_id: customer.customer_id,
      score: customer.risk_score,
      score_date: new Date().toISOString().split('T')[0],
      factors: JSON.stringify({
        usage: customer.usage_hours,
        support: customer.support_tickets,
        sentiment: customer.sentiment_score,
        lastLogin: customer.last_login
      })
    });
  }
});

seedAll();

console.log('✓ 400 customers inserted');
console.log('✓ Activity logs generated');
console.log('✓ Retention actions generated');
console.log('✓ Risk scores generated');
console.log('Done! Database is ready.');