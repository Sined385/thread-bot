import jwt from 'jsonwebtoken';
import { config } from '../../config';

const AUDIENCE = 'oauth-state';

export interface OauthStatePayload {
  userId: number;
}

/**
 * Sign a short-lived (10 min) state token for the Threads OAuth flow.
 *
 * - Carries the initiating userId so /callback can identify the user
 *   without depending on the session cookie surviving the cross-site
 *   redirect chain.
 * - The `aud: 'oauth-state'` claim makes a session JWT non-replayable
 *   here, and vice-versa.
 */
export function signOauthState(payload: OauthStatePayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: '10m',
    audience: AUDIENCE,
  });
}

export function verifyOauthState(token: string): OauthStatePayload | null {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      audience: AUDIENCE,
    }) as jwt.JwtPayload & OauthStatePayload;
    if (typeof decoded.userId !== 'number') return null;
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}
