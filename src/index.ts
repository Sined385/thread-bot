import { config } from './config';
import { logger } from './logger';
import { runMigrations } from './db/client';
import { startServer } from './web/server';
import { initTelegramBot } from './telegram/bot';
import { initScheduler } from './scheduler/cron';

async function main() {
  logger.info({ nodeEnv: config.NODE_ENV }, 'Starting Threads Bot...');

  // Apply pending migrations before serving traffic.
  try {
    await runMigrations();
    logger.info('Database initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize database');
    process.exit(1);
  }

  startServer();

  try {
    await initTelegramBot();
    logger.info('Telegram bot started');
  } catch (error) {
    logger.error({ error }, 'Failed to start Telegram bot');
  }

  try {
    await initScheduler();
    logger.info('Scheduler initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize scheduler');
  }

  logger.info('Threads Bot is running');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
