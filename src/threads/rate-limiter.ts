import { db } from '../db/client';
import * as schema from '../db/schema';
import { sql, gte } from 'drizzle-orm';

const DAILY_POST_LIMIT = 250;

/**
 * Get the start-of-day timestamp (midnight UTC) for today.
 */
function getStartOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Count the number of posts published today (UTC).
 */
export function getUsedToday(): number {
  const startOfDay = getStartOfTodayUTC();

  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.publishedPosts)
    .where(gte(schema.publishedPosts.createdAt, startOfDay))
    .get();

  return result?.count ?? 0;
}

/**
 * Check whether we can still publish a post today without exceeding the daily limit.
 */
export function canPost(): boolean {
  return getUsedToday() < DAILY_POST_LIMIT;
}

/**
 * Get the remaining number of posts that can be published today.
 */
export function getRemainingQuota(): number {
  const used = getUsedToday();
  return Math.max(0, DAILY_POST_LIMIT - used);
}
