import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  workspaceName: text('workspace_name').notNull(),
  workspaceWebsite: text('workspace_website'),
  onboardingCompletedAt: integer('onboarding_completed_at', { mode: 'timestamp' }),
  telegramChatId: text('telegram_chat_id'),
  telegramLinkToken: text('telegram_link_token').unique(),
  telegramLinkTokenExpiresAt: integer('telegram_link_token_expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  threadsUserId: text('threads_user_id').notNull().unique(),
  username: text('username').notNull(),
  accessToken: text('access_token').notNull(),
  tokenExpiresAt: integer('token_expires_at', { mode: 'timestamp' }).notNull(),
  scopes: text('scopes'),
  profilePictureUrl: text('profile_picture_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const drafts = sqliteTable('drafts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type').notNull().$type<'original_post' | 'reply' | 'mention_reply' | 'keyword_reply'>(),
  status: text('status').notNull().default('pending').$type<'pending' | 'approved' | 'scheduled' | 'rejected' | 'published' | 'failed'>(),
  content: text('content').notNull(),
  originalContent: text('original_content'),
  replyToThreadId: text('reply_to_thread_id'),
  replyToText: text('reply_to_text'),
  replyToUsername: text('reply_to_username'),
  telegramMessageId: integer('telegram_message_id'),
  telegramChatId: text('telegram_chat_id'),
  triggerSource: text('trigger_source').notNull().$type<'scheduled' | 'webhook_comment' | 'webhook_mention' | 'keyword_match' | 'manual'>(),
  scheduledFor: integer('scheduled_for', { mode: 'timestamp' }),
  publishedThreadId: text('published_thread_id'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const settings = sqliteTable(
  'settings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id),
    key: text('key').notNull(),
    value: text('value').notNull(),
    category: text('category').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    type: text('type').notNull().$type<'text' | 'number' | 'boolean' | 'select' | 'array' | 'textarea'>(),
    options: text('options'),
  },
  (t) => ({
    userKey: uniqueIndex('settings_user_key_unique').on(t.userId, t.key),
  }),
);

export const webhookEvents = sqliteTable('webhook_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  topic: text('topic'),
  field: text('field'),
  payload: text('payload').notNull(),
  processed: integer('processed', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const publishedPosts = sqliteTable('published_posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  threadsMediaId: text('threads_media_id').notNull().unique(),
  content: text('content').notNull(),
  permalink: text('permalink'),
  draftId: integer('draft_id').references(() => drafts.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const processedThreads = sqliteTable('processed_threads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  threadsMediaId: text('threads_media_id').notNull(),
  type: text('type').notNull().$type<'comment' | 'mention'>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});
