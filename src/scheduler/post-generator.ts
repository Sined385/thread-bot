import { logger } from '../logger';
import { generatePost } from '../openai/generator';
import { getSettings } from '../openai/prompts';
import { canPost, getRemainingQuota } from '../threads/rate-limiter';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';

// TODO(multi-user): iterate over every user with auto_post_enabled instead of picking the first.
function pickActiveUserId(): number | null {
  const user = db.select().from(schema.users).get();
  return user?.id ?? null;
}

export async function generateScheduledPost(): Promise<void> {
  try {
    const userId = pickActiveUserId();
    if (!userId) {
      logger.debug('No users registered, skipping scheduled post');
      return;
    }

    const settingsMap = getSettings(userId);

    if (settingsMap.auto_post_enabled !== 'true') {
      logger.debug({ userId }, 'Auto-posting is disabled');
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
          eq(schema.drafts.userId, userId),
          eq(schema.drafts.type, 'original_post'),
          gte(schema.drafts.createdAt, todayStart),
        ),
      )
      .get();

    if ((todayPosts?.count ?? 0) >= maxPostsPerDay) {
      logger.info({ userId, maxPostsPerDay }, 'Daily post limit reached');
      return;
    }

    if (!canPost()) {
      logger.warn(`Rate limit reached. Remaining quota: ${getRemainingQuota()}`);
      return;
    }

    logger.info({ userId }, 'Generating scheduled post');
    const content = await generatePost(userId);

    const { createDraft } = await import('../services/draft.service');
    await createDraft({
      userId,
      type: 'original_post',
      content,
      triggerSource: 'scheduled',
    });

    logger.info({ userId }, 'Scheduled post draft created');
  } catch (error) {
    logger.error({ error }, 'Failed to generate scheduled post');
  }
}
