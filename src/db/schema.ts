import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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
  type: text('type').notNull().$type<'original_post' | 'reply' | 'mention_reply' | 'keyword_reply'>(),
  status: text('status').notNull().default('pending').$type<'pending' | 'approved' | 'rejected' | 'published' | 'failed'>(),
  content: text('content').notNull(),
  originalContent: text('original_content'),
  replyToThreadId: text('reply_to_thread_id'),
  replyToText: text('reply_to_text'),
  replyToUsername: text('reply_to_username'),
  telegramMessageId: integer('telegram_message_id'),
  telegramChatId: text('telegram_chat_id'),
  triggerSource: text('trigger_source').notNull().$type<'scheduled' | 'webhook_comment' | 'webhook_mention' | 'keyword_match' | 'manual'>(),
  publishedThreadId: text('published_thread_id'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(), // JSON stringified
  category: text('category').notNull(),
  label: text('label').notNull(),
  description: text('description'),
  type: text('type').notNull().$type<'text' | 'number' | 'boolean' | 'select' | 'array' | 'textarea'>(),
  options: text('options'), // JSON array for select type
});

export const webhookEvents = sqliteTable('webhook_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  topic: text('topic'),
  field: text('field'),
  payload: text('payload').notNull(),
  processed: integer('processed', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const publishedPosts = sqliteTable('published_posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  threadsMediaId: text('threads_media_id').notNull().unique(),
  content: text('content').notNull(),
  permalink: text('permalink'),
  draftId: integer('draft_id').references(() => drafts.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const processedThreads = sqliteTable('processed_threads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  threadsMediaId: text('threads_media_id').notNull(),
  type: text('type').notNull().$type<'comment' | 'mention'>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});
