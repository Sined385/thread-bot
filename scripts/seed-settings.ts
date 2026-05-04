import dotenv from 'dotenv';
dotenv.config();

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { DEFAULT_SETTINGS } from '../src/services/settings.service';

const dbPath = process.env.DATABASE_PATH || './data/threads-bot.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);

function parseUserId(): number | null {
  const arg = process.argv.find((a) => a.startsWith('--user-id='));
  if (arg) {
    const id = parseInt(arg.split('=')[1], 10);
    return Number.isFinite(id) ? id : null;
  }
  const flagIndex = process.argv.indexOf('--user-id');
  if (flagIndex >= 0) {
    const id = parseInt(process.argv[flagIndex + 1], 10);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

let userId = parseUserId();
if (userId === null) {
  const row = sqlite.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get() as { id: number } | undefined;
  userId = row?.id ?? null;
}

if (userId === null) {
  console.error('No users found. Sign up first, or pass --user-id=N.');
  sqlite.close();
  process.exit(1);
}

const stmt = sqlite.prepare(`
  INSERT OR IGNORE INTO settings (user_id, key, value, category, label, description, type, options)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const setting of DEFAULT_SETTINGS) {
  stmt.run(
    userId,
    setting.key,
    JSON.stringify(setting.value),
    setting.category,
    setting.label,
    setting.description,
    setting.type,
    setting.options ? JSON.stringify(setting.options) : null,
  );
}

console.log(`Seeded ${DEFAULT_SETTINGS.length} settings for user_id=${userId}.`);
sqlite.close();
