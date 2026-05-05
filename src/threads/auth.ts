import { config } from '../config';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { logger } from '../logger';
import { eq } from 'drizzle-orm';
import type {
  ThreadsTokenResponse,
  ThreadsLongLivedTokenResponse,
  ThreadsUserProfile,
} from '../types/threads.types';

const SCOPES = config.THREADS_SCOPES.split(',').map((s) => s.trim()).filter(Boolean);

/**
 * Build the Threads OAuth authorization URL.
 *
 * The optional `state` parameter is a short-lived signed JWT that lets
 * the callback identify the initiating user without depending on the
 * session cookie surviving the cross-site redirect chain. Also serves
 * as CSRF protection.
 */
export function getAuthorizationUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: config.THREADS_APP_ID,
    redirect_uri: config.THREADS_REDIRECT_URI,
    scope: SCOPES.join(','),
    response_type: 'code',
  });
  if (state) params.set('state', state);

  return `https://threads.net/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for a short-lived access token.
 */
export async function exchangeCodeForToken(code: string): Promise<ThreadsTokenResponse> {
  logger.info('Exchanging authorization code for short-lived token');

  const body = new URLSearchParams({
    client_id: config.THREADS_APP_ID,
    client_secret: config.THREADS_APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: config.THREADS_REDIRECT_URI,
    code,
  });

  const response = await fetch('https://graph.threads.net/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, body: errorText }, 'Failed to exchange code for token');
    throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as ThreadsTokenResponse;
  logger.info('Successfully obtained short-lived token');
  return data;
}

/**
 * Exchange a short-lived token for a long-lived token (valid ~60 days).
 */
export async function exchangeLongLivedToken(
  shortLivedToken: string,
): Promise<ThreadsLongLivedTokenResponse> {
  logger.info('Exchanging short-lived token for long-lived token');

  const params = new URLSearchParams({
    grant_type: 'th_exchange_token',
    client_secret: config.THREADS_APP_SECRET,
    access_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.threads.net/access_token?${params.toString()}`,
    { method: 'GET' },
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, body: errorText }, 'Failed to exchange long-lived token');
    throw new Error(`Long-lived token exchange failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as ThreadsLongLivedTokenResponse;
  logger.info({ expiresIn: data.expires_in }, 'Successfully obtained long-lived token');
  return data;
}

/**
 * Refresh a long-lived token before it expires.
 */
export async function refreshLongLivedToken(
  token: string,
): Promise<ThreadsLongLivedTokenResponse> {
  logger.info('Refreshing long-lived token');

  const params = new URLSearchParams({
    grant_type: 'th_refresh_token',
    access_token: token,
  });

  const response = await fetch(
    `https://graph.threads.net/refresh_access_token?${params.toString()}`,
    { method: 'GET' },
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, body: errorText }, 'Failed to refresh long-lived token');
    throw new Error(`Token refresh failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as ThreadsLongLivedTokenResponse;
  logger.info({ expiresIn: data.expires_in }, 'Successfully refreshed long-lived token');
  return data;
}

export class AccountAlreadyLinkedError extends Error {
  constructor(public readonly ownerUserId: number) {
    super('account_already_linked');
    this.name = 'AccountAlreadyLinkedError';
  }
}

/**
 * Save or update an account in the database after successful authentication.
 * Refuses to transfer an existing account to a different user — that's an
 * account-stealing vector. The caller maps the error to a friendly redirect.
 */
export async function saveAccount(
  userId: number,
  profile: ThreadsUserProfile,
  token: string,
  expiresIn: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  logger.info({ userId, threadsUserId: profile.id, username: profile.username }, 'Saving account to database');

  const existing = db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.threadsUserId, profile.id))
    .get();

  if (existing) {
    if (existing.userId !== userId) {
      logger.warn(
        { userId, ownerUserId: existing.userId, threadsUserId: profile.id },
        'Refusing to relink Threads account owned by another user',
      );
      throw new AccountAlreadyLinkedError(existing.userId);
    }

    db.update(schema.accounts)
      .set({
        username: profile.username,
        accessToken: token,
        tokenExpiresAt: expiresAt,
        scopes: SCOPES.join(','),
        profilePictureUrl: profile.threads_profile_picture_url ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.accounts.threadsUserId, profile.id))
      .run();

    logger.info({ userId, threadsUserId: profile.id }, 'Updated existing account');
  } else {
    db.insert(schema.accounts)
      .values({
        userId,
        threadsUserId: profile.id,
        username: profile.username,
        accessToken: token,
        tokenExpiresAt: expiresAt,
        scopes: SCOPES.join(','),
        profilePictureUrl: profile.threads_profile_picture_url ?? null,
      })
      .run();

    logger.info({ userId, threadsUserId: profile.id }, 'Created new account');
  }
}
