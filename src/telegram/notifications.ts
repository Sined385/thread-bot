import { InlineKeyboard } from 'grammy';
import { bot } from './bot';
import { logger } from '../logger';

interface Draft {
  id: number;
  type: 'original_post' | 'reply' | 'mention_reply' | 'keyword_reply';
  status: string;
  content: string;
  replyToText?: string | null;
  replyToUsername?: string | null;
  triggerSource: string;
}

const TYPE_LABELS: Record<Draft['type'], string> = {
  original_post: '\u{1F4DD} Original Post',
  reply: '\u{1F4AC} Reply',
  mention_reply: '\u{1F4E2} Mention Reply',
  keyword_reply: '\u{1F50D} Keyword Reply',
};

function buildDraftPreviewText(draft: Draft): string {
  const lines: string[] = [];

  lines.push(`${TYPE_LABELS[draft.type]}`);
  lines.push('');

  if (
    (draft.type === 'reply' || draft.type === 'mention_reply' || draft.type === 'keyword_reply') &&
    draft.replyToText
  ) {
    const username = draft.replyToUsername ? `@${draft.replyToUsername}` : 'unknown';
    lines.push(`Replying to ${username}:`);
    lines.push(`> ${draft.replyToText}`);
    lines.push('');
  }

  lines.push('Draft:');
  lines.push(draft.content);

  return lines.join('\n');
}

export async function sendDraftNotification(draft: Draft, chatId: string | number) {
  const text = buildDraftPreviewText(draft);

  const keyboard = new InlineKeyboard()
    .text('\u{2705} Approve', `approve:${draft.id}`)
    .text('\u{270F}\u{FE0F} Edit', `edit:${draft.id}`)
    .text('\u{274C} Reject', `reject:${draft.id}`);

  try {
    const message = await bot.api.sendMessage(chatId, text, {
      reply_markup: keyboard,
    });

    logger.info(
      { draftId: draft.id, chatId, messageId: message.message_id },
      'Sent draft notification to Telegram',
    );

    return message;
  } catch (error) {
    logger.error({ error, draftId: draft.id, chatId }, 'Failed to send draft notification to Telegram');
    throw error;
  }
}

export async function updateDraftMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  status: 'published' | 'rejected' | 'edited' | 'failed',
) {
  const statusBadges: Record<typeof status, string> = {
    published: '\u{2705} Published',
    rejected: '\u{274C} Rejected',
    edited: '\u{270F}\u{FE0F} Edited',
    failed: '\u{26A0}\u{FE0F} Failed',
  };

  let updatedText: string;

  if (status === 'rejected') {
    const strikethrough = text
      .split('\n')
      .map((line) => `~${line}~`)
      .join('\n');
    updatedText = `${statusBadges[status]}\n\n${strikethrough}`;
  } else {
    updatedText = `${statusBadges[status]}\n\n${text}`;
  }

  try {
    const result = await bot.api.editMessageText(chatId, messageId, updatedText);

    logger.info(
      { chatId, messageId, status },
      'Updated draft message in Telegram',
    );

    return result;
  } catch (error) {
    logger.error(
      { error, chatId, messageId, status },
      'Failed to update draft message in Telegram',
    );
    throw error;
  }
}
