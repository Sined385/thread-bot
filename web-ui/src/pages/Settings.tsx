import { useState, useEffect } from 'react';
import { api } from '../api';
import { Icons } from '../components/Icons';

function Toggle({ on: initial, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const [on, setOn] = useState(initial);
  return <button className={`toggle ${on ? 'on' : ''}`} onClick={() => { setOn(!on); onChange(!on); }} />;
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

export default function BotSettings() {
  const [tab, setTab] = useState('personality');
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then((data: Record<string, any[]>) => {
      const flat: Record<string, any> = {};
      for (const items of Object.values(data)) {
        for (const s of items) {
          flat[s.key] = s.value;
        }
      }
      setSettings(flat);
    }).catch(() => {});
  }, []);

  const update = async (key: string, value: any) => {
    setSaving(key);
    setSettings(s => ({ ...s, [key]: value }));
    try { await api.updateSetting(key, value); } catch (e) { console.error(e); }
    setSaving(null);
  };

  const get = (key: string, fallback: any = '') => settings[key] ?? fallback;

  return (
    <div className="page">
      <h1 className="page-title">Bot settings</h1>
      <p className="page-sub">How the bot writes, when it posts, and what it watches for.</p>

      <div className="tabs">
        {[['personality', 'Personality'], ['content', 'Content'], ['scheduling', 'Scheduling'], ['monitoring', 'Monitoring'], ['guardrails', 'Guardrails']].map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="card">
        <div style={{ padding: '4px 24px' }}>
          {tab === 'personality' && (
            <>
              <Row title="Voice" desc="A short prompt the bot uses to ground every draft. Keep it specific and concrete.">
                <textarea
                  className="textarea"
                  value={get('personality_description', '')}
                  onChange={e => setSettings(s => ({ ...s, personality_description: e.target.value }))}
                  onBlur={e => update('personality_description', e.target.value)}
                />
              </Row>
              <Row title="Tone" desc="The overall tone the bot aims for.">
                <select
                  className="select"
                  value={get('tone', 'professional')}
                  onChange={e => update('tone', e.target.value)}
                  style={{ width: 200 }}
                >
                  {['professional', 'casual', 'witty', 'sarcastic', 'inspirational', 'educational', 'friendly'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Row>
              <Row title="Warmth level" desc="1 = dry and direct, 10 = warm and personable.">
                <input
                  className="input"
                  type="number"
                  min={1} max={10}
                  value={get('warmth_level', 5)}
                  onChange={e => update('warmth_level', parseInt(e.target.value))}
                  style={{ width: 100 }}
                />
              </Row>
              <Row title="Humor level" desc="1 = deadpan, 10 = very playful.">
                <input
                  className="input"
                  type="number"
                  min={1} max={10}
                  value={get('humor_level', 3)}
                  onChange={e => update('humor_level', parseInt(e.target.value))}
                  style={{ width: 100 }}
                />
              </Row>
              <Row title="Emoji usage" desc="How often the bot uses emoji.">
                <select
                  className="select"
                  value={get('emoji_usage', 'minimal')}
                  onChange={e => update('emoji_usage', e.target.value)}
                  style={{ width: 200 }}
                >
                  {['none', 'minimal', 'moderate', 'heavy'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Row>
              <Row title="Length preference" desc="The bot will aim for this character range.">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    value={get('response_length', 'medium')}
                    onChange={e => update('response_length', e.target.value)}
                    style={{ width: 120 }}
                    placeholder="short / medium / long"
                  />
                </div>
              </Row>
            </>
          )}

          {tab === 'content' && (
            <>
              <Row title="Topics to cover" desc="Soft suggestions the bot weaves in when generating original posts.">
                <ChipEditor
                  items={get('topics_of_interest', [])}
                  onChange={v => update('topics_of_interest', v)}
                />
              </Row>
              <Row title="Content pillars" desc="Core themes for original posts.">
                <ChipEditor
                  items={get('content_pillars', [])}
                  onChange={v => update('content_pillars', v)}
                />
              </Row>
              <Row title="Hashtag strategy" desc="Most teams leave this on 'none'. Threads' algorithm doesn't reward them.">
                <select
                  className="select"
                  value={get('hashtag_strategy', 'none')}
                  onChange={e => update('hashtag_strategy', e.target.value)}
                  style={{ width: 200 }}
                >
                  {['none', 'minimal', 'moderate'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Row>
              <Row title="Max post length" desc="Maximum character count for generated posts.">
                <input
                  className="input"
                  type="number"
                  value={get('max_post_length', 500)}
                  onChange={e => update('max_post_length', parseInt(e.target.value))}
                  style={{ width: 100 }}
                />
              </Row>
            </>
          )}

          {tab === 'scheduling' && (
            <>
              <Row title="Posting cadence" desc="Maximum original posts per day.">
                <input
                  className="input"
                  type="number"
                  value={get('max_posts_per_day', 3)}
                  onChange={e => update('max_posts_per_day', parseInt(e.target.value))}
                  style={{ width: 100 }}
                />
              </Row>
              <Row title="Reply cap" desc="Maximum replies per day.">
                <input
                  className="input"
                  type="number"
                  value={get('max_replies_per_day', 20)}
                  onChange={e => update('max_replies_per_day', parseInt(e.target.value))}
                  style={{ width: 100 }}
                />
              </Row>
              <Row title="Schedule" desc="Cron expression for when to generate posts.">
                <input
                  className="input"
                  value={get('post_schedule_cron', '0 9,13,18 * * *')}
                  onChange={e => setSettings(s => ({ ...s, post_schedule_cron: e.target.value }))}
                  onBlur={e => update('post_schedule_cron', e.target.value)}
                  style={{ width: 250 }}
                  placeholder="0 9,13,18 * * *"
                />
              </Row>
              <Row title="Auto-post enabled" desc="Enable scheduled post generation.">
                <Toggle on={get('auto_post_enabled', false)} onChange={v => update('auto_post_enabled', v)} />
              </Row>
            </>
          )}

          {tab === 'monitoring' && (
            <>
              <Row title="Reply to mentions" desc="Auto-draft replies when someone @-mentions a connected account.">
                <Toggle on={get('monitor_mentions', true)} onChange={v => update('monitor_mentions', v)} />
              </Row>
              <Row title="Reply to comments" desc="Draft replies to comments left under your published Threads posts.">
                <Toggle on={get('monitor_comments', true)} onChange={v => update('monitor_comments', v)} />
              </Row>
              <Row title="Question detection" desc="Use AI to detect questions in comments and prioritize them.">
                <Toggle on={get('question_detection', true)} onChange={v => update('question_detection', v)} />
              </Row>
              <Row title="Watch keywords" desc="Draft replies on Threads posts containing these phrases.">
                <ChipEditor
                  items={get('monitor_keywords', [])}
                  onChange={v => update('monitor_keywords', v)}
                />
              </Row>
            </>
          )}

          {tab === 'guardrails' && (
            <>
              <Row title="Blacklisted words" desc="The bot will never include these in drafts.">
                <ChipEditor
                  items={get('blacklist_words', [])}
                  onChange={v => update('blacklist_words', v)}
                />
              </Row>
              <Row title="Blacklisted topics" desc="Topics the bot should never engage with.">
                <ChipEditor
                  items={get('blacklist_topics', [])}
                  onChange={v => update('blacklist_topics', v)}
                />
              </Row>
              <Row title="Min comment length" desc="Ignore comments shorter than this.">
                <input
                  className="input"
                  type="number"
                  value={get('min_comment_length', 10)}
                  onChange={e => update('min_comment_length', parseInt(e.target.value))}
                  style={{ width: 100 }}
                />
              </Row>
              <Row title="OpenAI model" desc="Which model to use for generating content.">
                <select
                  className="select"
                  value={get('openai_model', 'gpt-4o')}
                  onChange={e => update('openai_model', e.target.value)}
                  style={{ width: 200 }}
                >
                  {['gpt-4o', 'gpt-4o-mini'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Row>
              <Row title="Temperature" desc="0 = deterministic, 2 = very creative.">
                <input
                  className="input"
                  type="number"
                  step={0.1}
                  min={0} max={2}
                  value={get('openai_temperature', 0.8)}
                  onChange={e => update('openai_temperature', parseFloat(e.target.value))}
                  style={{ width: 100 }}
                />
              </Row>
            </>
          )}
        </div>
      </div>

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
            <button className="x" onClick={() => onChange(arr.filter((_, idx) => idx !== i))}>x</button>
          </span>
        ))}
      </div>
      <input
        className="input"
        placeholder="Type and press Enter"
        style={{ width: 250 }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
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
