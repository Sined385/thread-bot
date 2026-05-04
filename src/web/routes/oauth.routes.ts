import { Router, Request, Response, NextFunction } from 'express';
import { getAuthorizationUrl, exchangeCodeForToken, exchangeLongLivedToken, saveAccount } from '../../threads/auth';
import { ThreadsApi } from '../../threads/api';
import { config } from '../../config';
import { authMiddleware } from '../middleware/auth.middleware';
import { SESSION_COOKIE } from '../middleware/session';
import { logger } from '../../logger';

const router = Router();

// Public-safe config snapshot so we can verify what the running app has.
// No secrets — only the values you'd put in a public Threads app dashboard.
router.get('/_debug', (_req: Request, res: Response) => {
  res.json({
    threads_app_id: config.THREADS_APP_ID,
    threads_redirect_uri: config.THREADS_REDIRECT_URI,
    authorize_url_sample: getAuthorizationUrl(),
    node_env: config.NODE_ENV,
  });
});

// Log every hit to the oauth router with enough detail to diagnose the
// browser round-trip. Runs BEFORE auth so we see rejections too.
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

// On the callback specifically: if there's no session, redirect the browser
// to /login instead of returning a JSON 401 the user can't read.
router.get('/callback', (req: Request, res: Response, next: NextFunction) => {
  if (!req.cookies?.[SESSION_COOKIE]) {
    logger.warn({ query: req.query }, 'oauth callback hit without session cookie');
    res.redirect('/login?reason=oauth_no_session');
    return;
  }
  next();
});

router.use(authMiddleware);

router.get('/connect', (req: Request, res: Response) => {
  const url = getAuthorizationUrl();
  logger.info({ userId: req.user!.id, url }, 'oauth redirecting to threads authorize');
  res.redirect(url);
});

router.get('/callback', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const code = req.query.code as string;
    const error = req.query.error as string;
    const errorDescription = req.query.error_description as string;

    if (error) {
      logger.error({ error, errorDescription, userId }, 'oauth provider returned error');
      res.redirect(`/integrations?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code) {
      logger.error({ userId, query: req.query }, 'oauth callback missing code');
      res.redirect('/integrations?error=missing_code');
      return;
    }

    logger.info({ userId, codePrefix: code.slice(0, 8) }, 'oauth exchanging code for token');
    const shortToken = await exchangeCodeForToken(code);
    const longToken = await exchangeLongLivedToken(shortToken.access_token);

    const api = new ThreadsApi(longToken.access_token);
    const profile = await api.getUserProfile();

    await saveAccount(userId, profile, longToken.access_token, longToken.expires_in);

    logger.info({ username: profile.username, userId }, 'Account connected');
    res.redirect('/integrations?connected=1');
  } catch (error: any) {
    logger.error(
      { error: error?.message || String(error), stack: error?.stack, userId },
      'OAuth callback failed',
    );
    res.redirect(`/integrations?error=callback_failed&detail=${encodeURIComponent(error?.message || 'unknown')}`);
  }
});

export default router;
