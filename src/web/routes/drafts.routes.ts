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

router.get('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const status = req.query.status as string;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  if (status) {
    const results = db
      .select()
      .from(schema.drafts)
      .where(and(eq(schema.drafts.userId, userId), eq(schema.drafts.status, status as any)))
      .orderBy(desc(schema.drafts.createdAt))
      .limit(limit)
      .offset(offset)
      .all();
    res.json(results);
    return;
  }

  const results = db
    .select()
    .from(schema.drafts)
    .where(eq(schema.drafts.userId, userId))
    .orderBy(desc(schema.drafts.createdAt))
    .limit(limit)
    .offset(offset)
    .all();
  res.json(results);
});

router.get('/stats', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const stats = getDraftStats(userId);
  res.json(stats);
});

router.get('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = parseInt(String(req.params.id));
  const draft = db
    .select()
    .from(schema.drafts)
    .where(and(eq(schema.drafts.id, id), eq(schema.drafts.userId, userId)))
    .get();
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

router.post('/:id/reject', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = parseInt(String(req.params.id));
  db.update(schema.drafts)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(and(eq(schema.drafts.id, id), eq(schema.drafts.userId, userId)))
    .run();
  res.json({ success: true });
});

router.put('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = parseInt(String(req.params.id));
  const { content } = req.body;
  if (!content) {
    res.status(400).json({ error: 'Missing content' });
    return;
  }
  updateDraftContent(userId, id, content);
  res.json({ success: true });
});

export default router;
