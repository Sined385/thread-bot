import { getSettings as getSettingsForUser } from '../services/settings.service';

export async function getSettings(userId: number): Promise<Record<string, string>> {
  return getSettingsForUser(userId);
}

/**
 * Builds a system prompt for OpenAI based on settings stored in the database.
 */
export async function buildSystemPrompt(
  userId: number,
  context: 'post' | 'reply' | 'mention_reply',
): Promise<string> {
  const s = await getSettings(userId);

  // Check for context-specific prompt overrides first
  if (context === 'post' && s.post_system_prompt) {
    return s.post_system_prompt;
  }
  if (context === 'reply' && s.reply_system_prompt) {
    return s.reply_system_prompt;
  }
  if (context === 'mention_reply' && s.reply_system_prompt) {
    return s.reply_system_prompt;
  }
  if (s.custom_system_prompt) {
    return s.custom_system_prompt;
  }

  // Personality settings
  const tone = s.tone || 'friendly and conversational';
  const warmthLevel = s.warmth_level || '7';
  const humorLevel = s.humor_level || '5';
  const emojiUsage = s.emoji_usage || 'moderate';
  const personalityDescription =
    s.personality_description || 'a helpful and engaging social media personality';
  const firstPersonStyle = s.first_person_style || 'casual';

  // Content settings
  const responseLength = s.response_length || 'medium';
  const maxPostLength = s.max_post_length || '500';
  const topicsOfInterest = s.topics_of_interest || 'general topics';
  const contentPillars = s.content_pillars || 'informative, entertaining';
  const hashtagStrategy = s.hashtag_strategy || 'minimal';
  const language = s.language || 'English';

  const personalityBlock = [
    `You are ${personalityDescription}.`,
    `Tone: ${tone}.`,
    `Warmth level: ${warmthLevel}/10.`,
    `Humor level: ${humorLevel}/10.`,
    `Emoji usage: ${emojiUsage}.`,
    `First-person style: ${firstPersonStyle}.`,
  ].join('\n');

  const contentBlock = [
    `Response length preference: ${responseLength}.`,
    `Topics of interest: ${topicsOfInterest}.`,
    `Content pillars: ${contentPillars}.`,
    `Hashtag strategy: ${hashtagStrategy}.`,
    `Language: ${language}.`,
  ].join('\n');

  let contextInstructions: string;

  switch (context) {
    case 'post':
      contextInstructions = [
        'You are creating an original post for the Threads social media platform.',
        'Write something engaging, authentic, and thought-provoking.',
        'The post should feel natural, not like AI-generated content.',
        'Do not include quotation marks around the post.',
      ].join('\n');
      break;

    case 'reply':
      contextInstructions = [
        'You are replying to a comment on the Threads social media platform.',
        'Be conversational and engage authentically with the commenter.',
        'Acknowledge what they said and add value to the conversation.',
        'Do not include quotation marks around the reply.',
      ].join('\n');
      break;

    case 'mention_reply':
      contextInstructions = [
        'You are replying to someone who mentioned you on the Threads social media platform.',
        'Be appreciative of the mention and engage meaningfully.',
        'Respond directly to what they said or asked.',
        'Do not include quotation marks around the reply.',
      ].join('\n');
      break;
  }

  const threadsGuidelines = [
    'Threads-specific guidelines:',
    '- Keep it concise and punchy — Threads rewards brevity.',
    '- Write in a human, authentic voice.',
    '- Avoid sounding overly promotional or robotic.',
    '- Do not use markdown formatting.',
    '- Do not start with greetings like "Hey!" unless it fits naturally.',
  ].join('\n');

  const prompt = [
    personalityBlock,
    '',
    contentBlock,
    '',
    contextInstructions,
    '',
    threadsGuidelines,
    '',
    `Keep responses under ${maxPostLength} characters.`,
  ].join('\n');

  return prompt;
}
