import { bot } from './bot';
import { db } from '../db/client';
import { drafts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../logger';
import { sendDraftNotification, updateDraftMessage } from './notifications';
import { consumeLinkToken } from '../services/telegram-link.service';

// Map of chatId -> draftId for tracking edit conversations
const pendingEdits = new Map<number, number>();

export function registerHandlers(): void {
  // /start handler — links a chat to a user via the deep-link token.
  bot.command('start', async (ctx) => {
    const token = ctx.match?.trim();
    const chatId = ctx.chat.id;
    logger.info({ chatId, hasToken: !!token }, '/start received');

    if (!token) {
      await ctx.reply(
        "Hi! Open the dashboard and tap 'Connect Telegram' to link this chat to your account.",
      );
      return;
    }

    const result = await consumeLinkToken(token, chatId);
    if (result.ok) {
      await ctx.reply('Linked. From now on draft approvals will arrive here.');
    } else if (result.reason === 'expired') {
      await ctx.reply('That link expired. Generate a new one from the dashboard.');
    } else {
      await ctx.reply("That link isn't valid. Generate a new one from the dashboard.");
    }
  });

  // Approve handler
  bot.callbackQuery(/^approve:(\d+)$/, async (ctx) => {
    const draftId = parseInt(ctx.match[1], 10);
    logger.info({ draftId }, 'Approve callback received');

    try {
      const draftRow = await db.query.drafts.findFirst({
        where: eq(drafts.id, draftId),
      });
      if (!draftRow) {
        await ctx.answerCallbackQuery({ text: 'Draft not found.' });
        return;
      }

      await db
        .update(drafts)
        .set({ status: 'approved', updatedAt: new Date() })
        .where(eq(drafts.id, draftId));

      const { publishDraft } = await import('../services/draft.service');
      await publishDraft(draftRow.userId, draftId);

      const draft = await db.query.drafts.findFirst({
        where: eq(drafts.id, draftId),
      });

      if (ctx.callbackQuery.message) {
        await updateDraftMessage(
          ctx.callbackQuery.message.chat.id,
          ctx.callbackQuery.message.message_id,
          ctx.callbackQuery.message.text || '',
          'published',
        );
      }

      await ctx.answerCallbackQuery({ text: 'Draft approved and published!' });
    } catch (error) {
      logger.error({ error, draftId }, 'Failed to approve draft');

      if (ctx.callbackQuery.message) {
        await updateDraftMessage(
          ctx.callbackQuery.message.chat.id,
          ctx.callbackQuery.message.message_id,
          ctx.callbackQuery.message.text || '',
          'failed',
        );
      }

      await ctx.answerCallbackQuery({ text: 'Failed to publish draft. Check logs.' });
    }
  });

  // Edit handler
  bot.callbackQuery(/^edit:(\d+)$/, async (ctx) => {
    const draftId = parseInt(ctx.match[1], 10);
    logger.info({ draftId }, 'Edit callback received');

    try {
      const chatId = ctx.callbackQuery.message?.chat.id;
      if (!chatId) {
        await ctx.answerCallbackQuery({ text: 'Unable to start edit.' });
        return;
      }

      pendingEdits.set(chatId, draftId);

      await ctx.reply(
        `Please type the corrected text for draft #${draftId}.\nSend /cancel to cancel editing.`,
        { reply_to_message_id: ctx.callbackQuery.message?.message_id },
      );

      await ctx.answerCallbackQuery({ text: 'Type your corrected text below.' });
    } catch (error) {
      logger.error({ error, draftId }, 'Failed to initiate edit');
      await ctx.answerCallbackQuery({ text: 'Failed to start edit. Check logs.' });
    }
  });

  // Reject handler
  bot.callbackQuery(/^reject:(\d+)$/, async (ctx) => {
    const draftId = parseInt(ctx.match[1], 10);
    logger.info({ draftId }, 'Reject callback received');

    try {
      await db
        .update(drafts)
        .set({ status: 'rejected', updatedAt: new Date() })
        .where(eq(drafts.id, draftId));

      if (ctx.callbackQuery.message) {
        await updateDraftMessage(
          ctx.callbackQuery.message.chat.id,
          ctx.callbackQuery.message.message_id,
          ctx.callbackQuery.message.text || '',
          'rejected',
        );
      }

      await ctx.answerCallbackQuery({ text: 'Draft rejected.' });
    } catch (error) {
      logger.error({ error, draftId }, 'Failed to reject draft');
      await ctx.answerCallbackQuery({ text: 'Failed to reject draft. Check logs.' });
    }
  });

  // Text message handler for receiving edited draft content
  bot.on('message:text', async (ctx) => {
    const chatId = ctx.chat.id;
    const draftId = pendingEdits.get(chatId);

    if (draftId === undefined) {
      return; // No pending edit for this chat
    }

    const newText = ctx.message.text;

    // Allow cancellation
    if (newText === '/cancel') {
      pendingEdits.delete(chatId);
      await ctx.reply('Edit cancelled.');
      return;
    }

    try {
      pendingEdits.delete(chatId);

      // Update draft content in DB
      await db
        .update(drafts)
        .set({ content: newText, updatedAt: new Date() })
        .where(eq(drafts.id, draftId));

      // Fetch updated draft for the new preview
      const updatedDraft = await db.query.drafts.findFirst({
        where: eq(drafts.id, draftId),
      });

      if (!updatedDraft) {
        await ctx.reply('Draft not found.');
        return;
      }

      // Send new preview with Approve/Cancel buttons
      const { InlineKeyboard } = await import('grammy');
      const keyboard = new InlineKeyboard()
        .text('\u{2705} Approve', `approve:${draftId}`)
        .text('\u{274C} Reject', `reject:${draftId}`);

      await ctx.reply(
        `\u{270F}\u{FE0F} Edited Draft #${draftId}:\n\n${newText}`,
        { reply_markup: keyboard },
      );

      logger.info({ draftId, chatId }, 'Draft content updated via Telegram edit');
    } catch (error) {
      logger.error({ error, draftId }, 'Failed to update draft content');
      pendingEdits.delete(chatId);
      await ctx.reply('Failed to update draft. Please try again.');
    }
  });
}
