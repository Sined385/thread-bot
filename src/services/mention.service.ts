import { db } from '../db/client';
import * as schema from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { generateMentionReply } from '../openai/generator';
import { getSettings } from '../openai/prompts';
import { logger } from '../logger';

export async function processMention(
  userId: number,
  threadId: string,
  mentionText: string,
  mentionUsername: string,
): Promise<void> {
  logger.info(
    { userId, threadId, mentionUsername },
    'Processing incoming mention',
  );

  const existingRows = await db
    .select()
    .from(schema.processedThreads)
    .where(
      and(
        eq(schema.processedThreads.userId, userId),
        eq(schema.processedThreads.threadsMediaId, threadId),
      ),
    )
    .limit(1);
  const existing = existingRows[0];

  if (existing) {
    logger.debug({ userId, threadId }, 'Mention already processed, skipping');
    return;
  }

  const settings = await getSettings(userId);

  const monitorMentions = settings.monitor_mentions !== 'false';
  if (!monitorMentions) {
    logger.debug({ userId }, 'Mention monitoring is disabled, skipping');
    return;
  }

  const blacklistUsers = parseJsonArray(settings.blacklist_users);

  if (blacklistUsers.some((user) => user.toLowerCase() === mentionUsername.toLowerCase())) {
    logger.info({ userId, mentionUsername }, 'Mention from blacklisted user, skipping');
    return;
  }

  const replyContent = await generateMentionReply(userId, mentionText, mentionUsername);

  logger.info(
    { userId, threadId, replyLength: replyContent.length },
    'AI reply generated for mention',
  );

  const draftService = await import('./draft.service');

  await draftService.createDraft({
    userId,
    type: 'mention_reply',
    content: replyContent,
    triggerSource: 'webhook_mention',
    replyToThreadId: threadId,
    replyToText: mentionText,
    replyToUsername: mentionUsername,
  });

  await db.insert(schema.processedThreads)
    .values({
      userId,
      threadsMediaId: threadId,
      type: 'mention',
    });

  logger.info({ userId, threadId }, 'Mention processed and draft created');
}

function parseJsonArray(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
    return [];
  } catch {
    return [];
  }
}
