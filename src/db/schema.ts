import { pgTable, serial, integer, text, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  workspaceName: text('workspace_name').notNull(),
  workspaceWebsite: text('workspace_website'),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  telegramChatId: text('telegram_chat_id'),
  telegramLinkToken: text('telegram_link_token').unique(),
  telegramLinkTokenExpiresAt: timestamp('telegram_link_token_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const accounts = pgTable(
  'accounts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    threadsUserId: text('threads_user_id').notNull().unique(),
    username: text('username').notNull(),
    accessToken: text('access_token').notNull(),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }).notNull(),
    scopes: text('scopes'),
    profilePictureUrl: text('profile_picture_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userIdIdx: index('idx_accounts_user_id').on(t.userId),
  }),
);

export const drafts = pgTable(
  'drafts',
  {
    id: serial('id').primaryKey(),
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
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    publishedThreadId: text('published_thread_id'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userIdIdx: index('idx_drafts_user_id').on(t.userId),
    statusIdx: index('idx_drafts_status').on(t.status),
    typeIdx: index('idx_drafts_type').on(t.type),
    scheduledForIdx: index('idx_drafts_scheduled_for').on(t.scheduledFor),
  }),
);

export const settings = pgTable(
  'settings',
  {
    id: serial('id').primaryKey(),
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

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    topic: text('topic'),
    field: text('field'),
    payload: text('payload').notNull(),
    processed: boolean('processed').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userIdIdx: index('idx_webhook_events_user_id').on(t.userId),
    processedIdx: index('idx_webhook_events_processed').on(t.processed),
  }),
);

export const publishedPosts = pgTable(
  'published_posts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    threadsMediaId: text('threads_media_id').notNull().unique(),
    content: text('content').notNull(),
    permalink: text('permalink'),
    draftId: integer('draft_id').references(() => drafts.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userIdIdx: index('idx_published_posts_user_id').on(t.userId),
  }),
);

export const processedThreads = pgTable(
  'processed_threads',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    threadsMediaId: text('threads_media_id').notNull(),
    type: text('type').notNull().$type<'comment' | 'mention'>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userIdIdx: index('idx_processed_threads_user_id').on(t.userId),
    mediaIdIdx: index('idx_processed_threads_media_id').on(t.threadsMediaId),
  }),
);
