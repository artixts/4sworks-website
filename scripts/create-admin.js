require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Set ADMIN_EMAIL to the admin email address in .env first.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL in .env first.');
  process.exit(1);
}
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(question) { return new Promise(resolve => rl.question(question, resolve)); }
(async () => {
  try {
    const password = await ask('Create admin password (minimum 12 characters): ');
    if (password.length < 12) throw new Error('Password must be at least 12 characters.');
    const confirm = await ask('Confirm password: ');
    if (password !== confirm) throw new Error('Passwords do not match.');
    const hash = await bcrypt.hash(password, 12);
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : false });
    await pool.query(require('fs').readFileSync(require('path').join(__dirname, '..', 'schema.sql'), 'utf8'));
    await pool.query(
      `INSERT INTO admins (email, password_hash) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [email, hash]
    );
    await pool.end();
    console.log(`Admin account ready for ${email}. Keep the password private.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally { rl.close(); }
})();
