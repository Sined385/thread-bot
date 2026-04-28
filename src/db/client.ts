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

logger.info(`Database connected at ${config.DATABASE_PATH}`);

export const db = drizzle(sqlite, { schema });
