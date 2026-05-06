import { db } from '../db/client';
import * as schema from '../db/schema';
import { and, eq, lte, isNotNull } from 'drizzle-orm';
import { logger } from '../logger';

/**
 * Per-minute job: pick up any drafts the user explicitly scheduled and
 * publish them via the existing publishDraft path (which also updates the
 * Telegram approval card if there is one).
 */
export async function publishScheduledDrafts(): Promise<void> {
  try {
    const now = new Date();
    const due = db
      .select()
      .from(schema.drafts)
      .where(
        and(
          eq(schema.drafts.status, 'scheduled'),
          isNotNull(schema.drafts.scheduledFor),
          lte(schema.drafts.scheduledFor, now),
        ),
      )
      .all();

    if (due.length === 0) return;

    logger.info({ count: due.length }, 'Publishing scheduled drafts');
    const { publishDraft } = await import('../services/draft.service');

    for (const draft of due) {
      try {
        await publishDraft(draft.userId, draft.id);
      } catch (error) {
        logger.error({ error, draftId: draft.id, userId: draft.userId }, 'Scheduled publish failed');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Scheduled publisher pass failed');
  }
}
