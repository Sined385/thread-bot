import { openai } from './client';
import { buildSystemPrompt, getSettings } from './prompts';
import { logger } from '../logger';

/**
 * Generates an original post for Threads.
 */
export async function generatePost(): Promise<string> {
  const s = await getSettings();
  const systemPrompt = await buildSystemPrompt('post');
  const model = s.openai_model || 'gpt-4o';
  const temperature = parseFloat(s.openai_temperature || '0.8');
  const maxPostLength = parseInt(s.max_post_length || '500', 10);

  const contentPillars = s.content_pillars || 'informative, entertaining';
  const topicsOfInterest = s.topics_of_interest || 'general topics';

  const userMessage = [
    'Generate an original post for Threads.',
    `Content pillars to draw from: ${contentPillars}.`,
    `Topics of interest: ${topicsOfInterest}.`,
    'Write one post. Do not include any meta-commentary or explanation.',
  ].join('\n');

  let content = await callOpenAI(systemPrompt, userMessage, model, temperature);

  // Retry once if the response exceeds the max length
  if (content.length > maxPostLength) {
    logger.warn(
      { length: content.length, maxPostLength },
      'Generated post exceeded max length, retrying',
    );
    const retryMessage = [
      userMessage,
      '',
      `IMPORTANT: Your previous response was ${content.length} characters which exceeds the ${maxPostLength} character limit. Please make it shorter.`,
    ].join('\n');
    content = await callOpenAI(systemPrompt, retryMessage, model, temperature);
  }

  return content;
}

/**
 * Generates a reply to a comment on Threads.
 */
export async function generateReply(
  commentText: string,
  commentUsername: string,
  context?: string,
): Promise<string> {
  const s = await getSettings();
  const systemPrompt = await buildSystemPrompt('reply');
  const model = s.openai_model || 'gpt-4o';
  const temperature = parseFloat(s.openai_temperature || '0.8');
  const maxPostLength = parseInt(s.max_post_length || '500', 10);

  const lines = [
    `@${commentUsername} wrote the following comment:`,
    `"${commentText}"`,
    '',
    'Write a reply to this comment. Do not include any meta-commentary or explanation.',
  ];

  if (context) {
    lines.splice(2, 0, `Context of the original post: ${context}`);
  }

  const userMessage = lines.join('\n');

  let content = await callOpenAI(systemPrompt, userMessage, model, temperature);

  // Retry once if the response exceeds the max length
  if (content.length > maxPostLength) {
    logger.warn(
      { length: content.length, maxPostLength },
      'Generated reply exceeded max length, retrying',
    );
    const retryMessage = [
      userMessage,
      '',
      `IMPORTANT: Your previous response was ${content.length} characters which exceeds the ${maxPostLength} character limit. Please make it shorter.`,
    ].join('\n');
    content = await callOpenAI(systemPrompt, retryMessage, model, temperature);
  }

  return content;
}

/**
 * Generates a reply to a mention on Threads.
 */
export async function generateMentionReply(
  mentionText: string,
  mentionUsername: string,
): Promise<string> {
  const s = await getSettings();
  const systemPrompt = await buildSystemPrompt('mention_reply');
  const model = s.openai_model || 'gpt-4o';
  const temperature = parseFloat(s.openai_temperature || '0.8');
  const maxPostLength = parseInt(s.max_post_length || '500', 10);

  const userMessage = [
    `@${mentionUsername} mentioned you and wrote:`,
    `"${mentionText}"`,
    '',
    'Write a reply to this mention. Do not include any meta-commentary or explanation.',
  ].join('\n');

  let content = await callOpenAI(systemPrompt, userMessage, model, temperature);

  // Retry once if the response exceeds the max length
  if (content.length > maxPostLength) {
    logger.warn(
      { length: content.length, maxPostLength },
      'Generated mention reply exceeded max length, retrying',
    );
    const retryMessage = [
      userMessage,
      '',
      `IMPORTANT: Your previous response was ${content.length} characters which exceeds the ${maxPostLength} character limit. Please make it shorter.`,
    ].join('\n');
    content = await callOpenAI(systemPrompt, retryMessage, model, temperature);
  }

  return content;
}

/**
 * Calls the OpenAI chat completions API and returns the response text.
 */
async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  model: string,
  temperature: number,
): Promise<string> {
  logger.debug({ model, temperature }, 'Calling OpenAI');

  const response = await openai.chat.completions.create({
    model,
    temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim() ?? '';

  if (!content) {
    logger.error('OpenAI returned an empty response');
    throw new Error('OpenAI returned an empty response');
  }

  logger.debug({ length: content.length }, 'OpenAI response received');
  return content;
}
