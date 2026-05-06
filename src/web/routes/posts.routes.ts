import { Router, Request, Response } from 'express';
import { db } from '../../db/client';
import * as schema from '../../db/schema';
import { desc, eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../../logger';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const posts = await db
    .select()
    .from(schema.publishedPosts)
    .where(eq(schema.publishedPosts.userId, userId))
    .orderBy(desc(schema.publishedPosts.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(posts);
});

router.get('/account', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const accountRows = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.userId, userId))
    .limit(1);
  const account = accountRows[0];
  if (!account) {
    res.json(null);
    return;
  }
  res.json({
    id: account.id,
    threadsUserId: account.threadsUserId,
    username: account.username,
    profilePictureUrl: account.profilePictureUrl,
    tokenExpiresAt: account.tokenExpiresAt,
    scopes: account.scopes,
  });
});

router.delete('/account', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const removed = await db
    .delete(schema.accounts)
    .where(eq(schema.accounts.userId, userId))
    .returning({ id: schema.accounts.id });
  logger.info({ userId, removed: removed.length }, 'Disconnected Threads account');
  res.json({ ok: true, removed: removed.length });
});

export default router;
