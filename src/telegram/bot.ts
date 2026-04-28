import { Bot } from 'grammy';
import { config } from '../config';
import { logger } from '../logger';

export const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

bot.catch((err) => {
  const ctx = err.ctx;
  logger.error(
    { error: err.error, update_id: ctx.update.update_id },
    `Error while handling update ${ctx.update.update_id}`,
  );
});

export async function initTelegramBot(): Promise<void> {
  const { registerHandlers } = await import('./handlers');
  registerHandlers();

  bot.start({
    onStart: (botInfo) => {
      logger.info(`Telegram bot @${botInfo.username} started polling`);
    },
  }).catch((error) => {
    logger.error({ error }, 'Telegram bot polling failed (is TELEGRAM_BOT_TOKEN valid?)');
  });
}
