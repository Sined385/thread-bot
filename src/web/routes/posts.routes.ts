import { Router, Request, Response } from 'express';
import { db } from '../../db/client';
import * as schema from '../../db/schema';
import { desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const posts = db
    .select()
    .from(schema.publishedPosts)
    .orderBy(desc(schema.publishedPosts.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  res.json(posts);
});

router.get('/account', (_req: Request, res: Response) => {
  const account = db.select().from(schema.accounts).get();
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
