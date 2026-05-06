const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../data/retention.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    company_id INTEGER,
    role TEXT DEFAULT 'admin',
    created_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1,
    customer_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    join_date TEXT NOT NULL,
    last_login TEXT NOT NULL,
    usage_hours REAL DEFAULT 0,
    support_tickets INTEGER DEFAULT 0,
    sentiment_score REAL DEFAULT 0.5,
    subscription_value REAL DEFAULT 0,
    risk_score REAL DEFAULT 0,
    status TEXT DEFAULT 'Active',
    industry TEXT,
    company_size TEXT
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1,
    customer_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_description TEXT,
    event_date TEXT NOT NULL,
    metadata TEXT
  );

  CREATE TABLE IF NOT EXISTS retention_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1,
    customer_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    created_at TEXT NOT NULL,
    actioned_at TEXT
  );

  CREATE TABLE IF NOT EXISTS forensics_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1,
    customer_id TEXT NOT NULL,
    cancellation_date TEXT NOT NULL,
    primary_cause TEXT,
    contributing_factors TEXT,
    sentiment_trend TEXT,
    report_summary TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS risk_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1,
    customer_id TEXT NOT NULL,
    score REAL NOT NULL,
    score_date TEXT NOT NULL,
    factors TEXT
  );
`);

console.log('Database initialized successfully');

module.exports = db;