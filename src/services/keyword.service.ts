import { db } from '../db/client';
import * as schema from '../db/schema';
import { getSettings } from '../openai/prompts';
import { generateReply } from '../openai/generator';
import { logger } from '../logger';

/**
 * Checks if an incoming comment matches any monitored keywords.
 * If a match is found, generates an AI reply with keyword context
 * and creates a draft for approval.
 */
export async function checkKeywords(
  commentText: string,
  commentUsername: string,
  threadId: string,
  parentPostId: string,
): Promise<void> {
  logger.debug({ threadId, commentUsername }, 'Checking comment for keyword matches');

  // --- Load keywords from settings ---
  const settings = await getSettings();
  const monitorKeywords = parseJsonArray(settings.monitor_keywords);

  if (monitorKeywords.length === 0) {
    logger.debug('No monitor keywords configured, skipping keyword check');
    return;
  }

  // --- Case-insensitive keyword matching ---
  const lowerComment = commentText.toLowerCase();
  const matchedKeywords: string[] = [];

  for (const keyword of monitorKeywords) {
    if (lowerComment.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }

  if (matchedKeywords.length === 0) {
    logger.debug({ threadId }, 'No keyword matches found');
    return;
  }

  logger.info(
    { threadId, matchedKeywords, commentUsername },
    'Keyword match found in comment',
  );

  // --- Generate AI reply with keyword context ---
  const keywordContext = `This comment matched the following keywords: ${matchedKeywords.join(', ')}. ` +
    'Incorporate awareness of the matched topic into the reply.';

  const replyContent = await generateReply(commentText, commentUsername, keywordContext);

  logger.info(
    { threadId, replyLength: replyContent.length, matchedKeywords },
    'AI reply generated for keyword match',
  );

  // --- Create draft (lazy import to avoid circular deps) ---
  const draftService = await import('./draft.service');

  await draftService.createDraft({
    type: 'keyword_reply',
    content: replyContent,
    triggerSource: 'keyword_match',
    replyToThreadId: threadId,
    replyToText: commentText,
    replyToUsername: commentUsername,
  });

  logger.info({ threadId, matchedKeywords }, 'Keyword reply draft created');
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
