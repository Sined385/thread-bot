// Plain ESM, runs under `node` in production (no tsx, no native deps beyond pg).
// Usage: node scripts/reset-password.mjs --email=... --password=...
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';

function arg(name) {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const flag = process.argv.indexOf(`--${name}`);
  if (flag >= 0) return process.argv[flag + 1];
  return undefined;
}

const email = arg('email');
const password = arg('password');

if (!email || !password) {
  console.error('Usage: node scripts/reset-password.mjs --email=foo@bar.com --password=NewPassword123');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : undefined,
});

try {
  const rows = await sql`SELECT id, email FROM users WHERE email = ${email.toLowerCase().trim()}`;
  const row = rows[0];
  if (!row) {
    console.error(`No user with email ${email}.`);
    process.exit(1);
  }

  const hash = bcrypt.hashSync(password, 10);
  await sql`UPDATE users SET password_hash = ${hash}, updated_at = now() WHERE id = ${row.id}`;

  console.log(`Password reset for user #${row.id} (${row.email}).`);
} finally {
  await sql.end();
}
