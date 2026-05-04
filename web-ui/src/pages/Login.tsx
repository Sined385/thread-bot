import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';

function AuthSide() {
  return (
    <div className="auth-side">
      <div className="threads-grid" />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'white', color: 'black', display: 'grid', placeItems: 'center', fontFamily: 'Source Serif 4', fontStyle: 'italic', fontWeight: 600, fontSize: 18 }}>tb</div>
        <div style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>Thread Bot</div>
      </div>
      <div style={{ position: 'relative', marginTop: 'auto' }}>
        <h1 className="serif" style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.02em', fontWeight: 400, margin: '0 0 18px', maxWidth: 460 }}>
          Run a Threads presence that actually <em style={{ fontStyle: 'italic' }}>sounds like you</em>.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.55, maxWidth: 420, margin: 0 }}>
          A small AI writes drafts, your team approves them, and Threads gets the version you'd actually post. Built for businesses, not for chaos.
        </p>
      </div>
    </div>
  );
}

export { AuthSide };

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user } = await api.login({ email, password });
      setUser(user);
      navigate(user.onboarding_completed_at ? '/' : '/onboarding');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Login failed');
      } else {
        setError('Login failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrap">
      <AuthSide />
      <div className="auth-form-side">
        <form className="auth-form" onSubmit={onSubmit}>
          <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Welcome back</h2>
          <p className="muted" style={{ margin: '0 0 28px' }}>Log in to your workspace to keep the queue moving.</p>

          <div className="field">
            <label className="field-label">Email</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{ color: 'var(--bad)', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}

          <button
            type="submit"
            className="btn primary lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={submitting}
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'var(--ink-3)' }}>
            New to Thread Bot? <button type="button" className="link-btn" onClick={() => navigate('/signup')}>Create an account</button>
          </p>
        </form>
      </div>
    </div>
  );
}
