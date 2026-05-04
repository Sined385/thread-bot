import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthSide } from './Login';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';

export default function Signup() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceWebsite, setWorkspaceWebsite] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user } = await api.signup({
        name,
        email,
        workspace_name: workspaceName,
        workspace_website: workspaceWebsite || null,
        password,
      });
      setUser(user);
      navigate('/onboarding');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Sign up failed');
      } else {
        setError('Sign up failed');
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
          <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Create your workspace</h2>
          <p className="muted" style={{ margin: '0 0 28px' }}>One Threads account per workspace. You can configure everything from the dashboard.</p>

          <div className="field">
            <label className="field-label">Your name</label>
            <input
              className="input"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-label">Work email</label>
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
            <label className="field-label">Workspace name</label>
            <input
              className="input"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
            />
            <div className="field-hint">This is what you'll see in the sidebar. You can change it later.</div>
          </div>
          <div className="field">
            <label className="field-label">Website <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
            <input
              className="input"
              placeholder="studiogoods.co"
              value={workspaceWebsite}
              onChange={(e) => setWorkspaceWebsite(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
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
            {submitting ? 'Creating…' : 'Create workspace'}
          </button>

          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.55 }}>
            By continuing you agree to our Terms and Privacy Policy. We never post on your behalf without your approval.
          </p>

          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'var(--ink-3)' }}>
            Already have an account? <button type="button" className="link-btn" onClick={() => navigate('/login')}>Log in</button>
          </p>
        </form>
      </div>
    </div>
  );
}
