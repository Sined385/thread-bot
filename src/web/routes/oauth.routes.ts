import { Router, Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import {
  getAuthorizationUrl,
  exchangeCodeForToken,
  exchangeLongLivedToken,
  saveAccount,
  AccountAlreadyLinkedError,
} from '../../threads/auth';
import { ThreadsApi } from '../../threads/api';
import { parseSignedRequest } from '../../threads/signed-request';
import { db } from '../../db/client';
import * as schema from '../../db/schema';
import { config } from '../../config';
import { authMiddleware } from '../middleware/auth.middleware';
import { SESSION_COOKIE } from '../middleware/session';
import { signOauthState, verifyOauthState } from '../middleware/oauth-state';
import { logger } from '../../logger';

const router = Router();

// Public-safe config snapshot so we can verify what the running app has.
router.get('/_debug', (_req: Request, res: Response) => {
  // Sample a state for an obviously-fake user id so the URL is valid-looking
  // but doesn't leak a real session.
  const sampleState = signOauthState({ userId: 0 });
  res.json({
    threads_app_id: config.THREADS_APP_ID,
    threads_redirect_uri: config.THREADS_REDIRECT_URI,
    authorize_url_sample: getAuthorizationUrl(sampleState),
    node_env: config.NODE_ENV,
  });
});

// Log every hit to the oauth router with enough detail to diagnose the
// browser round-trip.
router.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(
    {
      method: req.method,
      path: req.path,
      query: req.query,
      hasSessionCookie: !!req.cookies?.[SESSION_COOKIE],
      ua: req.headers['user-agent'],
    },
    'oauth request',
  );
  next();
});

/* -----------------------------------------------------------------------
 * /connect — start OAuth. Auth required: we need to know which user is
 * initiating so we can sign that into the state token.
 * --------------------------------------------------------------------- */
router.get('/connect', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const state = signOauthState({ userId });
  const url = getAuthorizationUrl(state);
  logger.info({ userId }, 'oauth redirecting to threads authorize');
  res.redirect(url);
});

/* -----------------------------------------------------------------------
 * /callback — receive the auth code from Threads. Identifies the user
 * via the signed `state` parameter, NOT the session cookie (cookie may
 * be dropped on cross-site redirects in some browsers).
 * --------------------------------------------------------------------- */
router.get('/callback', async (req: Request, res: Response) => {
  const error = req.query.error as string | undefined;
  const errorDescription = req.query.error_description as string | undefined;
  const code = req.query.code as string | undefined;
  const stateRaw = req.query.state as string | undefined;

  if (error) {
    logger.error({ error, errorDescription }, 'oauth provider returned error');
    res.redirect(`/integrations?error=${encodeURIComponent(error)}`);
    return;
  }

  if (!stateRaw) {
    logger.warn({ query: req.query }, 'oauth callback missing state');
    res.redirect('/login?reason=oauth_state_invalid');
    return;
  }

  const state = verifyOauthState(stateRaw);
  if (!state) {
    logger.warn({}, 'oauth callback state invalid or expired');
    res.redirect('/login?reason=oauth_state_invalid');
    return;
  }

  const userId = state.userId;

  if (!code) {
    logger.error({ userId, query: req.query }, 'oauth callback missing code');
    res.redirect('/integrations?error=missing_code');
    return;
  }

  try {
    logger.info({ userId, codePrefix: code.slice(0, 8) }, 'oauth exchanging code for token');
    const shortToken = await exchangeCodeForToken(code);
    const longToken = await exchangeLongLivedToken(shortToken.access_token);

    const api = new ThreadsApi(longToken.access_token);
    const profile = await api.getUserProfile();

    await saveAccount(userId, profile, longToken.access_token, longToken.expires_in);

    logger.info({ username: profile.username, userId }, 'Account connected');
    res.redirect('/integrations?connected=1');
  } catch (e: any) {
    if (e instanceof AccountAlreadyLinkedError) {
      logger.warn({ userId, ownerUserId: e.ownerUserId }, 'oauth refused: account linked to another user');
      res.redirect(`/integrations?error=account_already_linked`);
      return;
    }
    logger.error(
      { error: e?.message || String(e), stack: e?.stack, userId },
      'OAuth callback failed',
    );
    res.redirect(`/integrations?error=callback_failed&detail=${encodeURIComponent(e?.message || 'unknown')}`);
  }
});

/* -----------------------------------------------------------------------
 * /deauthorize — Meta calls this when a user revokes our app on their
 * Threads side. Body: signed_request (HMAC over THREADS_APP_SECRET).
 * On success: drop the matching accounts row.
 * --------------------------------------------------------------------- */
router.post('/deauthorize', (req: Request, res: Response) => {
  const signed = (req.body?.signed_request as string | undefined) ?? '';
  const payload = parseSignedRequest(signed, config.THREADS_APP_SECRET);
  if (!payload) {
    logger.warn({}, 'deauthorize: invalid signed_request');
    res.status(403).json({ error: 'invalid_signature' });
    return;
  }

  const threadsUserId = payload.user_id;
  const removed = db
    .delete(schema.accounts)
    .where(eq(schema.accounts.threadsUserId, threadsUserId))
    .run();

  logger.info({ threadsUserId, removed: removed.changes }, 'deauthorize: removed account row');
  res.status(200).json({ ok: true, removed: removed.changes });
});

/* -----------------------------------------------------------------------
 * /data-deletion — Meta calls this when a user files a deletion request.
 * We must respond with { url, confirmation_code } per Meta's spec, and
 * actually remove their data.
 * --------------------------------------------------------------------- */
router.post('/data-deletion', (req: Request, res: Response) => {
  const signed = (req.body?.signed_request as string | undefined) ?? '';
  const payload = parseSignedRequest(signed, config.THREADS_APP_SECRET);
  if (!payload) {
    logger.warn({}, 'data-deletion: invalid signed_request');
    res.status(403).json({ error: 'invalid_signature' });
    return;
  }

  const threadsUserId = payload.user_id;
  const confirmationCode = `del_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  // Find the user that owns this Threads account, then cascade-delete
  // everything tied to that user.
  const account = db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.threadsUserId, threadsUserId))
    .get();

  if (account) {
    const userId = account.userId;
    db.delete(schema.drafts).where(eq(schema.drafts.userId, userId)).run();
    db.delete(schema.settings).where(eq(schema.settings.userId, userId)).run();
    db.delete(schema.publishedPosts).where(eq(schema.publishedPosts.userId, userId)).run();
    db.delete(schema.processedThreads).where(eq(schema.processedThreads.userId, userId)).run();
    db.delete(schema.webhookEvents).where(eq(schema.webhookEvents.userId, userId)).run();
    db.delete(schema.accounts).where(eq(schema.accounts.userId, userId)).run();
    db.delete(schema.users).where(eq(schema.users.id, userId)).run();
    logger.info({ threadsUserId, userId, confirmationCode }, 'data-deletion: user data cascade-deleted');
  } else {
    logger.info({ threadsUserId, confirmationCode }, 'data-deletion: no matching account, nothing to delete');
  }

  res.status(200).json({
    url: 'https://thread-bot-production-1707.up.railway.app/privacy',
    confirmation_code: confirmationCode,
  });
});

export default router;
