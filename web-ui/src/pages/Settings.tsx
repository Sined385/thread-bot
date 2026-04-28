import { useState, useEffect } from 'react';
import { api } from '../api';

const cardStyle: React.CSSProperties = {
  background: '#1a1a1a',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid #333',
  marginBottom: '24px',
};

const inputStyle: React.CSSProperties = {
  background: '#111',
  color: '#fff',
  border: '1px solid #444',
  borderRadius: '6px',
  padding: '8px 12px',
  fontSize: '14px',
  width: '100%',
};

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, any[]>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [token, setToken] = useState(localStorage.getItem('threadbot_token') || '');

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  const updateSetting = async (key: string, value: any) => {
    setSaving(key);
    try {
      await api.updateSetting(key, value);
      setSettings((prev) => {
        const updated = { ...prev };
        for (const cat of Object.keys(updated)) {
          updated[cat] = updated[cat].map((s: any) =>
            s.key === key ? { ...s, value } : s
          );
        }
        return updated;
      });
    } catch (e) {
      console.error(e);
    }
    setSaving(null);
  };

  const saveToken = () => {
    localStorage.setItem('threadbot_token', token);
    window.location.reload();
  };

  const renderField = (setting: any) => {
    const { key, value, type, options, label, description } = setting;

    return (
      <div key={key} style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
          {label}
          {saving === key && <span style={{ color: '#facc15', marginLeft: '8px', fontSize: '12px' }}>Saving...</span>}
        </label>
        {description && <p style={{ color: '#666', fontSize: '12px', marginBottom: '6px' }}>{description}</p>}

        {type === 'boolean' && (
          <button
            onClick={() => updateSetting(key, !value)}
            style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #444', background: value ? '#22c55e' : '#333', color: '#fff', cursor: 'pointer' }}
          >
            {value ? 'Enabled' : 'Disabled'}
          </button>
        )}

        {type === 'select' && (
          <select
            value={value}
            onChange={(e) => updateSetting(key, e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {(options || []).map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}

        {type === 'number' && (
          <input
            type="number"
            value={value}
            onChange={(e) => updateSetting(key, parseFloat(e.target.value))}
            style={{ ...inputStyle, width: '120px' }}
          />
        )}

        {type === 'text' && (
          <input
            type="text"
            value={value}
            onBlur={(e) => updateSetting(key, e.target.value)}
            onChange={(e) => {
              setSettings((prev) => {
                const updated = { ...prev };
                for (const cat of Object.keys(updated)) {
                  updated[cat] = updated[cat].map((s: any) =>
                    s.key === key ? { ...s, value: e.target.value } : s
                  );
                }
                return updated;
              });
            }}
            style={inputStyle}
          />
        )}

        {type === 'textarea' && (
          <textarea
            value={value}
            onBlur={(e) => updateSetting(key, e.target.value)}
            onChange={(e) => {
              setSettings((prev) => {
                const updated = { ...prev };
                for (const cat of Object.keys(updated)) {
                  updated[cat] = updated[cat].map((s: any) =>
                    s.key === key ? { ...s, value: e.target.value } : s
                  );
                }
                return updated;
              });
            }}
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
          />
        )}

        {type === 'array' && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {(value || []).map((item: string, i: number) => (
                <span key={i} style={{ background: '#333', padding: '4px 10px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {item}
                  <button
                    onClick={() => updateSetting(key, value.filter((_: any, idx: number) => idx !== i))}
                    style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px' }}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Type and press Enter to add"
              style={{ ...inputStyle, width: '250px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget;
                  const newVal = input.value.trim();
                  if (newVal) {
                    updateSetting(key, [...(value || []), newVal]);
                    input.value = '';
                  }
                }
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const categoryLabels: Record<string, string> = {
    personality: 'Personality',
    content: 'Content',
    monitoring: 'Monitoring',
    scheduling: 'Scheduling',
    advanced: 'Advanced',
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Settings</h1>

      <div style={{ ...cardStyle, marginBottom: '32px' }}>
        <h3 style={{ marginBottom: '8px' }}>API Token</h3>
        <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>Set your WEB_UI_SECRET to authenticate API requests</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} style={{ ...inputStyle, width: '300px' }} />
          <button onClick={saveToken} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}>Save</button>
        </div>
      </div>

      {Object.entries(settings).map(([category, items]) => (
        <div key={category} style={cardStyle}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#fff' }}>
            {categoryLabels[category] || category}
          </h2>
          {items.map(renderField)}
        </div>
      ))}
    </div>
  );
}
