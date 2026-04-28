import { db } from '../db/client';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateMentionReply } from '../openai/generator';
import { getSettings } from '../openai/prompts';
import { logger } from '../logger';

/**
 * Processes an incoming mention of our account on Threads.
 * Checks deduplication, settings, and blacklists
 * before generating an AI reply and creating a draft for approval.
 */
export async function processMention(
  threadId: string,
  mentionText: string,
  mentionUsername: string,
): Promise<void> {
  logger.info(
    { threadId, mentionUsername },
    'Processing incoming mention',
  );

  // --- Deduplication check ---
  const existing = db
    .select()
    .from(schema.processedThreads)
    .where(eq(schema.processedThreads.threadsMediaId, threadId))
    .get();

  if (existing) {
    logger.debug({ threadId }, 'Mention already processed, skipping');
    return;
  }

  // --- Load settings ---
  const settings = await getSettings();

  const monitorMentions = settings.monitor_mentions !== 'false';
  if (!monitorMentions) {
    logger.debug('Mention monitoring is disabled, skipping');
    return;
  }

  // --- Blacklist user check ---
  const blacklistUsers = parseJsonArray(settings.blacklist_users);

  if (blacklistUsers.some((user) => user.toLowerCase() === mentionUsername.toLowerCase())) {
    logger.info({ mentionUsername }, 'Mention from blacklisted user, skipping');
    return;
  }

  // --- Generate AI reply ---
  const replyContent = await generateMentionReply(mentionText, mentionUsername);

  logger.info(
    { threadId, replyLength: replyContent.length },
    'AI reply generated for mention',
  );

  // --- Create draft (lazy import to avoid circular deps) ---
  const draftService = await import('./draft.service');

  await draftService.createDraft({
    type: 'mention_reply',
    content: replyContent,
    triggerSource: 'webhook_mention',
    replyToThreadId: threadId,
    replyToText: mentionText,
    replyToUsername: mentionUsername,
  });

  // --- Mark as processed ---
  db.insert(schema.processedThreads)
    .values({
      threadsMediaId: threadId,
      type: 'mention',
    })
    .run();

  logger.info({ threadId }, 'Mention processed and draft created');
}

/**
 * Safely parse a JSON string that should be an array of strings.
 * Returns an empty array on failure.
 */
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
