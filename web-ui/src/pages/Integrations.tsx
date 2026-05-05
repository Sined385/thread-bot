import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Icons } from '../components/Icons';

interface Banner {
  kind: 'ok' | 'err';
  text: string;
}

function BannerCard({ banner }: { banner: Banner | null }) {
  if (!banner) return null;
  return (
    <div
      className="card card-pad"
      style={{
        marginBottom: 16,
        background: banner.kind === 'ok' ? 'color-mix(in oklab, var(--good) 14%, white)' : '#fbe9e9',
        borderColor: banner.kind === 'ok' ? 'color-mix(in oklab, var(--good) 30%, transparent)' : '#f3c8c8',
        color: banner.kind === 'ok' ? 'oklch(0.42 0.13 155)' : 'var(--bad)',
        fontSize: 13.5,
      }}
    >
      {banner.text}
    </div>
  );
}

function ThreadsSection({ banner }: { banner: Banner | null }) {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const location = useLocation();

  useEffect(() => {
    api.getAccount()
      .then(setAccount)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [location.search]);

  const onDisconnect = async () => {
    if (!window.confirm('Disconnect Threads? Drafts and history are kept; the bot will stop drafting and publishing.')) return;
    setDisconnecting(true);
    try {
      await api.disconnectAccount();
      setAccount(null);
    } catch (e) {
      // surface a minimal hint; user can retry
      window.alert('Could not disconnect. Try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <section style={{ marginBottom: 36 }}>
      <h3 className="section-title">Threads</h3>
      <BannerCard banner={banner} />

      {loading ? (
        <div className="card card-pad"><p className="muted" style={{ margin: 0 }}>Loading…</p></div>
      ) : !account ? (
        <div className="connect-empty">
          <div className="threads-mark">@</div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 400, fontStyle: 'italic', marginBottom: 6 }}>Connect a Threads account</div>
          <div className="empty-sub">We request only the scopes needed: read mentions, draft replies, publish on approval.</div>
          <a href="/api/oauth/connect" className="btn primary lg" style={{ textDecoration: 'none' }}>
            <Icons.Link size={14} /> Continue with Threads
          </a>
        </div>
      ) : (
        <ThreadsConnected account={account} onDisconnect={onDisconnect} disconnecting={disconnecting} />
      )}
    </section>
  );
}

function ThreadsConnected({
  account,
  onDisconnect,
  disconnecting,
}: {
  account: any;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  const initials = account.username ? account.username.slice(0, 2).toUpperCase() : 'TB';
  const tokenExpiry = account.tokenExpiresAt
    ? Math.max(0, Math.round((account.tokenExpiresAt * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="avatar" style={{ width: 48, height: 48, fontSize: 16, background: 'var(--ink)' }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em' }}>@{account.username}</div>
              <span className="badge published"><span className="dot" />Connected</span>
            </div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
              User ID: {account.threadsUserId}
              {tokenExpiry !== null && ` · token expires in ${tokenExpiry} days (auto-refreshes)`}
            </div>
          </div>
          <button className="btn"><Icons.External size={13} /> View on Threads</button>
        </div>
      </div>

      {account.scopes && (
        <details className="card" style={{ marginBottom: 12 }}>
          <summary style={{ padding: '12px 18px', cursor: 'pointer', fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, listStyle: 'none' }}>
            Permissions ({account.scopes.split(',').length})
          </summary>
          <div style={{ padding: '0 18px 12px' }}>
            {account.scopes.split(',').map((scope: string) => (
              <div key={scope} style={{ padding: '6px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
                <Icons.Check size={12} />
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{scope.trim()}</div>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>Disconnect</div>
          <div className="muted" style={{ fontSize: 12.5 }}>The bot will stop drafting and publishing immediately. Existing drafts and history are kept.</div>
        </div>
        <button className="btn danger" onClick={onDisconnect} disabled={disconnecting}>
          {disconnecting ? 'Disconnecting…' : 'Disconnect'}
        </button>
      </div>
    </>
  );
}

function TelegramSection() {
  const { user, refresh } = useAuth();
  const [linking, setLinking] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linked = !!user?.telegram_linked;

  // Auto-detect linking: while waiting, poll /me every ~2.5s and also refresh
  // immediately on window focus / tab visibility (catches the user switching
  // back from Telegram). Stop the moment we see linked.
  useEffect(() => {
    if (!waiting) return;
    if (linked) {
      setWaiting(false);
      return;
    }
    let cancelled = false;
    const tick = () => { if (!cancelled) refresh().catch(() => {}); };
    const interval = window.setInterval(tick, 2500);
    const onFocus = () => tick();
    const onVisibility = () => { if (document.visibilityState === 'visible') tick(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    // Auto-stop after 10 min so we don't poll forever if the user wandered off.
    const stop = window.setTimeout(() => setWaiting(false), 10 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(stop);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [waiting, linked, refresh]);

  const onConnect = async () => {
    setError(null);
    setLinking(true);
    try {
      const { url } = await api.linkTelegram();
      window.open(url, '_blank', 'noopener');
      setWaiting(true);
    } catch (e: any) {
      setError(e?.message || 'Could not start Telegram link');
    } finally {
      setLinking(false);
    }
  };

  return (
    <section>
      <h3 className="section-title">Telegram</h3>
      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: 10,
            background: linked ? 'color-mix(in oklab, var(--good) 14%, white)' : 'var(--ink-soft)',
            color: linked ? 'oklch(0.42 0.13 155)' : 'var(--ink-2)',
            display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14,
            flexShrink: 0,
          }}
        >tg</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Telegram approvals</div>
            {linked && <span className="badge ok"><span className="dot" />Connected</span>}
          </div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            {linked
              ? 'Draft approvals arrive in your linked Telegram chat. Tap Approve / Edit / Reject right there.'
              : waiting
                ? 'Waiting for you to tap Start in Telegram… we\'ll detect it automatically.'
                : 'Get every draft as a Telegram message with Approve / Edit / Reject buttons. One tap to publish.'}
          </div>
          {error && (
            <div style={{ color: 'var(--bad)', fontSize: 12.5, marginTop: 4 }}>{error}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {!linked && !waiting && (
            <button className="btn primary" onClick={onConnect} disabled={linking}>
              {linking ? 'Opening…' : (<><Icons.Link size={13} /> Connect Telegram</>)}
            </button>
          )}
          {!linked && waiting && (
            <>
              <span className="muted" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--accent)',
                  animation: 'tb-pulse 1.4s ease-in-out infinite',
                }} />
                Listening…
              </span>
              <button className="btn ghost" onClick={onConnect} disabled={linking}>Reopen</button>
            </>
          )}
          {linked && (
            <button className="btn ghost sm" onClick={onConnect} disabled={linking}>Re-link</button>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Integrations() {
  const location = useLocation();
  const navigate = useNavigate();
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('connected') === '1') {
      setBanner({ kind: 'ok', text: 'Threads account connected.' });
      navigate('/integrations', { replace: true });
    } else if (params.get('error')) {
      const code = params.get('error');
      const detail = params.get('detail');
      const text = (() => {
        switch (code) {
          case 'account_already_linked':
            return 'That Threads account is already linked to another workspace. Disconnect it from the other workspace first.';
          case 'missing_code':
            return "Threads didn't return an authorization code. Try again.";
          case 'callback_failed':
            return `Connection failed${detail ? `: ${detail}` : '.'}`;
          default:
            return `Connection failed: ${code}`;
        }
      })();
      setBanner({ kind: 'err', text });
      navigate('/integrations', { replace: true });
    }
  }, [location.search, navigate]);

  return (
    <div className="page">
      <h1 className="page-title">Integrations</h1>
      <p className="page-sub">Connect the services Thread Bot uses to draft, approve, and publish.</p>

      <ThreadsSection banner={banner} />
      <TelegramSection />
    </div>
  );
}
