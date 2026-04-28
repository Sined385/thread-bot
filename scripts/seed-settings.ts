import dotenv from 'dotenv';
dotenv.config();

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || './data/threads-bot.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);

interface SettingSeed {
  key: string;
  value: any;
  category: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'array' | 'textarea';
  options?: string[];
}

const seedSettings: SettingSeed[] = [
  // Personality
  { key: 'tone', value: 'friendly', category: 'personality', label: 'Tone', description: 'Overall tone of generated content', type: 'select', options: ['professional', 'casual', 'witty', 'sarcastic', 'inspirational', 'educational', 'friendly'] },
  { key: 'warmth_level', value: 7, category: 'personality', label: 'Warmth Level', description: 'How warm and approachable (1-10)', type: 'number' },
  { key: 'humor_level', value: 5, category: 'personality', label: 'Humor Level', description: 'How much humor to use (1-10)', type: 'number' },
  { key: 'emoji_usage', value: 'minimal', category: 'personality', label: 'Emoji Usage', description: 'How frequently to use emojis', type: 'select', options: ['none', 'minimal', 'moderate', 'heavy'] },
  { key: 'personality_description', value: '', category: 'personality', label: 'Personality Description', description: 'Free-text description of desired personality', type: 'textarea' },
  { key: 'first_person_style', value: 'I', category: 'personality', label: 'First Person Style', description: 'How to refer to self', type: 'select', options: ['I', 'we', 'avoid'] },

  // Content
  { key: 'response_length', value: 'medium', category: 'content', label: 'Response Length', description: 'Preferred length of responses', type: 'select', options: ['short', 'medium', 'long'] },
  { key: 'max_post_length', value: 500, category: 'content', label: 'Max Post Length', description: 'Maximum characters per post (max 500)', type: 'number' },
  { key: 'topics_of_interest', value: [], category: 'content', label: 'Topics of Interest', description: 'Topics the bot should discuss', type: 'array' },
  { key: 'content_pillars', value: [], category: 'content', label: 'Content Pillars', description: 'Core themes for original posts', type: 'array' },
  { key: 'hashtag_strategy', value: 'minimal', category: 'content', label: 'Hashtag Strategy', description: 'How to use hashtags', type: 'select', options: ['none', 'minimal', 'moderate'] },
  { key: 'language', value: 'en', category: 'content', label: 'Language', description: 'Language for generated content', type: 'text' },

  // Monitoring
  { key: 'monitor_comments', value: true, category: 'monitoring', label: 'Monitor Comments', description: 'Auto-reply to comments on own posts', type: 'boolean' },
  { key: 'monitor_mentions', value: true, category: 'monitoring', label: 'Monitor Mentions', description: 'Auto-reply to mentions', type: 'boolean' },
  { key: 'monitor_keywords', value: [], category: 'monitoring', label: 'Monitor Keywords', description: 'Keywords to watch for in replies', type: 'array' },
  { key: 'respond_to_all_comments', value: false, category: 'monitoring', label: 'Respond to All Comments', description: 'Reply to all comments (not just questions)', type: 'boolean' },
  { key: 'question_detection', value: true, category: 'monitoring', label: 'Question Detection', description: 'Use AI to detect questions in comments', type: 'boolean' },
  { key: 'blacklist_words', value: [], category: 'monitoring', label: 'Blacklisted Words', description: 'Words to filter out', type: 'array' },
  { key: 'blacklist_topics', value: [], category: 'monitoring', label: 'Blacklisted Topics', description: 'Topics to avoid', type: 'array' },
  { key: 'blacklist_users', value: [], category: 'monitoring', label: 'Blacklisted Users', description: 'Users to ignore', type: 'array' },
  { key: 'min_comment_length', value: 3, category: 'monitoring', label: 'Min Comment Length', description: 'Minimum comment length to respond to', type: 'number' },

  // Scheduling
  { key: 'auto_post_enabled', value: false, category: 'scheduling', label: 'Auto Post Enabled', description: 'Enable automatic post generation', type: 'boolean' },
  { key: 'post_frequency', value: 'daily', category: 'scheduling', label: 'Post Frequency', description: 'How often to generate posts', type: 'select', options: ['hourly', 'twice_daily', 'daily', 'weekly'] },
  { key: 'post_schedule_cron', value: '0 9,13,18 * * *', category: 'scheduling', label: 'Post Schedule (Cron)', description: 'Cron expression for post schedule', type: 'text' },
  { key: 'max_posts_per_day', value: 3, category: 'scheduling', label: 'Max Posts Per Day', description: 'Maximum original posts per day', type: 'number' },
  { key: 'max_replies_per_day', value: 20, category: 'scheduling', label: 'Max Replies Per Day', description: 'Maximum replies per day', type: 'number' },
  { key: 'reply_delay_min', value: 30, category: 'scheduling', label: 'Min Reply Delay (s)', description: 'Minimum seconds before replying', type: 'number' },
  { key: 'reply_delay_max', value: 120, category: 'scheduling', label: 'Max Reply Delay (s)', description: 'Maximum seconds before replying', type: 'number' },

  // Advanced
  { key: 'openai_model', value: 'gpt-4o', category: 'advanced', label: 'OpenAI Model', description: 'Model to use for content generation', type: 'select', options: ['gpt-4o', 'gpt-4o-mini'] },
  { key: 'openai_temperature', value: 0.8, category: 'advanced', label: 'Temperature', description: 'AI creativity level (0.0-2.0)', type: 'number' },
  { key: 'custom_system_prompt', value: '', category: 'advanced', label: 'Custom System Prompt', description: 'Override system prompt for all contexts', type: 'textarea' },
  { key: 'reply_system_prompt', value: '', category: 'advanced', label: 'Reply System Prompt', description: 'Custom system prompt for replies only', type: 'textarea' },
  { key: 'post_system_prompt', value: '', category: 'advanced', label: 'Post System Prompt', description: 'Custom system prompt for posts only', type: 'textarea' },
  { key: 'max_thread_depth', value: 3, category: 'advanced', label: 'Max Thread Depth', description: 'Stop auto-replying after N levels deep', type: 'number' },
  { key: 'reply_control', value: 'everyone', category: 'advanced', label: 'Reply Control', description: 'Who can reply to our posts', type: 'select', options: ['everyone', 'accounts_you_follow', 'mentioned_only'] },
];

const stmt = sqlite.prepare(`
  INSERT OR IGNORE INTO settings (key, value, category, label, description, type, options)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const setting of seedSettings) {
  stmt.run(
    setting.key,
    JSON.stringify(setting.value),
    setting.category,
    setting.label,
    setting.description,
    setting.type,
    setting.options ? JSON.stringify(setting.options) : null
  );
}

console.log(`Seeded ${seedSettings.length} settings.`);
sqlite.close();
