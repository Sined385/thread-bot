import { db } from '../db/client';
import * as schema from '../db/schema';
import { sql, gte } from 'drizzle-orm';

const DAILY_POST_LIMIT = 250;

function getStartOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function getUsedToday(): Promise<number> {
  const startOfDay = getStartOfTodayUTC();

  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.publishedPosts)
    .where(gte(schema.publishedPosts.createdAt, startOfDay));

  return rows[0]?.count ?? 0;
}

export async function canPost(): Promise<boolean> {
  return (await getUsedToday()) < DAILY_POST_LIMIT;
}

export async function getRemainingQuota(): Promise<number> {
  const used = await getUsedToday();
  return Math.max(0, DAILY_POST_LIMIT - used);
}
