import { Router, Request, Response } from 'express';
import { getAuthorizationUrl, exchangeCodeForToken, exchangeLongLivedToken, saveAccount } from '../../threads/auth';
import { ThreadsApi } from '../../threads/api';
import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../../logger';

const router = Router();
router.use(authMiddleware);

router.get('/connect', (_req: Request, res: Response) => {
  const url = getAuthorizationUrl();
  res.redirect(url);
});

router.get('/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const error = req.query.error as string;

    if (error) {
      logger.error({ error }, 'OAuth error');
      res.redirect(`/integrations?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code) {
      res.redirect('/integrations?error=missing_code');
      return;
    }

    const shortToken = await exchangeCodeForToken(code);
    const longToken = await exchangeLongLivedToken(shortToken.access_token);

    const api = new ThreadsApi(longToken.access_token);
    const profile = await api.getUserProfile();

    await saveAccount(req.user!.id, profile, longToken.access_token, longToken.expires_in);

    logger.info({ username: profile.username, userId: req.user!.id }, 'Account connected');
    res.redirect('/integrations?connected=1');
  } catch (error) {
    logger.error({ error }, 'OAuth callback failed');
    res.redirect('/integrations?error=callback_failed');
  }
});

export default router;
