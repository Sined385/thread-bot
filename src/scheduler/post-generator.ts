import { logger } from '../logger';
import { generatePost } from '../openai/generator';
import { getSettings } from '../openai/prompts';
import { canPost, getRemainingQuota } from '../threads/rate-limiter';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';

export async function generateScheduledPost(): Promise<void> {
  try {
    const settingsMap = await getSettings();

    if (settingsMap.auto_post_enabled !== 'true') {
      logger.debug('Auto-posting is disabled');
      return;
    }

    const maxPostsPerDay = parseInt(settingsMap.max_posts_per_day || '3', 10);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayPosts = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.drafts)
      .where(
        and(
          eq(schema.drafts.type, 'original_post'),
          gte(schema.drafts.createdAt, todayStart)
        )
      )
      .get();

    if ((todayPosts?.count ?? 0) >= maxPostsPerDay) {
      logger.info(`Daily post limit reached (${maxPostsPerDay})`);
      return;
    }

    if (!canPost()) {
      logger.warn(`Rate limit reached. Remaining quota: ${getRemainingQuota()}`);
      return;
    }

    logger.info('Generating scheduled post...');
    const content = await generatePost();

    const { createDraft } = await import('../services/draft.service');
    await createDraft({
      type: 'original_post',
      content,
      triggerSource: 'scheduled',
    });

    logger.info('Scheduled post draft created');
  } catch (error) {
    logger.error({ error }, 'Failed to generate scheduled post');
  }
}
