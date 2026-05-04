import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { api } from '../api';
import { useAuth } from '../auth';
import BotSettingsForm from '../components/BotSettingsForm';

interface BizState {
  name: string;
  website: string;
  sells: string;
  audience: string;
  goals: string[];
  avoid: string;
}

const TOTAL = 4;

// Settings handled by the explicit step-3 fields; the bot-settings step
// should not also write to these (it would clobber the step-3 input).
const STEP3_KEYS = new Set([
  'personality_description',
  'target_audience',
  'content_pillars',
  'things_to_avoid',
]);

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [biz, setBiz] = useState<BizState>({
    name: user?.workspace_name ?? '',
    website: user?.workspace_website ?? '',
    sells: '',
    audience: '',
    goals: [],
    avoid: '',
  });

  const [botSettings, setBotSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    api.getSettings()
      .then((data: Record<string, any[]>) => {
        const flat: Record<string, any> = {};
        for (const items of Object.values(data || {})) {
          for (const s of items) flat[s.key] = s.value;
        }
        setBotSettings(flat);
      })
      .catch(() => {});
  }, []);

  const updateBotSetting = (key: string, value: any) =>
    setBotSettings(s => ({ ...s, [key]: value }));

  const update = (patch: Partial<BizState>) => setBiz((b) => ({ ...b, ...patch }));
  const toggleGoal = (g: string) =>
    setBiz((b) => ({
      ...b,
      goals: b.goals.includes(g) ? b.goals.filter((x) => x !== g) : [...b.goals, g],
    }));

  const next = () => setStep((s) => Math.min(s + 1, TOTAL));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const workspaceLabel = biz.name || user?.workspace_name || 'your workspace';
  const titles: Record<number, ReactNode> = {
    1: <>Let's connect <em>{workspaceLabel}</em> to Threads.</>,
    2: <>Tell us about your <em>profile</em>.</>,
    3: <>Who are you talking to?</>,
    4: <>Tune your <em>bot</em>.</>,
  };

  const handleFinish = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        personality_description: biz.sells,
        target_audience: biz.audience,
        content_pillars: biz.goals,
        things_to_avoid: biz.avoid,
      };
      // Layer bot-settings tweaks on top, but never let them clobber the
      // explicit step-3 fields the user just typed in.
      for (const [k, v] of Object.entries(botSettings)) {
        if (STEP3_KEYS.has(k)) continue;
        updates[k] = v;
      }
      await api.updateSettings(updates);
      await api.completeOnboarding();
      await refresh();
      navigate('/plan?autostart=1');
    } catch (e) {
      setSaveError('Could not save your answers. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const subtitles: Record<number, string> = {
    1: 'Authorize Thread Bot to read mentions, draft replies, and publish on your approval.',
    2: 'A short description of who you are and what your account is about. The bot uses this in every draft.',
    3: "Who you're for shapes every draft — language, references, what to avoid.",
    4: 'These all have sensible defaults. Tweak anything that should be different, or leave it and move on — you can change all of this later from Bot settings.',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 32, background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: step === 4 ? 820 : 620 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center', fontFamily: 'Source Serif 4', fontStyle: 'italic', fontWeight: 600, fontSize: 16 }}>tb</div>
          <div style={{ fontWeight: 600 }}>Thread Bot</div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-4)' }}>Step {step} of {TOTAL}</div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 26 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i < step ? 'var(--ink)' : 'var(--line)',
                transition: 'background 200ms',
              }}
            />
          ))}
        </div>

        {/* Title */}
        <h1 className="serif" style={{ fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.18, margin: '0 0 8px' }}>
          {titles[step]}
        </h1>
        <p className="muted" style={{ margin: '0 0 22px', fontSize: 14.5 }}>{subtitles[step]}</p>

        {/* Step body */}
        <div className="card card-pad" style={{ padding: 24 }}>
          {step === 1 && <Step1 onContinue={next} />}
          {step === 2 && <Step2 biz={biz} update={update} />}
          {step === 3 && <Step3 biz={biz} update={update} toggleGoal={toggleGoal} />}
          {step === 4 && <Step4 settings={botSettings} onChange={updateBotSetting} />}
        </div>

        {/* Footer nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          {step > 1 && (
            <button className="btn ghost" onClick={back}>← Back</button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {step > 1 && step < TOTAL && (
              <button className="btn ghost" onClick={next}>Skip</button>
            )}
            {step > 1 && step < TOTAL && (
              <button className="btn primary" onClick={next}>Continue →</button>
            )}
            {step === TOTAL && (
              <button className="btn primary lg" onClick={handleFinish} disabled={saving}>
                {saving ? 'Saving…' : 'Finish setup'}
              </button>
            )}
          </div>
        </div>

        {saveError && (
          <div style={{ color: 'var(--bad)', fontSize: 13, marginTop: 8, textAlign: 'right' }}>{saveError}</div>
        )}

        <p className="muted" style={{ textAlign: 'center', fontSize: 12, marginTop: 22 }}>
          Need help? <button className="link-btn">Talk to us</button>
        </p>
      </div>
    </div>
  );
}

/* ---------------- Step 1: Connect Threads ---------------- */
function Step1({ onContinue }: { onContinue: () => void }) {
  const [account, setAccount] = useState<any>(null);
  const connected = !!account;

  // Detect connected state on mount — covers the post-OAuth return,
  // since the callback redirects through the auth/onboarding gate which
  // lands the user back here.
  useEffect(() => {
    api.getAccount().then(setAccount).catch(() => {});
  }, []);

  const onConnect = () => {
    // Same-tab navigation. Safari (and stricter Chrome configs) block popups,
    // and onboarding has no state to lose at step 1.
    window.location.href = '/api/oauth/connect';
  };

  const initials = account?.username
    ? account.username.slice(0, 2).toUpperCase()
    : 'TB';

  return (
    <div>
      {!connected ? (
        <>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--ink-soft)', display: 'grid', placeItems: 'center' }}>
              <Icons.Link size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>Connect a Threads account</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                We'll request permission to read your profile, mentions, and publish posts on approval. You can revoke at any time.
              </div>
            </div>
          </div>
          <div className="card" style={{ background: 'var(--ink-soft)', padding: 14, borderColor: 'transparent', fontSize: 12.5, color: 'var(--ink-3)' }}>
            We never post without you. Drafts always wait for your approval.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
            <button className="btn primary" onClick={onConnect}>
              <Icons.Link size={14} /> Continue with Threads
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div className="avatar" style={{ width: 44, height: 44, fontSize: 16, background: 'var(--ink)' }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>@{account.username}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>Connected · ID {account.threadsUserId}</div>
            </div>
            <span className="badge ok"><span className="dot" />Connected</span>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn primary" onClick={onContinue}>Continue →</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Step 2: About profile ---------------- */
function Step2({ biz, update }: { biz: BizState; update: (p: Partial<BizState>) => void }) {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Field label="Account name">
        <input
          className="input"
          value={biz.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="e.g. Studio Goods"
        />
      </Field>

      <Field label="Website" hint="Optional. We'll scan it for context the bot can reference.">
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', fontSize: 13 }}>https://</span>
          <input
            className="input"
            value={biz.website}
            onChange={(e) => update({ website: e.target.value })}
            style={{ paddingLeft: 60 }}
            placeholder="studiogoods.co"
          />
        </div>
      </Field>

      <Field
        label="Profile description"
        hint="One paragraph: who you are, what you post about, what makes the account distinctive. Write it the way you'd describe yourself to a new follower."
      >
        <textarea
          className="textarea"
          style={{ minHeight: 130 }}
          placeholder={"e.g. Studio Goods is a small ceramics studio in Lisbon. We make hand-thrown mugs and homewares, sold in limited monthly drops. Posts here are part diary, part shop notice — what's on the wheel, when the next drop lands, the occasional rant about kiln temperatures."}
          value={biz.sells}
          onChange={(e) => update({ sells: e.target.value })}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span className="muted" style={{ fontSize: 11.5 }}>Tip: more detail = sharper drafts.</span>
          <span className="muted" style={{ fontSize: 11.5 }}>{biz.sells.length} chars</span>
        </div>
      </Field>
    </div>
  );
}

/* ---------------- Step 3: Audience & goals ---------------- */
function Step3({
  biz,
  update,
  toggleGoal,
}: {
  biz: BizState;
  update: (p: Partial<BizState>) => void;
  toggleGoal: (g: string) => void;
}) {
  const goals = [
    { id: 'awareness', label: 'Brand awareness', sub: 'Be top of mind' },
    { id: 'traffic', label: 'Drive traffic', sub: 'Clicks to site' },
    { id: 'sales', label: 'Sales & launches', sub: 'Convert followers' },
    { id: 'community', label: 'Build community', sub: 'Replies, DMs, loyalty' },
    { id: 'authority', label: 'Authority', sub: 'Be known for a topic' },
    { id: 'support', label: 'Customer support', sub: 'Reply to questions' },
  ];
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Field
        label="Who's your customer?"
        hint="Be specific — demographics, interests, what they care about."
      >
        <textarea
          className="textarea"
          style={{ minHeight: 90 }}
          placeholder={"e.g. Design-conscious women 28–45 who furnish slowly. They follow potters and interior accounts, value craft over trend, and treat every purchase as an heirloom."}
          value={biz.audience}
          onChange={(e) => update({ audience: e.target.value })}
        />
      </Field>

      <Field label="What should posts achieve?" hint="Pick up to 3. The bot weights drafts toward these.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {goals.map((g) => (
            <label key={g.id} className={`pick ${biz.goals.includes(g.id) ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={biz.goals.includes(g.id)}
                onChange={() => toggleGoal(g.id)}
              />
              <div>
                <div className="pick-title">{g.label}</div>
                <div className="pick-sub">{g.sub}</div>
              </div>
            </label>
          ))}
        </div>
        {biz.goals.length > 3 && (
          <div style={{ fontSize: 12, color: 'var(--amber-ink)', marginTop: 6 }}>Try to keep it to 3 for sharper output.</div>
        )}
      </Field>

      <Field
        label="Anything to avoid?"
        hint="Topics, words, claims, or competitors the bot should never mention."
      >
        <input
          className="input"
          placeholder="e.g. politics, discounts under 20%, the word 'curated', competitor names"
          value={biz.avoid}
          onChange={(e) => update({ avoid: e.target.value })}
        />
      </Field>
    </div>
  );
}

/* ---------------- Step 4: Bot settings review ---------------- */
function Step4({
  settings,
  onChange,
}: {
  settings: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <BotSettingsForm settings={settings} onChange={onChange} />

      <div className="card" style={{ background: 'var(--bg-alt)', padding: 14, borderColor: 'transparent' }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Icons.Sparkle size={14} />
          <span>You're set. Thread Bot will draft your first batch of posts using everything you just told us. Every draft waits in your queue until you approve it — nothing posts without your okay.</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Field wrapper ---------------- */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: hint ? 2 : 8 }}>{label}</label>
      {hint && <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{hint}</div>}
      {children}
    </div>
  );
}
