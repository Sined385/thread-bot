import { db } from '../db/client';
import * as schema from '../db/schema';
import { eq, desc, sql, and, count } from 'drizzle-orm';
import { ThreadsApi } from '../threads/api';
import { sendDraftNotification, updateDraftMessage } from '../telegram/notifications';
import { logger } from '../logger';

interface CreateDraftParams {
  type: 'original_post' | 'reply' | 'mention_reply' | 'keyword_reply';
  content: string;
  triggerSource: 'scheduled' | 'webhook_comment' | 'webhook_mention' | 'keyword_match' | 'manual';
  replyToThreadId?: string;
  replyToText?: string;
  replyToUsername?: string;
}

/**
 * Creates a new draft, sends a Telegram notification for approval,
 * and saves the Telegram message ID back to the draft record.
 */
export async function createDraft(params: CreateDraftParams) {
  const { type, content, triggerSource, replyToThreadId, replyToText, replyToUsername } = params;

  logger.info({ type, triggerSource }, 'Creating new draft');

  const [draft] = db
    .insert(schema.drafts)
    .values({
      type,
      content,
      originalContent: content,
      triggerSource,
      replyToThreadId: replyToThreadId ?? null,
      replyToText: replyToText ?? null,
      replyToUsername: replyToUsername ?? null,
    })
    .returning()
    .all();

  logger.info({ draftId: draft.id }, 'Draft inserted into database');

  try {
    const message = await sendDraftNotification({
      id: draft.id,
      type: draft.type,
      status: draft.status,
      content: draft.content,
      replyToText: draft.replyToText,
      replyToUsername: draft.replyToUsername,
      triggerSource: draft.triggerSource,
    });

    db.update(schema.drafts)
      .set({
        telegramMessageId: message.message_id,
        telegramChatId: String(message.chat.id),
        updatedAt: new Date(),
      })
      .where(eq(schema.drafts.id, draft.id))
      .run();

    logger.info(
      { draftId: draft.id, telegramMessageId: message.message_id },
      'Telegram message ID saved to draft',
    );
  } catch (error) {
    logger.error({ error, draftId: draft.id }, 'Failed to send Telegram notification for draft');
  }

  return draft;
}

/**
 * Publishes an approved draft to Threads.
 * Handles both original posts and replies, updates status, and notifies via Telegram.
 */
export async function publishDraft(draftId: number) {
  logger.info({ draftId }, 'Publishing draft');

  const draft = db
    .select()
    .from(schema.drafts)
    .where(eq(schema.drafts.id, draftId))
    .get();

  if (!draft) {
    throw new Error(`Draft ${draftId} not found`);
  }

  const account = db
    .select()
    .from(schema.accounts)
    .limit(1)
    .get();

  if (!account) {
    throw new Error('No Threads account configured. Please authenticate first.');
  }

  const api = new ThreadsApi(account.accessToken);

  try {
    let result: { id: string };

    if (draft.type === 'original_post') {
      result = await api.createPost(draft.content);
    } else {
      // reply, mention_reply, keyword_reply
      if (!draft.replyToThreadId) {
        throw new Error(`Draft ${draftId} is a ${draft.type} but has no replyToThreadId`);
      }
      result = await api.replyToPost(draft.content, draft.replyToThreadId);
    }

    // Update draft status to published
    db.update(schema.drafts)
      .set({
        status: 'published',
        publishedThreadId: result.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.drafts.id, draftId))
      .run();

    // Save to published_posts table
    db.insert(schema.publishedPosts)
      .values({
        threadsMediaId: result.id,
        content: draft.content,
        draftId: draft.id,
      })
      .run();

    logger.info(
      { draftId, publishedThreadId: result.id },
      'Draft published successfully',
    );

    // Update Telegram message with success status
    if (draft.telegramMessageId && draft.telegramChatId) {
      try {
        await updateDraftMessage(
          draft.telegramChatId,
          draft.telegramMessageId,
          draft.content,
          'published',
        );
      } catch (telegramError) {
        logger.error({ telegramError, draftId }, 'Failed to update Telegram message after publish');
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Update draft status to failed
    db.update(schema.drafts)
      .set({
        status: 'failed',
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(schema.drafts.id, draftId))
      .run();

    logger.error({ error: errorMessage, draftId }, 'Failed to publish draft');

    // Update Telegram message with failure status
    if (draft.telegramMessageId && draft.telegramChatId) {
      try {
        await updateDraftMessage(
          draft.telegramChatId,
          draft.telegramMessageId,
          `${draft.content}\n\nError: ${errorMessage}`,
          'failed',
        );
      } catch (telegramError) {
        logger.error({ telegramError, draftId }, 'Failed to update Telegram message after failure');
      }
    }

    throw error;
  }
}

/**
 * Returns all drafts with status 'pending', ordered by most recent first.
 */
export function getPendingDrafts() {
  return db
    .select()
    .from(schema.drafts)
    .where(eq(schema.drafts.status, 'pending'))
    .orderBy(desc(schema.drafts.createdAt))
    .all();
}

/**
 * Returns a single draft by ID.
 */
export function getDraftById(id: number) {
  return db
    .select()
    .from(schema.drafts)
    .where(eq(schema.drafts.id, id))
    .get();
}

/**
 * Updates the content of an existing draft.
 */
export function updateDraftContent(id: number, newContent: string) {
  db.update(schema.drafts)
    .set({
      content: newContent,
      updatedAt: new Date(),
    })
    .where(eq(schema.drafts.id, id))
    .run();

  logger.info({ draftId: id }, 'Draft content updated');

  return getDraftById(id);
}

/**
 * Returns counts of drafts grouped by status.
 */
export function getDraftStats() {
  const rows = db
    .select({
      status: schema.drafts.status,
      count: count(),
    })
    .from(schema.drafts)
    .groupBy(schema.drafts.status)
    .all();

  const stats: Record<string, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    published: 0,
    failed: 0,
  };

  for (const row of rows) {
    stats[row.status] = row.count;
  }

  return stats;
}
