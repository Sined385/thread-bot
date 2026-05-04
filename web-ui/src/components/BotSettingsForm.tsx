import { useState } from 'react';

type Tab = 'personality' | 'content' | 'scheduling' | 'monitoring' | 'guardrails';

interface BotSettingsFormProps {
  settings: Record<string, any>;
  onChange: (key: string, value: any) => void;
  initialTab?: Tab;
}

const TABS: [Tab, string][] = [
  ['personality', 'Personality'],
  ['content', 'Content'],
  ['scheduling', 'Scheduling'],
  ['monitoring', 'Monitoring'],
  ['guardrails', 'Guardrails'],
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <button type="button" className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />;
}

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="setting-row">
      <div className="setting-info">
        <h4>{title}</h4>
        <p>{desc}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ChipEditor({ items, onChange }: { items: any[]; onChange: (v: string[]) => void }) {
  const arr = Array.isArray(items) ? items : [];
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {arr.map((t: string, i: number) => (
          <span key={i} className="chip">
            {t}
            <button type="button" className="x" onClick={() => onChange(arr.filter((_, idx) => idx !== i))}>x</button>
          </span>
        ))}
      </div>
      <input
        className="input"
        placeholder="Type and press Enter"
        style={{ width: 250 }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.currentTarget.value.trim();
            if (val) {
              onChange([...arr, val]);
              e.currentTarget.value = '';
            }
          }
        }}
      />
    </div>
  );
}

export default function BotSettingsForm({ settings, onChange, initialTab = 'personality' }: BotSettingsFormProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const get = (key: string, fallback: any = '') => settings[key] ?? fallback;

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 12 }}>
        {TABS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            className={`tab ${tab === k ? 'active' : ''}`}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 4px' }}>
        {tab === 'personality' && (
          <>
            <Row title="Voice" desc="A short prompt the bot uses to ground every draft. Keep it specific and concrete.">
              <textarea
                className="textarea"
                value={get('personality_description', '')}
                onChange={e => onChange('personality_description', e.target.value)}
              />
            </Row>
            <Row title="Tone" desc="The overall tone the bot aims for.">
              <select className="select" value={get('tone', 'friendly')} onChange={e => onChange('tone', e.target.value)} style={{ width: 200 }}>
                {['professional', 'casual', 'witty', 'sarcastic', 'inspirational', 'educational', 'friendly'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Row>
            <Row title="Warmth level" desc="1 = dry and direct, 10 = warm and personable.">
              <input className="input" type="number" min={1} max={10}
                value={get('warmth_level', 7)}
                onChange={e => onChange('warmth_level', parseInt(e.target.value))}
                style={{ width: 100 }} />
            </Row>
            <Row title="Humor level" desc="1 = deadpan, 10 = very playful.">
              <input className="input" type="number" min={1} max={10}
                value={get('humor_level', 5)}
                onChange={e => onChange('humor_level', parseInt(e.target.value))}
                style={{ width: 100 }} />
            </Row>
            <Row title="Emoji usage" desc="How often the bot uses emoji.">
              <select className="select" value={get('emoji_usage', 'minimal')} onChange={e => onChange('emoji_usage', e.target.value)} style={{ width: 200 }}>
                {['none', 'minimal', 'moderate', 'heavy'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Row>
            <Row title="First-person style" desc="How the bot refers to the account when posting.">
              <select className="select" value={get('first_person_style', 'I')} onChange={e => onChange('first_person_style', e.target.value)} style={{ width: 200 }}>
                {['I', 'we', 'avoid'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Row>
            <Row title="Response length" desc="The bot will aim for this length range.">
              <select className="select" value={get('response_length', 'medium')} onChange={e => onChange('response_length', e.target.value)} style={{ width: 200 }}>
                {['short', 'medium', 'long'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Row>
          </>
        )}

        {tab === 'content' && (
          <>
            <Row title="Topics to cover" desc="Soft suggestions the bot weaves in when generating original posts.">
              <ChipEditor items={get('topics_of_interest', [])} onChange={v => onChange('topics_of_interest', v)} />
            </Row>
            <Row title="Content pillars" desc="Core themes for original posts.">
              <ChipEditor items={get('content_pillars', [])} onChange={v => onChange('content_pillars', v)} />
            </Row>
            <Row title="Hashtag strategy" desc="Most teams leave this on 'none'. Threads' algorithm doesn't reward them.">
              <select className="select" value={get('hashtag_strategy', 'minimal')} onChange={e => onChange('hashtag_strategy', e.target.value)} style={{ width: 200 }}>
                {['none', 'minimal', 'moderate'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Row>
            <Row title="Max post length" desc="Maximum character count for generated posts.">
              <input className="input" type="number"
                value={get('max_post_length', 500)}
                onChange={e => onChange('max_post_length', parseInt(e.target.value))}
                style={{ width: 100 }} />
            </Row>
            <Row title="Language" desc="Primary language for generated content.">
              <input className="input"
                value={get('language', 'en')}
                onChange={e => onChange('language', e.target.value)}
                style={{ width: 120 }} />
            </Row>
          </>
        )}

        {tab === 'scheduling' && (
          <>
            <Row title="Auto-post enabled" desc="Generate scheduled posts automatically based on the cron below.">
              <Toggle on={!!get('auto_post_enabled', false)} onChange={v => onChange('auto_post_enabled', v)} />
            </Row>
            <Row title="Post frequency" desc="How often to draft new original posts.">
              <select className="select" value={get('post_frequency', 'daily')} onChange={e => onChange('post_frequency', e.target.value)} style={{ width: 200 }}>
                {['hourly', 'twice_daily', 'daily', 'weekly'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Row>
            <Row title="Schedule (cron)" desc="When to fire the scheduled post job.">
              <input className="input"
                value={get('post_schedule_cron', '0 9,13,18 * * *')}
                onChange={e => onChange('post_schedule_cron', e.target.value)}
                style={{ width: 250 }} />
            </Row>
            <Row title="Max posts per day" desc="Caps how many original posts can be drafted in a day.">
              <input className="input" type="number"
                value={get('max_posts_per_day', 3)}
                onChange={e => onChange('max_posts_per_day', parseInt(e.target.value))}
                style={{ width: 100 }} />
            </Row>
            <Row title="Max replies per day" desc="Caps how many replies can be drafted in a day.">
              <input className="input" type="number"
                value={get('max_replies_per_day', 20)}
                onChange={e => onChange('max_replies_per_day', parseInt(e.target.value))}
                style={{ width: 100 }} />
            </Row>
            <Row title="Min reply delay (s)" desc="Wait at least this many seconds before publishing a reply.">
              <input className="input" type="number"
                value={get('reply_delay_min', 30)}
                onChange={e => onChange('reply_delay_min', parseInt(e.target.value))}
                style={{ width: 100 }} />
            </Row>
            <Row title="Max reply delay (s)" desc="Wait at most this many seconds before publishing a reply.">
              <input className="input" type="number"
                value={get('reply_delay_max', 120)}
                onChange={e => onChange('reply_delay_max', parseInt(e.target.value))}
                style={{ width: 100 }} />
            </Row>
          </>
        )}

        {tab === 'monitoring' && (
          <>
            <Row title="Reply to mentions" desc="Auto-draft replies when someone @-mentions the connected account.">
              <Toggle on={!!get('monitor_mentions', true)} onChange={v => onChange('monitor_mentions', v)} />
            </Row>
            <Row title="Reply to comments" desc="Draft replies to comments on your published posts.">
              <Toggle on={!!get('monitor_comments', true)} onChange={v => onChange('monitor_comments', v)} />
            </Row>
            <Row title="Question detection" desc="Use AI to detect questions in comments and prioritize them.">
              <Toggle on={!!get('question_detection', true)} onChange={v => onChange('question_detection', v)} />
            </Row>
            <Row title="Respond to all comments" desc="Otherwise the bot only replies to questions or keyword matches.">
              <Toggle on={!!get('respond_to_all_comments', false)} onChange={v => onChange('respond_to_all_comments', v)} />
            </Row>
            <Row title="Watch keywords" desc="Draft replies on Threads posts containing these phrases.">
              <ChipEditor items={get('monitor_keywords', [])} onChange={v => onChange('monitor_keywords', v)} />
            </Row>
            <Row title="Min comment length" desc="Ignore comments shorter than this.">
              <input className="input" type="number"
                value={get('min_comment_length', 3)}
                onChange={e => onChange('min_comment_length', parseInt(e.target.value))}
                style={{ width: 100 }} />
            </Row>
          </>
        )}

        {tab === 'guardrails' && (
          <>
            <Row title="Blacklisted words" desc="The bot will never include these in drafts.">
              <ChipEditor items={get('blacklist_words', [])} onChange={v => onChange('blacklist_words', v)} />
            </Row>
            <Row title="Blacklisted topics" desc="Topics the bot should never engage with.">
              <ChipEditor items={get('blacklist_topics', [])} onChange={v => onChange('blacklist_topics', v)} />
            </Row>
            <Row title="Blacklisted users" desc="Usernames whose comments and mentions are ignored.">
              <ChipEditor items={get('blacklist_users', [])} onChange={v => onChange('blacklist_users', v)} />
            </Row>
            <Row title="Reply control" desc="Who can reply to your published posts (Threads-side setting).">
              <select className="select" value={get('reply_control', 'everyone')} onChange={e => onChange('reply_control', e.target.value)} style={{ width: 240 }}>
                {['everyone', 'accounts_you_follow', 'mentioned_only'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Row>
            <Row title="Max thread depth" desc="Stop auto-replying after this many levels deep in a thread.">
              <input className="input" type="number"
                value={get('max_thread_depth', 3)}
                onChange={e => onChange('max_thread_depth', parseInt(e.target.value))}
                style={{ width: 100 }} />
            </Row>
            <Row title="OpenAI model" desc="Which model to use for generating content.">
              <select className="select" value={get('openai_model', 'gpt-4o')} onChange={e => onChange('openai_model', e.target.value)} style={{ width: 200 }}>
                {['gpt-4o', 'gpt-4o-mini'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Row>
            <Row title="Temperature" desc="0 = deterministic, 2 = very creative.">
              <input className="input" type="number" step={0.1} min={0} max={2}
                value={get('openai_temperature', 0.8)}
                onChange={e => onChange('openai_temperature', parseFloat(e.target.value))}
                style={{ width: 100 }} />
            </Row>
          </>
        )}
      </div>
    </div>
  );
}
