import * as cron from 'node-cron';
import { generateDailyPlanForAll } from './post-generator';
import { publishScheduledDrafts } from './scheduled-publisher';
import { refreshExpiringTokens } from './token-refresher';
import { logger } from '../logger';

let dailyPlanJob: ReturnType<typeof cron.schedule> | null = null;
let publisherJob: ReturnType<typeof cron.schedule> | null = null;
let tokenJob: ReturnType<typeof cron.schedule> | null = null;

export async function initScheduler(): Promise<void> {
  if (dailyPlanJob) dailyPlanJob.stop();
  dailyPlanJob = cron.schedule('0 9 * * *', async () => {
    logger.info('Running daily content plan generation');
    await generateDailyPlanForAll();
  });

  if (publisherJob) publisherJob.stop();
  publisherJob = cron.schedule('* * * * *', async () => {
    await publishScheduledDrafts();
  });

  if (tokenJob) tokenJob.stop();
  tokenJob = cron.schedule('0 3 * * *', async () => {
    logger.info('Running token refresh check');
    await refreshExpiringTokens();
  });

  logger.info(
    { dailyPlan: '0 9 * * *', publisher: '* * * * *', tokens: '0 3 * * *' },
    'Scheduler initialized',
  );
}

export function stopScheduler(): void {
  if (dailyPlanJob) {
    dailyPlanJob.stop();
    dailyPlanJob = null;
  }
  if (publisherJob) {
    publisherJob.stop();
    publisherJob = null;
  }
  if (tokenJob) {
    tokenJob.stop();
    tokenJob = null;
  }
  logger.info('Scheduler stopped');
}
