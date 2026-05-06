import { Router, Request, Response } from 'express';
import { db } from '../../db/client';
import * as schema from '../../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createDraft,
  publishDraft,
  updateDraftContent,
  getDraftStats,
} from '../../services/draft.service';
import { generatePost } from '../../openai/generator';
import { logger } from '../../logger';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const status = req.query.status as string;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  if (status) {
    const results = await db
      .select()
      .from(schema.drafts)
      .where(and(eq(schema.drafts.userId, userId), eq(schema.drafts.status, status as any)))
      .orderBy(desc(schema.drafts.createdAt))
      .limit(limit)
      .offset(offset);
    res.json(results);
    return;
  }

  const results = await db
    .select()
    .from(schema.drafts)
    .where(eq(schema.drafts.userId, userId))
    .orderBy(desc(schema.drafts.createdAt))
    .limit(limit)
    .offset(offset);
  res.json(results);
});

router.get('/stats', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const stats = await getDraftStats(userId);
  res.json(stats);
});

router.get('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = parseInt(String(req.params.id));
  const rows = await db
    .select()
    .from(schema.drafts)
    .where(and(eq(schema.drafts.id, id), eq(schema.drafts.userId, userId)))
    .limit(1);
  const draft = rows[0];
  if (!draft) {
    res.status(404).json({ error: 'Draft not found' });
    return;
  }
  res.json(draft);
});

router.post('/generate', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const content = await generatePost(userId);
    const draft = await createDraft({
      userId,
      type: 'original_post',
      content,
      triggerSource: 'manual',
    });
    res.status(201).json(draft);
  } catch (error) {
    logger.error({ error, userId }, 'Failed to generate draft');
    res.status(500).json({ error: 'Failed to generate draft' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const { content, type = 'original_post' } = req.body;
    if (!content) {
      res.status(400).json({ error: 'Missing content' });
      return;
    }
    const draft = await createDraft({
      userId,
      type,
      content,
      triggerSource: 'manual',
    });
    res.status(201).json(draft);
  } catch (error) {
    logger.error({ error, userId }, 'Failed to create draft');
    res.status(500).json({ error: 'Failed to create draft' });
  }
});

router.post('/:id/approve', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const id = parseInt(String(req.params.id));
    await publishDraft(userId, id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to approve draft');
    res.status(500).json({ error: 'Failed to publish draft' });
  }
});

router.post('/:id/reject', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = parseInt(String(req.params.id));
  await db.update(schema.drafts)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(and(eq(schema.drafts.id, id), eq(schema.drafts.userId, userId)));
  res.json({ success: true });
});

router.put('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = parseInt(String(req.params.id));
  const { content } = req.body;
  if (!content) {
    res.status(400).json({ error: 'Missing content' });
    return;
  }
  await updateDraftContent(userId, id, content);
  res.json({ success: true });
});

router.post('/:id/schedule', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = parseInt(String(req.params.id));
  const scheduledForRaw = req.body?.scheduled_for;
  if (!scheduledForRaw) {
    res.status(400).json({ error: 'Missing scheduled_for' });
    return;
  }
  const scheduledFor = new Date(scheduledForRaw);
  if (Number.isNaN(scheduledFor.getTime())) {
    res.status(400).json({ error: 'Invalid scheduled_for' });
    return;
  }

  const updated = await db
    .update(schema.drafts)
    .set({ status: 'scheduled', scheduledFor, updatedAt: new Date() })
    .where(and(eq(schema.drafts.id, id), eq(schema.drafts.userId, userId)))
    .returning({ id: schema.drafts.id });
  if (updated.length === 0) {
    res.status(404).json({ error: 'Draft not found' });
    return;
  }
  logger.info({ userId, draftId: id, scheduledFor }, 'Draft scheduled');
  res.json({ success: true });
});

router.post('/:id/unschedule', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = parseInt(String(req.params.id));
  const updated = await db
    .update(schema.drafts)
    .set({ status: 'pending', updatedAt: new Date() })
    .where(and(eq(schema.drafts.id, id), eq(schema.drafts.userId, userId)))
    .returning({ id: schema.drafts.id });
  if (updated.length === 0) {
    res.status(404).json({ error: 'Draft not found' });
    return;
  }
  logger.info({ userId, draftId: id }, 'Draft unscheduled');
  res.json({ success: true });
});

export default router;
