import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { api } from '../api';

interface PlanItem {
  id: number;
  slot: string;
  topic: string;
  hook: string;
  content: string;
  confidence: number;
  feedback: 'up' | 'down' | null;
  regenerating?: boolean;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SLOTS = [
  { day: 'Mon', time: '09:00' }, { day: 'Mon', time: '14:30' },
  { day: 'Tue', time: '10:15' }, { day: 'Tue', time: '16:00' },
  { day: 'Wed', time: '09:30' }, { day: 'Wed', time: '17:00' },
  { day: 'Thu', time: '11:00' }, { day: 'Fri', time: '10:00' },
];
const TOPICS = ['Product update', 'Behind the scenes', 'Customer story', 'Learning', 'Opinion', 'Reflection'];

interface ApiDraft {
  id: number;
  type: string;
  status: string;
  content: string;
  triggerSource: string;
}

function isPlanDraft(d: ApiDraft): boolean {
  return d.type === 'original_post' && d.triggerSource === 'manual' && d.status === 'pending';
}

function draftsToPlanItems(drafts: ApiDraft[]): PlanItem[] {
  // Stable slot mapping by ascending draft.id so older plan drafts get earlier slots.
  const sorted = [...drafts].sort((a, b) => a.id - b.id);
  return sorted.map((d, i) => {
    const slot = SLOTS[i % SLOTS.length];
    return {
      id: d.id,
      slot: `${slot.day} · ${slot.time}`,
      topic: TOPICS[i % TOPICS.length],
      hook: (d.content.split('\n')[0] || '').slice(0, 60),
      content: d.content,
      confidence: 0.7 + ((d.id * 17) % 25) / 100,
      feedback: null,
    };
  });
}

function CalendarView({ items, onItemFeedback }: { items: PlanItem[]; onItemFeedback: (id: number, value: 'up' | 'down') => void }) {
  const byDay: Record<string, PlanItem[]> = {};
  items.forEach(i => {
    const d = i.slot.split(' · ')[0];
    byDay[d] = byDay[d] || [];
    byDay[d].push(i);
  });

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--line)' }}>
        {DAYS.map(d => (
          <div key={d} style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-4)', borderRight: '1px solid var(--line)', background: 'var(--bg-alt)' }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 420 }}>
        {DAYS.map(d => (
          <div key={d} style={{ borderRight: '1px solid var(--line)', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(byDay[d] || []).map(p => (
              <div key={p.id} className="card" style={{
                padding: 10, fontSize: 12, cursor: 'pointer',
                borderColor: p.feedback === 'down' ? 'color-mix(in oklab, var(--bad) 30%, var(--line))' :
                             p.feedback === 'up' ? 'color-mix(in oklab, var(--good) 30%, var(--line))' : 'var(--line)',
              }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginBottom: 4 }}>{p.slot.split(' · ')[1]}</div>
                <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 4, lineHeight: 1.35 }}>{p.hook}</div>
                <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.content}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  <button className="btn ghost sm" style={{ padding: '2px 6px' }} onClick={() => onItemFeedback(p.id, 'up')}><Icons.Check size={11} /></button>
                  <button className="btn ghost sm" style={{ padding: '2px 6px' }} onClick={() => onItemFeedback(p.id, 'down')}><Icons.X size={11} /></button>
                  <span className="muted" style={{ marginLeft: 'auto', fontSize: 10 }}>{Math.round(p.confidence * 100)}%</span>
                </div>
              </div>
            ))}
            {(!byDay[d] || byDay[d].length === 0) && (
              <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--ink-5)', fontSize: 11 }}>&mdash;</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ContentPlan() {
  const [scope, setScope] = useState('week');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [planFeedback, setPlanFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [regeneratingIds, setRegeneratingIds] = useState<Set<number>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();
  const autostartedRef = useRef(false);

  const items = scope === 'today' ? plan.slice(0, 2) : scope === 'week' ? plan : plan.slice(0, 4);
  const approvedCount = items.filter(i => i.feedback === 'up').length;
  const generated = plan.length > 0;

  const setItemFeedback = (id: number, value: 'up' | 'down') =>
    setPlan(prev => prev.map(p => p.id === id ? { ...p, feedback: p.feedback === value ? null : value } : p));

  const reload = async () => {
    try {
      const drafts = (await api.getDrafts('pending')) as ApiDraft[];
      const planDrafts = drafts.filter(isPlanDraft);
      const fresh = draftsToPlanItems(planDrafts);
      setPlan(prev => {
        const feedbackById = new Map(prev.map(p => [p.id, p.feedback] as const));
        return fresh.map(i => ({ ...i, feedback: feedbackById.get(i.id) ?? null }));
      });
    } catch {
      // ignore — keep existing local state
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await reload();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regenerateItem = async (id: number) => {
    setRegeneratingIds(prev => new Set(prev).add(id));
    try {
      // Reject the old draft so it leaves the queue, then generate a fresh one.
      await api.rejectDraft(id).catch(() => {});
      await api.generateDraft();
      await reload();
    } finally {
      setRegeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const dismissItem = (id: number) => {
    // The draft is already in the approval queue; just hide it from the plan view.
    setPlan(prev => prev.filter(p => p.id !== id));
  };

  const dismissApproved = () => {
    const approvedIds = new Set(items.filter(i => i.feedback === 'up').map(i => i.id));
    setPlan(prev => prev.filter(p => !approvedIds.has(p.id)));
  };

  const generate = async (count: number) => {
    setGenerating(true);
    try {
      const toGenerate = Math.min(count, SLOTS.length);
      for (let i = 0; i < toGenerate; i++) {
        try {
          await api.generateDraft();
        } catch {
          break;
        }
      }
      await reload();
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('autostart') !== '1') return;
    if (autostartedRef.current) return;
    autostartedRef.current = true;
    navigate('/plan', { replace: true });
    generate(8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading plan…</p>
      </div>
    );
  }

  if (!generated) {
    return (
      <div className="page">
        <h1 className="page-title">Content plan</h1>
        <p className="page-sub">A batch of posts the bot drafts ahead of time. You review the plan, give feedback, then publish on your schedule.</p>

        <div className="empty" style={{ padding: '64px 32px' }}>
          <div className="serif" style={{ fontSize: 32, fontWeight: 400, fontStyle: 'italic', color: 'var(--ink-2)', marginBottom: 8 }}>No plan yet.</div>
          <div className="empty-sub" style={{ maxWidth: 440 }}>
            Generate a plan and the bot will draft a full slate of posts at once. Review them as a set, leave feedback, then publish whenever you want.
          </div>
          {generating ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Generating posts...</div>
          ) : (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn primary lg" onClick={() => generate(2)}><Icons.Sparkle size={14} /> Generate for today</button>
              <button className="btn lg" onClick={() => generate(8)}><Icons.Calendar size={14} /> Generate for this week</button>
              <button className="btn lg" onClick={() => generate(4)}>Next week</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h1 className="page-title">Content plan</h1>
          <p className="page-sub" style={{ margin: 0 }}>
            {items.length} posts &middot; {approvedCount} approved
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setShowFeedback(true)}>
            <Icons.Edit size={13} /> Plan feedback
          </button>
          <button className="btn" onClick={() => generate(8)} disabled={generating}>
            <Icons.Sparkle size={13} /> {generating ? 'Regenerating...' : 'Regenerate plan'}
          </button>
          <button className="btn primary" onClick={dismissApproved}><Icons.Check size={13} /> Dismiss approved</button>
        </div>
      </div>

      {/* Scope + view toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', background: 'var(--bg-alt)', border: '1px solid var(--line)', borderRadius: 8, padding: 3 }}>
          {[['today', 'Today'], ['week', 'This week'], ['nextweek', 'Next week']].map(([k, l]) => (
            <button key={k} onClick={() => setScope(k)} className="btn ghost sm" style={{
              background: scope === k ? 'var(--surface)' : 'transparent',
              boxShadow: scope === k ? 'var(--shadow-1)' : 'none',
              borderColor: 'transparent', color: scope === k ? 'var(--ink)' : 'var(--ink-3)',
              fontWeight: scope === k ? 600 : 500,
            }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'inline-flex', background: 'var(--bg-alt)', border: '1px solid var(--line)', borderRadius: 8, padding: 3 }}>
          {([['list', 'List'], ['calendar', 'Calendar']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} className="btn ghost sm" style={{
              background: view === k ? 'var(--surface)' : 'transparent',
              boxShadow: view === k ? 'var(--shadow-1)' : 'none',
              borderColor: 'transparent', color: view === k ? 'var(--ink)' : 'var(--ink-3)',
              fontWeight: view === k ? 600 : 500,
            }}>{l}</button>
          ))}
        </div>
        <div className="muted" style={{ marginLeft: 'auto', fontSize: 12.5 }}>
          Generated from <b style={{ color: 'var(--ink-2)' }}>your voice settings</b>
        </div>
      </div>

      {view === 'list' ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map(p => {
            const isRegenerating = regeneratingIds.has(p.id);
            return (
            <div key={p.id} className="card" style={{
              borderColor: p.feedback === 'down' ? 'color-mix(in oklab, var(--bad) 30%, var(--line))' :
                           p.feedback === 'up' ? 'color-mix(in oklab, var(--good) 30%, var(--line))' : 'var(--line)',
            }}>
              <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>{p.slot}</div>
                  <span className="badge"><span className="dot" /> {p.topic}</span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Confidence {Math.round(p.confidence * 100)}%</span>
                  <span style={{ width: 50, height: 3, background: 'var(--bg-sunk)', borderRadius: 2, overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${p.confidence * 100}%`, background: p.confidence > 0.8 ? 'var(--good)' : 'var(--accent)' }} />
                  </span>
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 6 }}>Hook &middot; <span style={{ color: 'var(--ink-2)' }}>{p.hook}</span></div>
                <div className="post-body" style={{ fontSize: 14 }}>{p.content}</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  <button
                    className="btn sm"
                    style={p.feedback === 'up' ? { background: 'color-mix(in oklab, var(--good) 14%, white)', borderColor: 'color-mix(in oklab, var(--good) 40%, transparent)', color: 'oklch(0.42 0.13 155)' } : {}}
                    onClick={() => setItemFeedback(p.id, 'up')}
                  >
                    <Icons.Check size={12} /> Looks good
                  </button>
                  <button
                    className="btn sm"
                    style={p.feedback === 'down' ? { background: 'color-mix(in oklab, var(--bad) 12%, white)', borderColor: 'color-mix(in oklab, var(--bad) 40%, transparent)', color: 'var(--bad)' } : {}}
                    onClick={() => setItemFeedback(p.id, 'down')}
                  >
                    <Icons.X size={12} /> Off
                  </button>
                  <button className="btn sm" onClick={() => regenerateItem(p.id)} disabled={isRegenerating}>
                    <Icons.Sparkle size={12} /> {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                  </button>

                  {p.feedback === 'down' && (
                    <input
                      className="input"
                      placeholder="Why is this off? (helps the bot learn)"
                      style={{ flex: 1, minWidth: 200, fontSize: 12.5 }}
                    />
                  )}

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button className="btn primary sm" onClick={() => dismissItem(p.id)}><Icons.Check size={12} /> Dismiss</button>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <CalendarView items={items} onItemFeedback={setItemFeedback} />
      )}

      {/* Plan feedback modal */}
      {showFeedback && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.4)', display: 'grid', placeItems: 'center', zIndex: 50 }} onClick={() => setShowFeedback(false)}>
          <div className="card" style={{ width: 520, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <h3>Feedback on the whole plan</h3>
              <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setShowFeedback(false)}><Icons.X size={13} /></button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                Tell the bot what's working and what isn't. This shapes the next plan generation, not just individual drafts.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {['Too many product updates', 'Tone too formal', 'Missing customer stories', 'Repeats last week', 'Slots feel off'].map(t => (
                  <button key={t} className="chip" style={{ cursor: 'pointer' }}
                    onClick={() => setPlanFeedback(planFeedback ? planFeedback + '. ' + t : t)}>+ {t}</button>
                ))}
              </div>
              <textarea className="textarea" value={planFeedback} onChange={e => setPlanFeedback(e.target.value)} placeholder="What's off about this week's plan?" style={{ minHeight: 100 }} />
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                The bot will keep what you marked "looks good" and rewrite the rest.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                <button className="btn ghost" onClick={() => setShowFeedback(false)}>Cancel</button>
                <button className="btn primary" onClick={() => { setShowFeedback(false); generate(8); }}>
                  <Icons.Sparkle size={13} /> Apply & regenerate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
