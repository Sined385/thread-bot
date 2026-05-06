import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import * as schema from './schema';
import { logger } from '../logger';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const isProd = process.env.NODE_ENV === 'production';

// Long-lived pool for normal queries.
const queryClient = postgres(connectionString, {
  max: 10,
  ssl: isProd ? 'require' : undefined,
  prepare: false,
});

logger.info('Postgres connection initialized');

export const db = drizzle(queryClient, { schema });

/**
 * Apply pending migrations from ./drizzle. Idempotent — Drizzle keeps
 * track of which have run in a __drizzle_migrations table. Runs once
 * at startup before the server takes traffic.
 */
export async function runMigrations(): Promise<void> {
  const migrationClient = postgres(connectionString!, {
    max: 1,
    ssl: isProd ? 'require' : undefined,
    prepare: false,
  });
  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: path.join(__dirname, '..', '..', 'drizzle'),
    });
    logger.info('Database migrations applied');
  } finally {
    await migrationClient.end();
  }
}
