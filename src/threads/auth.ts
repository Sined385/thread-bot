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

const SCOPES = [
  'threads_basic',
  'threads_content_publish',
  'threads_manage_replies',
  'threads_read_replies',
  'threads_manage_insights',
];

/**
 * Build the Threads OAuth authorization URL.
 */
export function getAuthorizationUrl(): string {
  const params = new URLSearchParams({
    client_id: config.THREADS_APP_ID,
    redirect_uri: config.THREADS_REDIRECT_URI,
    scope: SCOPES.join(','),
    response_type: 'code',
  });

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

/**
 * Save or update an account in the database after successful authentication.
 */
export async function saveAccount(
  profile: ThreadsUserProfile,
  token: string,
  expiresIn: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  logger.info({ userId: profile.id, username: profile.username }, 'Saving account to database');

  const existing = db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.threadsUserId, profile.id))
    .get();

  if (existing) {
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

    logger.info({ userId: profile.id }, 'Updated existing account');
  } else {
    db.insert(schema.accounts)
      .values({
        threadsUserId: profile.id,
        username: profile.username,
        accessToken: token,
        tokenExpiresAt: expiresAt,
        scopes: SCOPES.join(','),
        profilePictureUrl: profile.threads_profile_picture_url ?? null,
      })
      .run();

    logger.info({ userId: profile.id }, 'Created new account');
  }
}
