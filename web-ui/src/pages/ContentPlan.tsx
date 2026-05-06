import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { api } from '../api';

interface ApiDraft {
  id: number;
  type: string;
  status: string;
  content: string;
  triggerSource: string;
  scheduledFor: string | number | null;
}

interface PlanItem {
  id: number;
  content: string;
  hook: string;
  scheduledFor: Date | null;
  status: 'pending' | 'scheduled';
}

function isPlanDraft(d: ApiDraft): boolean {
  if (d.type !== 'original_post') return false;
  if (d.triggerSource !== 'manual' && d.triggerSource !== 'scheduled') return false;
  return d.status === 'pending' || d.status === 'scheduled';
}

function toPlanItem(d: ApiDraft): PlanItem {
  let scheduledFor: Date | null = null;
  if (d.scheduledFor != null) {
    const ms = typeof d.scheduledFor === 'number' && d.scheduledFor < 1e12
      ? d.scheduledFor * 1000
      : new Date(d.scheduledFor).getTime();
    if (Number.isFinite(ms)) scheduledFor = new Date(ms);
  }
  return {
    id: d.id,
    content: d.content,
    hook: (d.content.split('\n')[0] || '').slice(0, 60),
    scheduledFor,
    status: d.status === 'scheduled' ? 'scheduled' : 'pending',
  };
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ContentPlan() {
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();

  const reload = async () => {
    try {
      const drafts = (await api.getDrafts()) as ApiDraft[];
      const items = drafts.filter(isPlanDraft).map(toPlanItem);
      // Order: scheduled first by time, then pending by time, then by id desc
      items.sort((a, b) => {
        const aTime = a.scheduledFor?.getTime() ?? Number.POSITIVE_INFINITY;
        const bTime = b.scheduledFor?.getTime() ?? Number.POSITIVE_INFINITY;
        if (aTime !== bTime) return aTime - bTime;
        return b.id - a.id;
      });
      setPlan(items);
    } catch {
      // ignore
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

  const setBusy = (id: number, busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });

  const onPostNow = async (id: number) => {
    setBusy(id, true);
    try {
      await api.approveDraft(id);
      await reload();
    } finally {
      setBusy(id, false);
    }
  };

  const onSchedule = async (id: number, when: Date) => {
    setBusy(id, true);
    try {
      await api.scheduleDraft(id, when.toISOString());
      await reload();
    } finally {
      setBusy(id, false);
    }
  };

  const onCancelSchedule = async (id: number) => {
    setBusy(id, true);
    try {
      await api.unscheduleDraft(id);
      await reload();
    } finally {
      setBusy(id, false);
    }
  };

  const onRegenerate = async (id: number) => {
    setBusy(id, true);
    try {
      await api.rejectDraft(id).catch(() => {});
      await api.generateDraft();
      await reload();
    } finally {
      setBusy(id, false);
    }
  };

  const onDismiss = async (id: number) => {
    setBusy(id, true);
    try {
      await api.rejectDraft(id);
      await reload();
    } finally {
      setBusy(id, false);
    }
  };

  const generate = async (count: number) => {
    setGenerating(true);
    try {
      for (let i = 0; i < count; i++) {
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

  // Autostart from onboarding's "Finish setup" navigation (?autostart=1).
  const [autostarted, setAutostarted] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('autostart') !== '1' || autostarted) return;
    setAutostarted(true);
    navigate('/plan', { replace: true });
    generate(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading plan…</p>
      </div>
    );
  }

  if (plan.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Content plan</h1>
        <p className="page-sub">A few posts the bot drafts for today. Tomorrow at 9 AM the bot will draft the next batch automatically.</p>

        <div className="empty" style={{ padding: '64px 32px' }}>
          <div className="serif" style={{ fontSize: 32, fontWeight: 400, fontStyle: 'italic', color: 'var(--ink-2)', marginBottom: 8 }}>No plan yet.</div>
          <div className="empty-sub" style={{ maxWidth: 440 }}>
            Generate a plan and the bot will draft a few posts for today. Approve them on your schedule, or post them right away.
          </div>
          {generating ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Generating posts…</div>
          ) : (
            <button className="btn primary lg" onClick={() => generate(3)}>
              <Icons.Sparkle size={14} /> Generate today's plan
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h1 className="page-title">Content plan</h1>
          <p className="page-sub" style={{ margin: 0 }}>
            {plan.length} {plan.length === 1 ? 'draft' : 'drafts'} for today
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => generate(3)} disabled={generating}>
            <Icons.Sparkle size={13} /> {generating ? 'Generating…' : 'Generate more'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {plan.map((p) => {
          const busy = busyIds.has(p.id);
          const slotLabel = p.scheduledFor ? fmtTime(p.scheduledFor) : null;
          const slotInPast = p.scheduledFor ? p.scheduledFor.getTime() <= Date.now() : false;

          return (
            <div
              key={p.id}
              className="card"
              style={{
                borderColor:
                  p.status === 'scheduled'
                    ? 'color-mix(in oklab, var(--info) 30%, var(--line))'
                    : 'var(--line)',
              }}
            >
              <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)' }}>
                {p.status === 'scheduled' ? (
                  <span className="badge approved">
                    <span className="dot" /> Scheduled · {slotLabel}
                  </span>
                ) : slotLabel ? (
                  <span className="badge">
                    <span className="dot" /> Proposed · {slotLabel}
                  </span>
                ) : (
                  <span className="badge"><span className="dot" /> Draft</span>
                )}
              </div>

              <div style={{ padding: '14px 18px' }}>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 6 }}>
                  Hook · <span style={{ color: 'var(--ink-2)' }}>{p.hook}</span>
                </div>
                <div className="post-body" style={{ fontSize: 14 }}>{p.content}</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  {p.status === 'pending' ? (
                    <>
                      <button className="btn primary sm" onClick={() => onPostNow(p.id)} disabled={busy}>
                        <Icons.Check size={12} /> Post now
                      </button>
                      {p.scheduledFor && !slotInPast && (
                        <button className="btn sm" onClick={() => onSchedule(p.id, p.scheduledFor!)} disabled={busy}>
                          <Icons.Clock size={12} /> Schedule for {slotLabel}
                        </button>
                      )}
                      <button className="btn sm" onClick={() => onRegenerate(p.id)} disabled={busy}>
                        <Icons.Sparkle size={12} /> Regenerate
                      </button>
                      <button className="btn ghost sm" onClick={() => onDismiss(p.id)} disabled={busy}>
                        <Icons.X size={12} /> Dismiss
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="muted" style={{ fontSize: 12.5 }}>
                        Will publish at {slotLabel}.
                      </span>
                      <button className="btn ghost sm" onClick={() => onCancelSchedule(p.id)} disabled={busy} style={{ marginLeft: 'auto' }}>
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
