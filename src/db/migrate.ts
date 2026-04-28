import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './data/threads-bot.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    published_thread_id TEXT,
    error_message TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    category TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    options TEXT
  );

  CREATE TABLE IF NOT EXISTS webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT,
    field TEXT,
    payload TEXT NOT NULL,
    processed INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS published_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threads_media_id TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    permalink TEXT,
    draft_id INTEGER REFERENCES drafts(id),
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS processed_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threads_media_id TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);
  CREATE INDEX IF NOT EXISTS idx_drafts_type ON drafts(type);
  CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
  CREATE INDEX IF NOT EXISTS idx_processed_threads_media_id ON processed_threads(threads_media_id);
`);

console.log('Database migrated successfully.');
sqlite.close();
