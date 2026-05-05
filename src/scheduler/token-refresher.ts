import { db } from '../db/client';
import * as schema from '../db/schema';
import { refreshLongLivedToken } from '../threads/auth';
import { logger } from '../logger';
import { eq, lte } from 'drizzle-orm';

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
        logger.info({ accountId: account.id, username: account.username }, 'Refreshing token');
        const refreshed = await refreshLongLivedToken(account.accessToken);

        const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
        db.update(schema.accounts)
          .set({
            accessToken: refreshed.access_token,
            tokenExpiresAt: newExpiresAt,
            updatedAt: new Date(),
          })
          .where(eq(schema.accounts.id, account.id))
          .run();

        logger.info(
          { accountId: account.id, username: account.username, newExpiresAt },
          'Token refreshed and persisted',
        );
      } catch (error) {
        logger.error({ error, accountId: account.id, username: account.username }, 'Failed to refresh token');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Token refresh job failed');
  }
}
