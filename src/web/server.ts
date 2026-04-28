import express from 'express';
import path from 'path';
import { config } from '../config';
import { logger } from '../logger';
import { errorHandler } from './middleware/error.middleware';
import oauthRoutes from './routes/oauth.routes';
import webhookRoutes from './routes/webhook.routes';
import settingsRoutes from './routes/settings.routes';
import draftsRoutes from './routes/drafts.routes';
import postsRoutes from './routes/posts.routes';

export function createServer() {
  const app = express();

  app.use((req, _res, next) => {
    if (req.path === '/api/webhooks/threads' && req.method === 'POST') {
      let rawBody = '';
      req.on('data', (chunk) => { rawBody += chunk; });
      req.on('end', () => { (req as any).rawBody = rawBody; });
    }
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/oauth', oauthRoutes);
  app.use('/api/webhooks/threads', webhookRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/drafts', draftsRoutes);
  app.use('/api/posts', postsRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const webUiPath = path.join(__dirname, '../../web-ui/dist');
  app.use(express.static(webUiPath));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(webUiPath, 'index.html'), (err) => {
      if (err) {
        res.status(404).json({ error: 'Not found' });
      }
    });
  });

  app.use(errorHandler);

  return app;
}

export function startServer() {
  const app = createServer();
  app.listen(config.PORT, () => {
    logger.info(`Server running on port ${config.PORT}`);
  });
  return app;
}
