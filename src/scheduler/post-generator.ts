import { logger } from '../logger';
import { generatePost } from '../openai/generator';
import { getSettings } from '../openai/prompts';
import { canPost, getRemainingQuota } from '../threads/rate-limiter';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';

const DAY_START_HOUR = 9;
const DAY_START_MIN = 30;
const DAY_END_HOUR = 17;
const DAY_END_MIN = 30;

/**
 * Compute N evenly-spaced slots between 09:30 and 17:30 of "today".
 * For N=1, returns the midpoint. For N=3, returns ~09:30, 13:30, 17:30.
 */
export function computeDailySlots(now: Date, count: number): Date[] {
  if (count <= 0) return [];

  const start = new Date(now);
  start.setHours(DAY_START_HOUR, DAY_START_MIN, 0, 0);

  const end = new Date(now);
  end.setHours(DAY_END_HOUR, DAY_END_MIN, 0, 0);

  if (count === 1) {
    return [new Date((start.getTime() + end.getTime()) / 2)];
  }

  const stepMs = (end.getTime() - start.getTime()) / (count - 1);
  const slots: Date[] = [];
  for (let i = 0; i < count; i++) {
    slots.push(new Date(start.getTime() + stepMs * i));
  }
  return slots;
}

/**
 * Generate the day's plan for one user: N drafts (per max_posts_per_day),
 * each with a proposed scheduled_for slot.
 *
 * Slots already in the past are skipped — useful for ad-hoc generation
 * triggered later in the day.
 */
export async function generateDailyPlan(userId: number): Promise<void> {
  try {
    const settings = getSettings(userId);

    if (settings.auto_post_enabled !== 'true') {
      logger.debug({ userId }, 'auto_post_enabled is false, skipping daily plan');
      return;
    }

    const account = db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.userId, userId))
      .get();
    if (!account) {
      logger.debug({ userId }, 'No Threads account, skipping daily plan');
      return;
    }

    const maxPerDay = parseInt(settings.max_posts_per_day || '3', 10);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Don't double-up if the cron got triggered twice today.
    const todayCount = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.drafts)
      .where(
        and(
          eq(schema.drafts.userId, userId),
          eq(schema.drafts.type, 'original_post'),
          eq(schema.drafts.triggerSource, 'scheduled'),
          gte(schema.drafts.createdAt, todayStart),
        ),
      )
      .get();
    if ((todayCount?.count ?? 0) >= maxPerDay) {
      logger.info({ userId, maxPerDay }, 'daily plan already generated for today, skipping');
      return;
    }

    const now = new Date();
    const slots = computeDailySlots(now, maxPerDay).filter((s) => s.getTime() > now.getTime());

    if (slots.length === 0) {
      logger.info({ userId }, 'No future slots remaining today; skipping daily plan');
      return;
    }

    if (!canPost()) {
      logger.warn({ remaining: getRemainingQuota() }, 'Rate limit reached; skipping daily plan');
      return;
    }

    const { createDraft } = await import('../services/draft.service');
    for (const slot of slots) {
      try {
        const content = await generatePost(userId);
        await createDraft({
          userId,
          type: 'original_post',
          content,
          triggerSource: 'scheduled',
          scheduledFor: slot,
        });
      } catch (error) {
        logger.error({ error, userId, slot }, 'Failed to generate one daily plan slot');
      }
    }

    logger.info({ userId, slotCount: slots.length }, 'Daily plan generated');
  } catch (error) {
    logger.error({ error, userId }, 'Failed to generate daily plan');
  }
}

/**
 * Run generateDailyPlan for every user in the database. Used by the 9 AM cron.
 */
export async function generateDailyPlanForAll(): Promise<void> {
  const allUsers = db.select({ id: schema.users.id }).from(schema.users).all();
  for (const user of allUsers) {
    await generateDailyPlan(user.id);
  }
}
