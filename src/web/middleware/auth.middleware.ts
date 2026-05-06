import { Request, Response, NextFunction } from 'express';
import { SESSION_COOKIE, verifySession } from './session';
import { getUserById, type User } from '../../services/user.service';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const payload = verifySession(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = await getUserById(payload.userId);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.user = user;
  next();
}
