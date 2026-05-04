import { getSettings } from '../openai/prompts';
import { generateReply } from '../openai/generator';
import { logger } from '../logger';

export async function checkKeywords(
  userId: number,
  commentText: string,
  commentUsername: string,
  threadId: string,
  parentPostId: string,
): Promise<void> {
  logger.debug({ userId, threadId, commentUsername }, 'Checking comment for keyword matches');

  const settings = getSettings(userId);
  const monitorKeywords = parseJsonArray(settings.monitor_keywords);

  if (monitorKeywords.length === 0) {
    logger.debug({ userId }, 'No monitor keywords configured, skipping keyword check');
    return;
  }

  const lowerComment = commentText.toLowerCase();
  const matchedKeywords: string[] = [];

  for (const keyword of monitorKeywords) {
    if (lowerComment.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }

  if (matchedKeywords.length === 0) {
    logger.debug({ userId, threadId }, 'No keyword matches found');
    return;
  }

  logger.info(
    { userId, threadId, matchedKeywords, commentUsername },
    'Keyword match found in comment',
  );

  const keywordContext = `This comment matched the following keywords: ${matchedKeywords.join(', ')}. ` +
    'Incorporate awareness of the matched topic into the reply.';

  const replyContent = await generateReply(userId, commentText, commentUsername, keywordContext);

  logger.info(
    { userId, threadId, replyLength: replyContent.length, matchedKeywords },
    'AI reply generated for keyword match',
  );

  const draftService = await import('./draft.service');

  await draftService.createDraft({
    userId,
    type: 'keyword_reply',
    content: replyContent,
    triggerSource: 'keyword_match',
    replyToThreadId: threadId,
    replyToText: commentText,
    replyToUsername: commentUsername,
  });

  logger.info({ userId, threadId, matchedKeywords }, 'Keyword reply draft created');
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
