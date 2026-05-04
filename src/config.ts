import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production']).default('development'),

  DATABASE_PATH: z.string().default('./data/threads-bot.db'),

  THREADS_APP_ID: z.string().min(1),
  THREADS_APP_SECRET: z.string().min(1),
  THREADS_REDIRECT_URI: z.string().url(),
  THREADS_WEBHOOK_VERIFY_TOKEN: z.string().min(1),

  TELEGRAM_BOT_TOKEN: z.string().min(1),

  OPENAI_API_KEY: z.string().min(1),

  JWT_SECRET: z.string().min(16),
});

export type Env = z.infer<typeof envSchema>;

function loadConfig(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
