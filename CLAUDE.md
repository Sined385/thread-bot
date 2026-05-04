# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Server (root)
- `npm run dev` — run the API + Telegram bot + scheduler with hot reload (tsx watch)
- `npm run build` — TypeScript compile to `dist/` (`tsc`)
- `npm start` — run the compiled server (`node dist/index.js`)
- `npm run db:migrate` — apply schema by running `src/db/migrate.ts` (manual `CREATE TABLE IF NOT EXISTS` SQL — **not** `drizzle-kit push`)
- `npm run db:generate` — generate Drizzle migration files (rarely used; runtime relies on `migrate.ts`)
- `npm run seed` — seed the 35 default settings via `scripts/seed-settings.ts`

### Web UI (`web-ui/`)
- `cd web-ui && npm run dev` — Vite dev server, proxies `/api` → `http://localhost:3000`
- `cd web-ui && npm run build` — typecheck + build to `web-ui/dist/` (served by Express in production)
- `npm run build:web` from root is equivalent

### Docker
- `docker compose up --build` — build and run the production image; data persists in the `bot-data` volume

There is no test runner or linter configured. "Compiles clean" via `npm run build` (server) and `cd web-ui && npm run build` (UI) is the verification baseline.

## Architecture

### Process layout
`src/index.ts` is the single entry point. It boots three concurrent subsystems in the same Node process:
1. **Express server** (`src/web/server.ts`) — REST API under `/api/*` plus static-serving the built React UI from `web-ui/dist`. The catch-all `/{*splat}` route falls through to `index.html` so client-side routing works.
2. **Telegram bot** (`src/telegram/bot.ts` + `handlers.ts`) — Grammy long-polling. Registers `approve:<id>`, `edit:<id>`, `reject:<id>` callback handlers and a `message:text` handler keyed off an in-memory `pendingEdits` map (chatId → draftId) for the edit conversation flow.
3. **Scheduler** (`src/scheduler/cron.ts`) — two `node-cron` jobs: scheduled post generation (cron expression read from the `post_schedule_cron` setting) and a daily 03:00 token-refresh job.

### The approval workflow (the central abstraction)
Everything that gets posted to Threads — scheduled posts, comment replies, mention replies, keyword-triggered replies — flows through the **draft** lifecycle in `src/services/draft.service.ts`:
1. A trigger (cron, webhook, manual API) calls `createDraft()`. The draft is inserted with `status='pending'`, then a Telegram message with Approve/Edit/Reject inline buttons is sent. The returned `message_id` and `chat.id` are written back to the draft so we can later edit that exact message.
2. The user reacts in Telegram. `handlers.ts` updates `status` (`approved` / `rejected`) and, on approve, calls `publishDraft()`.
3. `publishDraft()` looks up the single account row, instantiates `ThreadsApi`, dispatches to `createPost()` or `replyToPost()` based on `draft.type`, then writes either `status='published'` (+ a `published_posts` row) or `status='failed'` (+ `errorMessage`). It also calls `updateDraftMessage()` to mutate the original Telegram message so the UI in chat reflects the final state.

When adding a new trigger source, the rule is: **never publish directly — always go through `createDraft()`**. The `triggerSource` enum and the `type` enum on `drafts` are the extension points.

### Draft `type` vs `triggerSource`
- `type` controls **publish behavior**: `original_post` calls `createPost`; everything else (`reply`, `mention_reply`, `keyword_reply`) requires `replyToThreadId` and calls `replyToPost`.
- `triggerSource` is **provenance** for analytics and UI filtering: `scheduled`, `webhook_comment`, `webhook_mention`, `keyword_match`, `manual`.

### Webhook ingestion
`src/threads/webhooks.ts` handles two flows on `/api/webhooks/threads`:
- **GET** — Meta's `hub.challenge` verification (token compared against `THREADS_WEBHOOK_VERIFY_TOKEN`).
- **POST** — HMAC-SHA256 signature validation (`X-Hub-Signature-256`) against the **raw** request body. The raw body is captured by a pre-`express.json()` middleware in `server.ts` that streams chunks into `req.rawBody` for this path only. Don't move that middleware or signature verification breaks.

Each event is persisted to `webhook_events` (raw payload + `processed=false`) and routed by `field`: `replies` → `comment.service.processComment`, `mentions` → `mention.service.processMention`. Both services use lazy `await import(...)` to avoid circular deps with the telegram and draft layers.

### Settings system
Settings are a **DB-driven config layer**, not env vars. `src/db/schema.ts::settings` is a key/value table where `value` is a **JSON-stringified** primitive (string values often arrive double-quoted, e.g. `"0 9,13,18 * * *"`). `getSettings()` in `src/openai/prompts.ts` unwraps quoted strings; cron-related code (e.g. `cron.ts`) strips JSON quotes manually before passing to `node-cron`.

The web UI (`web-ui/src/pages/Settings.tsx`) renders settings dynamically from the rows' `type`, `label`, `description`, and `options` columns. To add a new setting: append to `scripts/seed-settings.ts` and re-run `npm run seed` — the UI picks it up automatically.

`buildSystemPrompt(context)` in `src/openai/prompts.ts` composes the OpenAI system prompt from these settings, with three escape hatches in priority order: `post_system_prompt`, `reply_system_prompt`, `custom_system_prompt`. If any of those are set, they fully override the composed personality/content blocks.

### Threads API client
`src/threads/api.ts::ThreadsApi` wraps `graph.threads.net/v1.0` with:
- **Retry** — exponential backoff (3 attempts, `2^n` seconds), but client-side 4xx **except 429** is treated as non-retryable.
- **Circuit breaker** — opens after 5 consecutive failures for 60s, then transitions to half-open. State is per-instance, so each draft publish gets its own breaker.
- **Two-step publish** — `createMediaContainer` returns a container ID; `createPost`/`replyToPost` then poll `?fields=id,status` every 2s up to 30s waiting for `status=FINISHED` before calling `publishContainer`. Don't skip the poll — Threads occasionally returns containers in `IN_PROGRESS` state.

### Database
- Drizzle ORM over `better-sqlite3`. **Synchronous** API (`.all()`, `.get()`, `.run()`) — no `await` needed for queries themselves, though many service functions are still `async` because they call into Telegram / Threads.
- Schema lives in `src/db/schema.ts`; runtime migration is the `CREATE TABLE IF NOT EXISTS` block in `src/db/migrate.ts` (also executed implicitly on first import of `src/db/client.ts`).
- WAL mode and `foreign_keys=ON` are enabled at startup.
- Six tables: `accounts` (single Threads OAuth identity), `drafts`, `settings`, `webhook_events`, `published_posts`, `processed_threads` (dedup for webhook events).

### Web UI
React 19 + Vite + react-router-dom 7. Auth is a simple shared-secret check (`WEB_UI_SECRET`) gated by `src/web/middleware/auth.middleware.ts`. In dev, run the Vite server alongside the API — Vite's proxy forwards `/api` to port 3000.

## Configuration

Environment variables are validated via Zod in `src/config.ts`; the process exits on missing/invalid env. Required: `THREADS_APP_ID`, `THREADS_APP_SECRET`, `THREADS_REDIRECT_URI`, `THREADS_WEBHOOK_VERIFY_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `OPENAI_API_KEY`, `WEB_UI_SECRET`. See `.env.example` for the shape (note: the committed example contains real-looking secrets — treat them as placeholders and rotate before any public exposure).

## Conventions worth knowing

- **Lazy imports** between layers (`await import('../services/draft.service')` from telegram handlers, etc.) are intentional to break circular dependencies between `services/`, `telegram/`, and `threads/`. Keep this pattern when adding new cross-layer calls.
- **Logging** is `pino` via `src/logger.ts`. Use structured fields (`logger.info({ draftId, ... }, 'message')`), not string interpolation.
- **No tests exist.** When changing the publish path, manually exercise: create a draft → approve in Telegram → confirm `status='published'` and a `published_posts` row.
