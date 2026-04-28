import { db } from '../db/client';
import * as schema from '../db/schema';
import { refreshLongLivedToken } from '../threads/auth';
import { logger } from '../logger';
import { lte } from 'drizzle-orm';

export async function refreshExpiringTokens(): Promise<void> {
  try {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const expiringAccounts = db
      .select()
      .from(schema.accounts)
      .where(lte(schema.accounts.tokenExpiresAt, sevenDaysFromNow))
      .all();

    for (const account of expiringAccounts) {
      try {
        logger.info({ username: account.username }, 'Refreshing token');
        await refreshLongLivedToken(account.accessToken);
        logger.info({ username: account.username }, 'Token refreshed successfully');
      } catch (error) {
        logger.error({ error, username: account.username }, 'Failed to refresh token');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Token refresh job failed');
  }
}
