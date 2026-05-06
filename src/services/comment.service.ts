import { db } from '../db/client';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { generateReply } from '../openai/generator';
import { getSettings } from '../openai/prompts';
import { logger } from '../logger';

export async function processComment(
  userId: number,
  threadId: string,
  commentText: string,
  commentUsername: string,
  parentPostId: string,
): Promise<void> {
  logger.info(
    { userId, threadId, commentUsername, parentPostId },
    'Processing incoming comment',
  );

  const existingRows = await db
    .select()
    .from(schema.processedThreads)
    .where(
      and(
        eq(schema.processedThreads.userId, userId),
        eq(schema.processedThreads.threadsMediaId, threadId),
        eq(schema.processedThreads.type, 'comment'),
      ),
    )
    .limit(1);
  const existing = existingRows[0];

  if (existing) {
    logger.debug({ userId, threadId }, 'Comment already processed, skipping');
    return;
  }

  const settings = await getSettings(userId);

  const monitorComments = settings.monitor_comments !== 'false';
  if (!monitorComments) {
    logger.debug({ userId }, 'Comment monitoring is disabled, skipping');
    return;
  }

  const accountRows = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.userId, userId))
    .limit(1);
  const account = accountRows[0];

  if (account && commentUsername.toLowerCase() === account.username.toLowerCase()) {
    logger.debug({ userId, commentUsername }, 'Comment is from our own account, skipping');
    return;
  }

  const blacklistWords = parseJsonArray(settings.blacklist_words);
  const blacklistUsers = parseJsonArray(settings.blacklist_users);

  if (blacklistUsers.some((user) => user.toLowerCase() === commentUsername.toLowerCase())) {
    logger.info({ userId, commentUsername }, 'Comment from blacklisted user, skipping');
    return;
  }

  const lowerComment = commentText.toLowerCase();
  if (blacklistWords.some((word) => lowerComment.includes(word.toLowerCase()))) {
    logger.info({ userId, threadId }, 'Comment contains blacklisted word, skipping');
    return;
  }

  const minCommentLength = parseInt(settings.min_comment_length || '0', 10);
  if (commentText.trim().length < minCommentLength) {
    logger.debug(
      { userId, length: commentText.trim().length, minCommentLength },
      'Comment too short, skipping',
    );
    return;
  }

  const respondToAll = settings.respond_to_all_comments === 'true';

  if (!respondToAll) {
    const questionDetection = settings.question_detection !== 'false';
    const isQuestion = questionDetection && detectQuestion(commentText);
    const monitorKeywords = parseJsonArray(settings.monitor_keywords);
    const matchesKeyword = monitorKeywords.some((kw) =>
      lowerComment.includes(kw.toLowerCase()),
    );

    if (!isQuestion && !matchesKeyword) {
      logger.debug(
        { userId, threadId },
        'Comment is not a question and does not match keywords, skipping',
      );
      return;
    }
  }

  const replyContent = await generateReply(userId, commentText, commentUsername);

  logger.info({ userId, threadId, replyLength: replyContent.length }, 'AI reply generated for comment');

  const draftService = await import('./draft.service');

  await draftService.createDraft({
    userId,
    type: 'reply',
    content: replyContent,
    triggerSource: 'webhook_comment',
    replyToThreadId: threadId,
    replyToText: commentText,
    replyToUsername: commentUsername,
  });

  await db.insert(schema.processedThreads)
    .values({
      userId,
      threadsMediaId: threadId,
      type: 'comment',
    });

  logger.info({ userId, threadId }, 'Comment processed and draft created');
}

function detectQuestion(text: string): boolean {
  const trimmed = text.trim();

  if (trimmed.endsWith('?')) {
    return true;
  }

  const questionStarters = [
    'who', 'what', 'when', 'where', 'why', 'how',
    'is', 'are', 'was', 'were', 'do', 'does', 'did',
    'can', 'could', 'would', 'should', 'will',
    'have', 'has', 'had',
  ];

  const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase() ?? '';
  return questionStarters.includes(firstWord);
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
