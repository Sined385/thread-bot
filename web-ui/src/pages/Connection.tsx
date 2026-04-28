import { useState, useEffect } from 'react';
import { api } from '../api';

const cardStyle: React.CSSProperties = {
  background: '#1a1a1a',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid #333',
  marginBottom: '24px',
};

export default function Connection() {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAccount()
      .then(setAccount)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#888' }}>Loading...</p>;

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Connection</h1>

      {account ? (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            {account.profilePictureUrl && (
              <img
                src={account.profilePictureUrl}
                alt={account.username}
                style={{ width: 64, height: 64, borderRadius: '50%' }}
              />
            )}
            <div>
              <h2 style={{ fontSize: '20px' }}>@{account.username}</h2>
              <p style={{ color: '#888', fontSize: '13px' }}>Threads User ID: {account.threadsUserId}</p>
            </div>
            <span style={{ marginLeft: 'auto', background: '#22c55e33', color: '#4ade80', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}>
              Connected
            </span>
          </div>
          <div style={{ fontSize: '14px', color: '#888' }}>
            <p>Scopes: {account.scopes || 'N/A'}</p>
            <p>Token expires: {account.tokenExpiresAt ? new Date(account.tokenExpiresAt * 1000).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>
      ) : (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Connect Your Threads Account</h2>
          <p style={{ color: '#888', marginBottom: '16px' }}>
            Click the button below to authorize the bot to access your Threads account.
          </p>
          <a
            href="/api/oauth/connect"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#3b82f6',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            Connect Threads Account
          </a>
        </div>
      )}
    </div>
  );
}
