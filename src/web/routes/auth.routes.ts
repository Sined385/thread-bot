import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/client';
import { users } from '../../db/schema';
import {
  createUser,
  getUserByEmail,
  getUserById,
  verifyPassword,
} from '../../services/user.service';
import { createLinkToken } from '../../services/telegram-link.service';
import { getBotUsername } from '../../telegram/bot';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from '../middleware/session';
import { logger } from '../../logger';

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120),
  workspace_name: z.string().min(1).max(120),
  workspace_website: z.string().max(255).optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicUser(u: {
  id: number;
  email: string;
  name: string;
  workspaceName: string;
  workspaceWebsite: string | null;
  onboardingCompletedAt: Date | null;
  telegramChatId: string | null;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    workspace_name: u.workspaceName,
    workspace_website: u.workspaceWebsite,
    onboarding_completed_at: u.onboardingCompletedAt
      ? u.onboardingCompletedAt.toISOString()
      : null,
    telegram_linked: !!u.telegramChatId,
  };
}

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
    return;
  }

  const existing = getUserByEmail(parsed.data.email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  try {
    const user = await createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
      workspaceName: parsed.data.workspace_name,
      workspaceWebsite: parsed.data.workspace_website ?? null,
    });

    const token = signSession({ userId: user.id });
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    res.json({ user: publicUser(user) });
  } catch (error) {
    logger.error({ error }, 'Signup failed');
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  const user = getUserByEmail(parsed.data.email);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const ok = await verifyPassword(user, parsed.data.password);
  if (!ok) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signSession({ userId: user.id });
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  res.json({ user: publicUser(user) });
});

router.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: publicUser(req.user!) });
});

router.post('/telegram/link', authMiddleware, (req, res) => {
  const username = getBotUsername();
  if (!username) {
    res.status(503).json({ error: 'Telegram bot not ready' });
    return;
  }
  const { token, expiresAt } = createLinkToken(req.user!.id);
  const url = `https://t.me/${username}?start=${token}`;
  res.json({ url, expires_at: expiresAt.toISOString() });
});

router.post('/onboarding-complete', authMiddleware, (req, res) => {
  const userId = req.user!.id;
  const now = new Date();
  db.update(users)
    .set({ onboardingCompletedAt: now, updatedAt: now })
    .where(eq(users.id, userId))
    .run();
  const updated = getUserById(userId);
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  logger.info({ userId }, 'Onboarding marked complete');
  res.json({ user: publicUser(updated) });
});

export default router;
