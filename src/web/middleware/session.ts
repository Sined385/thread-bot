import jwt from 'jsonwebtoken';
import { config } from '../../config';

export interface SessionPayload {
  userId: number;
}

export const SESSION_COOKIE = 'tb_session';
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: '30d',
  });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload & SessionPayload;
    if (typeof decoded.userId !== 'number') return null;
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  };
}
