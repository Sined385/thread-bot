import { Request, Response, NextFunction } from 'express';
import { config } from '../../config';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '') ||
    req.query.token as string;

  if (!token || token !== config.WEB_UI_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
