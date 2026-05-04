import * as cron from 'node-cron';
import { generateScheduledPost } from './post-generator';
import { refreshExpiringTokens } from './token-refresher';
import { getSettings } from '../openai/prompts';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { logger } from '../logger';

let postJob: ReturnType<typeof cron.schedule> | null = null;
let tokenJob: ReturnType<typeof cron.schedule> | null = null;

// TODO(multi-user): schedule per-user cron expressions instead of using the first user's.
function pickActiveUserId(): number | null {
  const user = db.select().from(schema.users).get();
  return user?.id ?? null;
}

export async function initScheduler(): Promise<void> {
  const userId = pickActiveUserId();
  let postCron = '0 9,13,18 * * *';

  if (userId) {
    const settingsMap = getSettings(userId);
    const raw = settingsMap.post_schedule_cron || '0 9,13,18 * * *';
    postCron = raw.replace(/^"|"$/g, '');
  }

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

  logger.info({ postCron, userId }, 'Scheduler initialized');
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
