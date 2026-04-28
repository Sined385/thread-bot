import { Router, Request, Response } from 'express';
import { getAuthorizationUrl, exchangeCodeForToken, exchangeLongLivedToken, saveAccount } from '../../threads/auth';
import { ThreadsApi } from '../../threads/api';
import { logger } from '../../logger';

const router = Router();

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
      res.status(400).send(`OAuth error: ${error}`);
      return;
    }

    if (!code) {
      res.status(400).send('Missing authorization code');
      return;
    }

    const shortToken = await exchangeCodeForToken(code);
    const longToken = await exchangeLongLivedToken(shortToken.access_token);

    const api = new ThreadsApi(longToken.access_token);
    const profile = await api.getUserProfile();

    await saveAccount(profile, longToken.access_token, longToken.expires_in);

    logger.info({ username: profile.username }, 'Account connected');
    res.send(`
      <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>Connected!</h1>
        <p>Successfully connected @${profile.username}</p>
        <p>You can close this window.</p>
      </body></html>
    `);
  } catch (error) {
    logger.error({ error }, 'OAuth callback failed');
    res.status(500).send('Failed to connect account');
  }
});

export default router;
