CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"threads_user_id" text NOT NULL,
	"username" text NOT NULL,
	"access_token" text NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"scopes" text,
	"profile_picture_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "accounts_threads_user_id_unique" UNIQUE("threads_user_id")
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"content" text NOT NULL,
	"original_content" text,
	"reply_to_thread_id" text,
	"reply_to_text" text,
	"reply_to_username" text,
	"telegram_message_id" integer,
	"telegram_chat_id" text,
	"trigger_source" text NOT NULL,
	"scheduled_for" timestamp with time zone,
	"published_thread_id" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "processed_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"threads_media_id" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "published_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"threads_media_id" text NOT NULL,
	"content" text NOT NULL,
	"permalink" text,
	"draft_id" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "published_posts_threads_media_id_unique" UNIQUE("threads_media_id")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"category" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"options" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"workspace_name" text NOT NULL,
	"workspace_website" text,
	"onboarding_completed_at" timestamp with time zone,
	"telegram_chat_id" text,
	"telegram_link_token" text,
	"telegram_link_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_telegram_link_token_unique" UNIQUE("telegram_link_token")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"topic" text,
	"field" text,
	"payload" text NOT NULL,
	"processed" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processed_threads" ADD CONSTRAINT "processed_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_posts" ADD CONSTRAINT "published_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_posts" ADD CONSTRAINT "published_posts_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_user_id" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_drafts_user_id" ON "drafts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_drafts_status" ON "drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_drafts_type" ON "drafts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_drafts_scheduled_for" ON "drafts" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_processed_threads_user_id" ON "processed_threads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_processed_threads_media_id" ON "processed_threads" USING btree ("threads_media_id");--> statement-breakpoint
CREATE INDEX "idx_published_posts_user_id" ON "published_posts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settings_user_key_unique" ON "settings" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_user_id" ON "webhook_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_processed" ON "webhook_events" USING btree ("processed");