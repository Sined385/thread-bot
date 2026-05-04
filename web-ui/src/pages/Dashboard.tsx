import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Icons } from '../components/Icons';
import { fmtRelative } from '../data';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    api.getDraftStats().then(setStats).catch(() => {});
    api.getPosts().then(setPosts).catch(() => {});
  }, []);

  const pendingCount = stats?.pending ?? 0;

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 className="page-title serif" style={{ fontSize: 28, fontWeight: 400 }}>Good morning, Denys.</h1>
          <p className="page-sub" style={{ margin: 0 }}>
            {pendingCount > 0
              ? `${pendingCount} drafts are waiting on you. Most should take less than a minute each.`
              : 'All caught up. The bot will let you know when something needs your eyes.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn primary" onClick={() => navigate('/plan')}>
            Review plan <Icons.ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Hero CTA card */}
      <div className="card" style={{ marginBottom: 24, background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' }}>
        <div style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Pending review</div>
            <div className="serif" style={{ fontSize: 34, fontWeight: 400, letterSpacing: '-0.02em', marginTop: 4 }}>
              {pendingCount} drafts <em style={{ color: 'rgba(255,255,255,0.6)' }}>need your eyes</em>
            </div>
            <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.65)', fontSize: 13.5 }}>
              Drafts wait here until you approve them in Telegram or the content plan.
            </div>
          </div>
          <button className="btn amber lg" onClick={() => navigate('/plan')}>
            Open plan <kbd style={{ marginLeft: 4, background: 'rgba(0,0,0,0.15)', borderColor: 'transparent', color: 'inherit', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>R</kbd>
          </button>
        </div>
      </div>

      {/* Content plan teaser */}
      <div style={{ marginBottom: 24 }}>
        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Generate a content plan</div>
            <div className="muted" style={{ fontSize: 12.5 }}>Let the bot draft a full slate of posts for today or this week. Review them as a set, leave feedback, then publish on your schedule.</div>
          </div>
          <button className="btn" onClick={() => navigate('/plan')}><Icons.Sparkle size={13} /> Review plan</button>
        </div>
      </div>

      {/* Published posts */}
      <div className="card">
        <div className="card-head">
          <h3>Recent posts</h3>
          <span className="meta" style={{ marginLeft: 'auto' }}>Sorted by most recent</span>
        </div>
        <div>
          {posts.map((p: any) => {
            const ts = typeof p.createdAt === 'number' && p.createdAt < 1e12 ? p.createdAt * 1000 : p.createdAt;
            return (
              <div key={p.id} style={{ padding: '16px 20px', borderTop: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div className="avatar" style={{ width: 24, height: 24, fontSize: 10, background: 'var(--ink)' }}>TB</div>
                  <span className="post-time">{fmtRelative(ts)}</span>
                  <span className="badge published" style={{ marginLeft: 'auto' }}><span className="dot" />Published</span>
                  {p.permalink && (
                    <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="btn ghost sm">
                      <Icons.External size={12} />
                    </a>
                  )}
                </div>
                <div className="post-body" style={{ fontSize: 14, marginBottom: 10 }}>{p.content}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>
                  ID: {p.threadsMediaId}
                </div>
              </div>
            );
          })}
          {posts.length === 0 && (
            <div className="empty" style={{ border: 'none', padding: 48 }}>
              <div className="empty-title">Nothing live yet.</div>
              <div className="empty-sub">Approve a draft to see it land here.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
