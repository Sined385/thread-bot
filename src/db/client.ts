import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { config } from '../config';
import * as schema from './schema';
import { logger } from '../logger';
import path from 'path';
import fs from 'fs';

const dbDir = path.dirname(config.DATABASE_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(config.DATABASE_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Idempotent schema bootstrap — runs on every server start so a fresh
// deployment (e.g. Railway with a clean SQLite file) is usable immediately.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    workspace_name TEXT NOT NULL,
    workspace_website TEXT,
    onboarding_completed_at INTEGER,
    telegram_chat_id TEXT,
    telegram_link_token TEXT,
    telegram_link_token_expires_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    threads_user_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    access_token TEXT NOT NULL,
    token_expires_at INTEGER NOT NULL,
    scopes TEXT,
    profile_picture_url TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    content TEXT NOT NULL,
    original_content TEXT,
    reply_to_thread_id TEXT,
    reply_to_text TEXT,
    reply_to_username TEXT,
    telegram_message_id INTEGER,
    telegram_chat_id TEXT,
    trigger_source TEXT NOT NULL,
    scheduled_for INTEGER,
    published_thread_id TEXT,
    error_message TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    category TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    options TEXT
  );

  CREATE UNIQUE INDEX IF NOT EXISTS settings_user_key_unique ON settings(user_id, key);

  CREATE TABLE IF NOT EXISTS webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    topic TEXT,
    field TEXT,
    payload TEXT NOT NULL,
    processed INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS published_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    threads_media_id TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    permalink TEXT,
    draft_id INTEGER REFERENCES drafts(id),
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS processed_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    threads_media_id TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
  CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);
  CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);
  CREATE INDEX IF NOT EXISTS idx_drafts_type ON drafts(type);
  CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
  CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id ON webhook_events(user_id);
  CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
  CREATE INDEX IF NOT EXISTS idx_published_posts_user_id ON published_posts(user_id);
  CREATE INDEX IF NOT EXISTS idx_processed_threads_user_id ON processed_threads(user_id);
  CREATE INDEX IF NOT EXISTS idx_processed_threads_media_id ON processed_threads(threads_media_id);
`);

// Additive ALTER TABLEs for pre-existing databases that predate newer columns.
const additive = [
  'ALTER TABLE users ADD COLUMN onboarding_completed_at INTEGER',
  'ALTER TABLE users ADD COLUMN telegram_chat_id TEXT',
  'ALTER TABLE users ADD COLUMN telegram_link_token TEXT',
  'ALTER TABLE users ADD COLUMN telegram_link_token_expires_at INTEGER',
  'ALTER TABLE drafts ADD COLUMN scheduled_for INTEGER',
];
for (const stmt of additive) {
  try {
    sqlite.exec(stmt);
  } catch (e: any) {
    if (!String(e.message).includes('duplicate column')) throw e;
  }
}

try {
  sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_link_token_unique ON users(telegram_link_token)');
} catch {
  // index already exists
}

try {
  sqlite.exec('CREATE INDEX IF NOT EXISTS idx_drafts_scheduled_for ON drafts(scheduled_for)');
} catch {
  // index already exists
}

logger.info(`Database connected at ${config.DATABASE_PATH}`);

export const db = drizzle(sqlite, { schema });
