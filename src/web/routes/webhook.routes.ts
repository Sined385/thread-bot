import { Router, Request, Response } from 'express';
import { validateSignature, handleVerification, processWebhookEvent } from '../../threads/webhooks';
import { config } from '../../config';
import { logger } from '../../logger';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  handleVerification(req, res);
});

router.post('/', (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const rawBody = (req as any).rawBody as string;

  if (!signature || !rawBody) {
    logger.warn('Webhook received without signature or body');
    res.sendStatus(400);
    return;
  }

  if (!validateSignature(rawBody, signature, config.THREADS_APP_SECRET)) {
    logger.warn('Webhook signature validation failed');
    res.sendStatus(403);
    return;
  }

  res.sendStatus(200);

  processWebhookEvent(req.body).catch((error) => {
    logger.error({ error }, 'Failed to process webhook event');
  });
});

export default router;
