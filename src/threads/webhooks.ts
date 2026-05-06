import { createHmac } from 'crypto';
import { eq } from 'drizzle-orm';
import { config } from '../config';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { logger } from '../logger';
import type { Request, Response } from 'express';
import type { ThreadsWebhookPayload, ThreadsWebhookEntry } from '../types/threads.types';

/**
 * Validate the X-Hub-Signature-256 header against the raw request payload.
 */
export function validateSignature(
  payload: string,
  signature: string,
  appSecret: string,
): boolean {
  const expectedSignature =
    'sha256=' + createHmac('sha256', appSecret).update(payload).digest('hex');

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return mismatch === 0;
}

export function handleVerification(req: Request, res: Response): void {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  logger.info({ mode, hasToken: !!token, hasChallenge: !!challenge }, 'Webhook verification request');

  if (mode === 'subscribe' && token === config.THREADS_WEBHOOK_VERIFY_TOKEN) {
    logger.info('Webhook verification successful');
    res.status(200).send(challenge);
  } else {
    logger.warn({ mode, tokenMatch: token === config.THREADS_WEBHOOK_VERIFY_TOKEN }, 'Webhook verification failed');
    res.status(403).send('Forbidden');
  }
}

export async function processWebhookEvent(
  payload: ThreadsWebhookPayload,
): Promise<void> {
  logger.info(
    { object: payload.object, entryCount: payload.entry.length },
    'Processing webhook event',
  );

  for (const entry of payload.entry) {
    // Resolve which user this entry belongs to via the Threads user id (entry.id).
    const accountRows = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.threadsUserId, entry.id))
      .limit(1);
    const account = accountRows[0];

    const userId = account?.userId ?? null;

    if (!userId) {
      logger.warn({ entryId: entry.id }, 'Webhook entry has no matching account, persisting unscoped event');
    }

    for (const change of entry.changes) {
      await db.insert(schema.webhookEvents)
        .values({
          userId,
          topic: payload.object,
          field: change.field,
          payload: JSON.stringify({ entry, change }),
          processed: false,
        });

      logger.debug(
        {
          userId,
          field: change.field,
          verb: change.value.verb,
          entryId: entry.id,
        },
        'Stored webhook event',
      );

      if (!userId) {
        // Without a known user we cannot route AI replies; the raw event is stored for inspection.
        continue;
      }

      try {
        await routeEvent(userId, entry, change.field, change.value);
      } catch (error) {
        logger.error(
          { error, userId, field: change.field, entryId: entry.id },
          'Failed to route webhook event',
        );
      }
    }
  }
}

async function routeEvent(
  userId: number,
  entry: ThreadsWebhookEntry,
  field: string,
  value: ThreadsWebhookEntry['changes'][number]['value'],
): Promise<void> {
  switch (field) {
    case 'replies': {
      logger.info(
        {
          userId,
          verb: value.verb,
          threadId: value.thread_id,
          from: value.from?.username,
        },
        'Processing reply event',
      );

      if (value.thread_id && value.text && value.from?.username) {
        const { processComment } = await import('../services/comment.service');
        await processComment(
          userId,
          value.thread_id,
          value.text,
          value.from.username,
          value.parent_id || entry.id,
        );
      }
      break;
    }

    case 'mentions': {
      logger.info(
        {
          userId,
          verb: value.verb,
          mediaId: value.media_id,
          from: value.from?.username,
        },
        'Processing mention event',
      );

      if (value.media_id && value.text && value.from?.username) {
        const { processMention } = await import('../services/mention.service');
        await processMention(
          userId,
          value.media_id,
          value.text,
          value.from.username,
        );
      }
      break;
    }

    default:
      logger.warn({ userId, field }, 'Received webhook event with unhandled field type');
      break;
  }
}
