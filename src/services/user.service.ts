import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { seedDefaultSettings } from './settings.service';
import { logger } from '../logger';

export type User = typeof users.$inferSelect;

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  workspaceName: string;
  workspaceWebsite?: string | null;
}

const BCRYPT_ROUNDS = 10;

export async function createUser(input: CreateUserInput): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const inserted = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(users)
      .values({
        email: input.email.toLowerCase().trim(),
        passwordHash,
        name: input.name.trim(),
        workspaceName: input.workspaceName.trim(),
        workspaceWebsite: input.workspaceWebsite?.trim() || null,
      })
      .returning();
    return row;
  });

  await seedDefaultSettings(inserted.id);

  logger.info({ userId: inserted.id, email: inserted.email }, 'User created');
  return inserted;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  return rows[0];
}

export async function getUserById(id: number): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function verifyPassword(user: User, plaintext: string): Promise<boolean> {
  return bcrypt.compare(plaintext, user.passwordHash);
}
