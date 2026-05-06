const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
const auth = require('./middleware/auth');

app.use(cors());
app.use(express.json());

require('./db/database');

// Public routes (no auth needed)
app.use('/api/auth', require('./routes/auth'));

// Protected routes (auth required)
app.use('/api/customers', auth, require('./routes/customers'));
app.use('/api/dashboard', auth, require('./routes/dashboard'));
app.use('/api/retention-actions', auth, require('./routes/retentionActions'));
app.use('/api/upload', auth, require('./routes/upload'));
app.use('/api/ai', auth, require('./routes/ai'));
app.use('/api/chat', auth, require('./routes/chat'));
app.use('/api/report', auth, require('./routes/report'));
app.use('/api/winback', auth, require('./routes/winback'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});