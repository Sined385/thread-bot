import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function arg(name: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const flag = process.argv.indexOf(`--${name}`);
  if (flag >= 0) return process.argv[flag + 1];
  return undefined;
}

const email = arg('email');
const password = arg('password');

if (!email || !password) {
  console.error('Usage: tsx scripts/reset-password.ts --email=foo@bar.com --password=NewPassword123');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const dbPath = process.env.DATABASE_PATH || './data/threads-bot.db';
if (!fs.existsSync(dbPath)) {
  console.error(`No database at ${dbPath}.`);
  process.exit(1);
}
console.log(`Using database at ${path.resolve(dbPath)}`);

const sqlite = new Database(dbPath);

const row = sqlite.prepare('SELECT id, email FROM users WHERE email = ?').get(email.toLowerCase().trim()) as { id: number; email: string } | undefined;
if (!row) {
  console.error(`No user with email ${email}.`);
  sqlite.close();
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
sqlite.prepare('UPDATE users SET password_hash = ?, updated_at = unixepoch() WHERE id = ?').run(hash, row.id);

console.log(`Password reset for user #${row.id} (${row.email}).`);
sqlite.close();
