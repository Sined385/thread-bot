import { createHmac, timingSafeEqual } from 'crypto';

export interface SignedRequestPayload {
  user_id: string;
  algorithm: string;
  issued_at?: number;
  // Meta sometimes adds extra fields; keep them open.
  [key: string]: unknown;
}

function base64UrlDecode(input: string): Buffer {
  // Pad to multiple of 4 and convert URL-safe alphabet back to standard.
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/**
 * Parse and validate a Meta-style `signed_request` body.
 * Returns the payload on success, null otherwise.
 *
 * Format: <signature>.<payload>, both base64url-encoded.
 *   signature = HMAC-SHA256(payload, appSecret)
 *   payload   = JSON, includes `algorithm: "HMAC-SHA256"` and `user_id`
 */
export function parseSignedRequest(
  signed: string,
  appSecret: string,
): SignedRequestPayload | null {
  if (!signed || typeof signed !== 'string') return null;
  const dot = signed.indexOf('.');
  if (dot < 0) return null;

  const sigB64 = signed.slice(0, dot);
  const payloadB64 = signed.slice(dot + 1);

  let payloadJson: string;
  try {
    payloadJson = base64UrlDecode(payloadB64).toString('utf8');
  } catch {
    return null;
  }

  let payload: SignedRequestPayload;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    return null;
  }

  if (typeof payload.algorithm !== 'string' || payload.algorithm.replace('-', '').toUpperCase() !== 'HMACSHA256') {
    return null;
  }

  const expected = createHmac('sha256', appSecret).update(payloadB64).digest();
  let provided: Buffer;
  try {
    provided = base64UrlDecode(sigB64);
  } catch {
    return null;
  }

  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  return payload;
}
