import { useState, useEffect } from 'react';
import { api } from '../api';

const cardStyle: React.CSSProperties = {
  background: '#1a1a1a',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid #333',
};

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [account, setAccount] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    api.getDraftStats().then(setStats).catch(() => {});
    api.getAccount().then(setAccount).catch(() => {});
    api.getHealth().then(setHealth).catch(() => {});
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '24px' }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={cardStyle}>
          <div style={{ color: '#888', fontSize: '13px' }}>Status</div>
          <div style={{ fontSize: '20px', marginTop: '8px', color: health ? '#4ade80' : '#888' }}>
            {health ? 'Online' : 'Checking...'}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#888', fontSize: '13px' }}>Connected Account</div>
          <div style={{ fontSize: '20px', marginTop: '8px' }}>
            {account ? `@${account.username}` : 'Not connected'}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#888', fontSize: '13px' }}>Pending Drafts</div>
          <div style={{ fontSize: '20px', marginTop: '8px', color: '#facc15' }}>
            {stats?.pending ?? '-'}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#888', fontSize: '13px' }}>Published</div>
          <div style={{ fontSize: '20px', marginTop: '8px', color: '#4ade80' }}>
            {stats?.published ?? '-'}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#888', fontSize: '13px' }}>Rejected</div>
          <div style={{ fontSize: '20px', marginTop: '8px', color: '#f87171' }}>
            {stats?.rejected ?? '-'}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#888', fontSize: '13px' }}>Failed</div>
          <div style={{ fontSize: '20px', marginTop: '8px', color: '#f87171' }}>
            {stats?.failed ?? '-'}
          </div>
        </div>
      </div>

      {account && (
        <div style={cardStyle}>
          <h3 style={{ marginBottom: '12px' }}>Account Details</h3>
          <p>User ID: {account.threadsUserId}</p>
          <p>Scopes: {account.scopes || 'N/A'}</p>
          <p>Token expires: {account.tokenExpiresAt ? new Date(account.tokenExpiresAt * 1000).toLocaleDateString() : 'N/A'}</p>
        </div>
      )}
    </div>
  );
}
