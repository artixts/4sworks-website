require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || '';
const isProduction = process.env.NODE_ENV === 'production';

if (JWT_SECRET.length < 32 || JWT_SECRET.startsWith('REPLACE_')) {
  console.error('ERROR: Set JWT_SECRET to a unique random secret of at least 32 characters in .env.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is missing. Copy .env.example to .env and configure PostgreSQL.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null
    }
  }
}));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' }
});
const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Too many enquiries from this connection. Please try again later.' }
});

function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function auth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Please sign in.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.role !== 'admin' || !Number.isInteger(payload.sub)) throw new Error('Invalid role');
    req.admin = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.post('/api/enquiries', enquiryLimiter, async (req, res) => {
  const name = cleanText(req.body.name, 100);
  const phone = cleanText(req.body.phone, 30);
  const service = cleanText(req.body.service, 50);
  const message = cleanText(req.body.message, 2000);
  const allowedServices = ['Plumbing', 'Electrical work', 'General maintenance', 'Carpentry', 'Aluminium fabrication', 'CCTV installation', 'Yard paving', 'Other'];

  if (name.length < 2) return res.status(400).json({ error: 'Enter your name (at least 2 characters).' });
  if (!/^[+()0-9\s.-]{7,30}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number.' });
  if (!allowedServices.includes(service)) return res.status(400).json({ error: 'Choose a valid service.' });
  if (req.body.message != null && typeof req.body.message !== 'string') {
    return res.status(400).json({ error: 'Message must be text.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO enquiries (name, phone, service, message) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
      [name, phone, service, message]
    );
    return res.status(201).json({ message: 'Enquiry received.', id: result.rows[0].id });
  } catch (err) {
    console.error('Enquiry insert failed:', err.message);
    return res.status(500).json({ error: 'We could not save your enquiry. Please try again later.' });
  }
});

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const email = cleanText(req.body.email, 254).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!validEmail(email) || password.length < 1 || password.length > 200) {
    return res.status(400).json({ error: 'Enter a valid email and password.' });
  }
  try {
    const result = await pool.query('SELECT id, email, password_hash FROM admins WHERE email = $1', [email]);
    const admin = result.rows[0];
    const matched = admin ? await bcrypt.compare(password, admin.password_hash) : false;
    if (!matched) return res.status(401).json({ error: 'Invalid email or password.' });

    await pool.query('UPDATE admins SET last_login_at = NOW() WHERE id = $1', [admin.id]);
    const token = jwt.sign({ email: admin.email, role: 'admin' }, JWT_SECRET, {
      algorithm: 'HS256', subject: String(admin.id), expiresIn: process.env.JWT_EXPIRES_IN || '2h'
    });
    return res.json({ token, admin: { email: admin.email }, expiresIn: process.env.JWT_EXPIRES_IN || '2h' });
  } catch (err) {
    console.error('Admin login failed:', err.message);
    return res.status(500).json({ error: 'Login is temporarily unavailable.' });
  }
});

app.get('/api/admin/me', auth, (req, res) => res.json({ admin: req.admin }));

app.get('/api/admin/enquiries', auth, async (req, res) => {
  const status = cleanText(req.query.status, 20);
  const allowed = ['', 'new', 'contacted', 'closed'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status filter.' });
  try {
    const result = status
      ? await pool.query('SELECT id, name, phone, service, message, status, created_at FROM enquiries WHERE status = $1 ORDER BY created_at DESC LIMIT 500', [status])
      : await pool.query('SELECT id, name, phone, service, message, status, created_at FROM enquiries ORDER BY created_at DESC LIMIT 500');
    res.json({ enquiries: result.rows });
  } catch (err) {
    console.error('Enquiry list failed:', err.message);
    res.status(500).json({ error: 'Could not load enquiries.' });
  }
});

app.patch('/api/admin/enquiries/:id/status', auth, async (req, res) => {
  const id = Number(req.params.id);
  const status = cleanText(req.body.status, 20);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid enquiry ID.' });
  if (!['new', 'contacted', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  try {
    const result = await pool.query('UPDATE enquiries SET status = $1 WHERE id = $2 RETURNING id, status', [status, id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Enquiry not found.' });
    res.json({ enquiry: result.rows[0] });
  } catch (err) {
    console.error('Enquiry update failed:', err.message);
    res.status(500).json({ error: 'Could not update enquiry.' });
  }
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found.' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'), err => { if (err) next(err); });
});
app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err.message);
  res.status(500).json({ error: 'Unexpected server error.' });
});

async function start() {
  await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  app.listen(PORT, () => console.log(`4Sworks is running at http://localhost:${PORT}`));
}
start().catch(err => {
  console.error('Could not start server or initialize database:', err.message);
  process.exit(1);
});
process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
