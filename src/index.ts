import { config } from './config';
import { logger } from './logger';
import { startServer } from './web/server';
import { initTelegramBot } from './telegram/bot';
import { initScheduler } from './scheduler/cron';

async function main() {
  logger.info('Starting Threads Bot...');

  // Run migrations
  try {
    await import('./db/client');
    logger.info('Database initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize database');
    process.exit(1);
  }

  // Start Express server
  startServer();

  // Start Telegram bot
  try {
    await initTelegramBot();
    logger.info('Telegram bot started');
  } catch (error) {
    logger.error({ error }, 'Failed to start Telegram bot');
  }

  // Start scheduler
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
