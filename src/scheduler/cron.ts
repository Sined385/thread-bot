import * as cron from 'node-cron';
import { generateScheduledPost } from './post-generator';
import { refreshExpiringTokens } from './token-refresher';
import { getSettings } from '../openai/prompts';
import { logger } from '../logger';

let postJob: ReturnType<typeof cron.schedule> | null = null;
let tokenJob: ReturnType<typeof cron.schedule> | null = null;

export async function initScheduler(): Promise<void> {
  const settingsMap = await getSettings();

  const raw = settingsMap.post_schedule_cron || '"0 9,13,18 * * *"';
  const postCron = raw.replace(/^"|"$/g, ''); // strip JSON quotes

  if (postJob) postJob.stop();
  postJob = cron.schedule(postCron, async () => {
    logger.info('Running scheduled post generation');
    await generateScheduledPost();
  });

  if (tokenJob) tokenJob.stop();
  tokenJob = cron.schedule('0 3 * * *', async () => {
    logger.info('Running token refresh check');
    await refreshExpiringTokens();
  });

  logger.info({ postCron }, 'Scheduler initialized');
}

export function stopScheduler(): void {
  if (postJob) {
    postJob.stop();
    postJob = null;
  }
  if (tokenJob) {
    tokenJob.stop();
    tokenJob = null;
  }
  logger.info('Scheduler stopped');
}
