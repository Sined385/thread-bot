import { Router, Request, Response } from 'express';
import { db } from '../../db/client';
import * as schema from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.middleware';
import { createDraft, publishDraft, updateDraftContent, getDraftStats } from '../../services/draft.service';
import { logger } from '../../logger';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  const status = req.query.status as string;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  let query = db.select().from(schema.drafts).orderBy(desc(schema.drafts.createdAt)).limit(limit).offset(offset);

  if (status) {
    const results = db.select().from(schema.drafts)
      .where(eq(schema.drafts.status, status as any))
      .orderBy(desc(schema.drafts.createdAt))
      .limit(limit).offset(offset).all();
    res.json(results);
    return;
  }

  res.json(query.all());
});

router.get('/stats', async (_req: Request, res: Response) => {
  const stats = await getDraftStats();
  res.json(stats);
});

router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const draft = db.select().from(schema.drafts).where(eq(schema.drafts.id, id)).get();
  if (!draft) {
    res.status(404).json({ error: 'Draft not found' });
    return;
  }
  res.json(draft);
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { content, type = 'original_post' } = req.body;
    if (!content) {
      res.status(400).json({ error: 'Missing content' });
      return;
    }
    const draft = await createDraft({
      type,
      content,
      triggerSource: 'manual',
    });
    res.status(201).json(draft);
  } catch (error) {
    logger.error({ error }, 'Failed to create draft');
    res.status(500).json({ error: 'Failed to create draft' });
  }
});

router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    await publishDraft(id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to approve draft');
    res.status(500).json({ error: 'Failed to publish draft' });
  }
});

router.post('/:id/reject', (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  db.update(schema.drafts)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(eq(schema.drafts.id, id))
    .run();
  res.json({ success: true });
});

router.put('/:id', (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const { content } = req.body;
  if (!content) {
    res.status(400).json({ error: 'Missing content' });
    return;
  }
  updateDraftContent(id, content);
  res.json({ success: true });
});

export default router;
