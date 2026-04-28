import { useState, useEffect } from 'react';
import { api } from '../api';

const cardStyle: React.CSSProperties = {
  background: '#1a1a1a',
  borderRadius: '12px',
  padding: '20px',
  border: '1px solid #333',
  marginBottom: '12px',
};

const btnStyle = (color: string): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: '6px',
  border: 'none',
  background: color,
  color: '#fff',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
});

export default function ApprovalQueue() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const load = () => {
    api.getDrafts(filter).then(setDrafts).catch(() => {});
  };

  useEffect(load, [filter]);

  const approve = async (id: number) => {
    await api.approveDraft(id);
    load();
  };

  const reject = async (id: number) => {
    await api.rejectDraft(id);
    load();
  };

  const saveEdit = async (id: number) => {
    await api.updateDraft(id, editText);
    setEditingId(null);
    load();
  };

  const typeLabels: Record<string, string> = {
    original_post: 'Original Post',
    reply: 'Reply',
    mention_reply: 'Mention Reply',
    keyword_reply: 'Keyword Reply',
  };

  const statusColors: Record<string, string> = {
    pending: '#facc15',
    approved: '#60a5fa',
    published: '#4ade80',
    rejected: '#f87171',
    failed: '#ef4444',
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Approval Queue</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['pending', 'approved', 'published', 'rejected', 'failed'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              ...btnStyle(filter === s ? '#444' : '#222'),
              color: statusColors[s],
              border: `1px solid ${filter === s ? '#555' : '#333'}`,
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {drafts.length === 0 && <p style={{ color: '#666' }}>No drafts found.</p>}

      {drafts.map((draft) => (
        <div key={draft.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <span style={{ color: statusColors[draft.status], fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                {draft.status}
              </span>
              <span style={{ color: '#666', fontSize: '12px', marginLeft: '12px' }}>
                {typeLabels[draft.type] || draft.type} | {draft.triggerSource}
              </span>
            </div>
            <span style={{ color: '#555', fontSize: '12px' }}>
              {new Date((draft.createdAt as number) * 1000).toLocaleString()}
            </span>
          </div>

          {draft.replyToUsername && (
            <div style={{ background: '#111', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '13px', borderLeft: '3px solid #444' }}>
              <span style={{ color: '#888' }}>@{draft.replyToUsername}: </span>
              <span style={{ color: '#aaa' }}>{draft.replyToText}</span>
            </div>
          )}

          {editingId === draft.id ? (
            <div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{ width: '100%', minHeight: '80px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '6px', padding: '10px', fontSize: '14px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button style={btnStyle('#3b82f6')} onClick={() => saveEdit(draft.id)}>Save</button>
                <button style={btnStyle('#333')} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '15px', lineHeight: 1.5 }}>{draft.content}</p>
          )}

          {draft.status === 'pending' && editingId !== draft.id && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button style={btnStyle('#22c55e')} onClick={() => approve(draft.id)}>Approve</button>
              <button style={btnStyle('#444')} onClick={() => { setEditingId(draft.id); setEditText(draft.content); }}>Edit</button>
              <button style={btnStyle('#ef4444')} onClick={() => reject(draft.id)}>Reject</button>
            </div>
          )}

          {draft.errorMessage && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>Error: {draft.errorMessage}</p>
          )}
        </div>
      ))}
    </div>
  );
}
