import { Router, Request, Response } from 'express';
import { db } from '../../db/client';
import * as schema from '../../db/schema';
import { desc, eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const posts = db
    .select()
    .from(schema.publishedPosts)
    .where(eq(schema.publishedPosts.userId, userId))
    .orderBy(desc(schema.publishedPosts.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  res.json(posts);
});

router.get('/account', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const account = db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.userId, userId))
    .get();
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

export default router;
