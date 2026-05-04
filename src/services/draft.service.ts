import { db } from '../db/client';
import * as schema from '../db/schema';
import { eq, desc, and, count } from 'drizzle-orm';
import { ThreadsApi } from '../threads/api';
import { sendDraftNotification, updateDraftMessage } from '../telegram/notifications';
import { getUserById } from './user.service';
import { logger } from '../logger';

interface CreateDraftParams {
  userId: number;
  type: 'original_post' | 'reply' | 'mention_reply' | 'keyword_reply';
  content: string;
  triggerSource: 'scheduled' | 'webhook_comment' | 'webhook_mention' | 'keyword_match' | 'manual';
  replyToThreadId?: string;
  replyToText?: string;
  replyToUsername?: string;
}

export async function createDraft(params: CreateDraftParams) {
  const { userId, type, content, triggerSource, replyToThreadId, replyToText, replyToUsername } = params;

  logger.info({ userId, type, triggerSource }, 'Creating new draft');

  const [draft] = db
    .insert(schema.drafts)
    .values({
      userId,
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

  logger.info({ userId, draftId: draft.id }, 'Draft inserted into database');

  const owner = getUserById(userId);
  if (!owner?.telegramChatId) {
    logger.info(
      { userId, draftId: draft.id },
      'Telegram not linked for user, skipping draft notification',
    );
    return draft;
  }

  try {
    const message = await sendDraftNotification(
      {
        id: draft.id,
        type: draft.type,
        status: draft.status,
        content: draft.content,
        replyToText: draft.replyToText,
        replyToUsername: draft.replyToUsername,
        triggerSource: draft.triggerSource,
      },
      owner.telegramChatId,
    );

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

export async function publishDraft(userId: number, draftId: number) {
  logger.info({ userId, draftId }, 'Publishing draft');

  const draft = db
    .select()
    .from(schema.drafts)
    .where(and(eq(schema.drafts.id, draftId), eq(schema.drafts.userId, userId)))
    .get();

  if (!draft) {
    throw new Error(`Draft ${draftId} not found for user ${userId}`);
  }

  const account = db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.userId, userId))
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
      if (!draft.replyToThreadId) {
        throw new Error(`Draft ${draftId} is a ${draft.type} but has no replyToThreadId`);
      }
      result = await api.replyToPost(draft.content, draft.replyToThreadId);
    }

    db.update(schema.drafts)
      .set({
        status: 'published',
        publishedThreadId: result.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.drafts.id, draftId))
      .run();

    db.insert(schema.publishedPosts)
      .values({
        userId,
        threadsMediaId: result.id,
        content: draft.content,
        draftId: draft.id,
      })
      .run();

    logger.info(
      { userId, draftId, publishedThreadId: result.id },
      'Draft published successfully',
    );

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

    db.update(schema.drafts)
      .set({
        status: 'failed',
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(schema.drafts.id, draftId))
      .run();

    logger.error({ error: errorMessage, userId, draftId }, 'Failed to publish draft');

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

export function getPendingDrafts(userId: number) {
  return db
    .select()
    .from(schema.drafts)
    .where(and(eq(schema.drafts.userId, userId), eq(schema.drafts.status, 'pending')))
    .orderBy(desc(schema.drafts.createdAt))
    .all();
}

export function getDraftById(userId: number, id: number) {
  return db
    .select()
    .from(schema.drafts)
    .where(and(eq(schema.drafts.id, id), eq(schema.drafts.userId, userId)))
    .get();
}

export function updateDraftContent(userId: number, id: number, newContent: string) {
  db.update(schema.drafts)
    .set({
      content: newContent,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.drafts.id, id), eq(schema.drafts.userId, userId)))
    .run();

  logger.info({ userId, draftId: id }, 'Draft content updated');

  return getDraftById(userId, id);
}

export function getDraftStats(userId: number) {
  const rows = db
    .select({
      status: schema.drafts.status,
      count: count(),
    })
    .from(schema.drafts)
    .where(eq(schema.drafts.userId, userId))
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
