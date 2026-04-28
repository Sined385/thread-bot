import { db } from '../db/client';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { generateReply } from '../openai/generator';
import { getSettings } from '../openai/prompts';
import { logger } from '../logger';

/**
 * Processes an incoming comment on one of our posts.
 * Checks deduplication, settings, blacklists, and question detection
 * before generating an AI reply and creating a draft for approval.
 */
export async function processComment(
  threadId: string,
  commentText: string,
  commentUsername: string,
  parentPostId: string,
): Promise<void> {
  logger.info(
    { threadId, commentUsername, parentPostId },
    'Processing incoming comment',
  );

  // --- Deduplication check ---
  const existing = db
    .select()
    .from(schema.processedThreads)
    .where(
      and(
        eq(schema.processedThreads.threadsMediaId, threadId),
        eq(schema.processedThreads.type, 'comment'),
      ),
    )
    .get();

  if (existing) {
    logger.debug({ threadId }, 'Comment already processed, skipping');
    return;
  }

  // --- Load settings ---
  const settings = await getSettings();

  const monitorComments = settings.monitor_comments !== 'false';
  if (!monitorComments) {
    logger.debug('Comment monitoring is disabled, skipping');
    return;
  }

  // --- Skip own comments ---
  const account = db
    .select()
    .from(schema.accounts)
    .limit(1)
    .get();

  if (account && commentUsername.toLowerCase() === account.username.toLowerCase()) {
    logger.debug({ commentUsername }, 'Comment is from our own account, skipping');
    return;
  }

  // --- Blacklist checks ---
  const blacklistWords = parseJsonArray(settings.blacklist_words);
  const blacklistUsers = parseJsonArray(settings.blacklist_users);

  if (blacklistUsers.some((user) => user.toLowerCase() === commentUsername.toLowerCase())) {
    logger.info({ commentUsername }, 'Comment from blacklisted user, skipping');
    return;
  }

  const lowerComment = commentText.toLowerCase();
  if (blacklistWords.some((word) => lowerComment.includes(word.toLowerCase()))) {
    logger.info({ threadId }, 'Comment contains blacklisted word, skipping');
    return;
  }

  // --- Minimum length check ---
  const minCommentLength = parseInt(settings.min_comment_length || '0', 10);
  if (commentText.trim().length < minCommentLength) {
    logger.debug(
      { length: commentText.trim().length, minCommentLength },
      'Comment too short, skipping',
    );
    return;
  }

  // --- Respond-to-all vs question/keyword detection ---
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
        { threadId },
        'Comment is not a question and does not match keywords, skipping',
      );
      return;
    }
  }

  // --- Generate AI reply ---
  const replyContent = await generateReply(commentText, commentUsername);

  logger.info({ threadId, replyLength: replyContent.length }, 'AI reply generated for comment');

  // --- Create draft (lazy import to avoid circular deps) ---
  const draftService = await import('./draft.service');

  await draftService.createDraft({
    type: 'reply',
    content: replyContent,
    triggerSource: 'webhook_comment',
    replyToThreadId: threadId,
    replyToText: commentText,
    replyToUsername: commentUsername,
  });

  // --- Mark as processed ---
  db.insert(schema.processedThreads)
    .values({
      threadsMediaId: threadId,
      type: 'comment',
    })
    .run();

  logger.info({ threadId }, 'Comment processed and draft created');
}

/**
 * Simple heuristic to detect whether a comment is a question.
 */
function detectQuestion(text: string): boolean {
  const trimmed = text.trim();

  // Ends with a question mark
  if (trimmed.endsWith('?')) {
    return true;
  }

  // Starts with common question words
  const questionStarters = [
    'who', 'what', 'when', 'where', 'why', 'how',
    'is', 'are', 'was', 'were', 'do', 'does', 'did',
    'can', 'could', 'would', 'should', 'will',
    'have', 'has', 'had',
  ];

  const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase() ?? '';
  return questionStarters.includes(firstWord);
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
