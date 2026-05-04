import { Router, Request, Response } from 'express';
import { db } from '../../db/client';
import * as schema from '../../db/schema';
import { and, eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../../logger';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const allSettings = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.userId, userId))
    .all();

  const grouped: Record<string, any[]> = {};
  for (const setting of allSettings) {
    if (!grouped[setting.category]) {
      grouped[setting.category] = [];
    }
    grouped[setting.category].push({
      ...setting,
      value: JSON.parse(setting.value),
      options: setting.options ? JSON.parse(setting.options) : null,
    });
  }

  res.json(grouped);
});

router.put('/:key', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const key = String(req.params.key);
  const { value } = req.body;

  if (value === undefined) {
    res.status(400).json({ error: 'Missing value' });
    return;
  }

  const existing = db
    .select()
    .from(schema.settings)
    .where(and(eq(schema.settings.userId, userId), eq(schema.settings.key, key)))
    .get();

  if (!existing) {
    res.status(404).json({ error: 'Setting not found' });
    return;
  }

  db.update(schema.settings)
    .set({ value: JSON.stringify(value) })
    .where(and(eq(schema.settings.userId, userId), eq(schema.settings.key, key)))
    .run();

  logger.info({ userId, key }, 'Setting updated');
  res.json({ success: true });
});

router.put('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const updates: Record<string, any> = req.body;

  for (const [key, value] of Object.entries(updates)) {
    db.update(schema.settings)
      .set({ value: JSON.stringify(value) })
      .where(and(eq(schema.settings.userId, userId), eq(schema.settings.key, key)))
      .run();
  }

  logger.info({ userId, keys: Object.keys(updates) }, 'Bulk settings updated');
  res.json({ success: true });
});

export default router;
