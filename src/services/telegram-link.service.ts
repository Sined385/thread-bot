import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { logger } from '../logger';

const TOKEN_TTL_MS = 15 * 60 * 1000;

export interface LinkToken {
  token: string;
  expiresAt: Date;
}

export function createLinkToken(userId: number): LinkToken {
  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  db.update(users)
    .set({
      telegramLinkToken: token,
      telegramLinkTokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .run();

  logger.info({ userId, expiresAt }, 'Created telegram link token');
  return { token, expiresAt };
}

export interface ConsumeResult {
  ok: boolean;
  reason?: 'unknown' | 'expired';
  userId?: number;
}

export function consumeLinkToken(token: string, chatId: string | number): ConsumeResult {
  const row = db.select().from(users).where(eq(users.telegramLinkToken, token)).get();
  if (!row) return { ok: false, reason: 'unknown' };

  const expiresAt = row.telegramLinkTokenExpiresAt;
  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  db.update(users)
    .set({
      telegramChatId: String(chatId),
      telegramLinkToken: null,
      telegramLinkTokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, row.id))
    .run();

  logger.info({ userId: row.id, chatId: String(chatId) }, 'Consumed telegram link token');
  return { ok: true, userId: row.id };
}

