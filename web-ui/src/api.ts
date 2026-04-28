const TOKEN = localStorage.getItem('threadbot_token') || '';

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getSettings: () => apiFetch('/settings'),
  updateSetting: (key: string, value: any) => apiFetch(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  updateSettings: (updates: Record<string, any>) => apiFetch('/settings', { method: 'PUT', body: JSON.stringify(updates) }),

  getDrafts: (status?: string) => apiFetch(`/drafts${status ? `?status=${status}` : ''}`),
  getDraftStats: () => apiFetch('/drafts/stats'),
  createDraft: (content: string, type?: string) => apiFetch('/drafts', { method: 'POST', body: JSON.stringify({ content, type }) }),
  approveDraft: (id: number) => apiFetch(`/drafts/${id}/approve`, { method: 'POST' }),
  rejectDraft: (id: number) => apiFetch(`/drafts/${id}/reject`, { method: 'POST' }),
  updateDraft: (id: number, content: string) => apiFetch(`/drafts/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }),

  getPosts: () => apiFetch('/posts'),
  getAccount: () => apiFetch('/posts/account'),

  getHealth: () => fetch('/api/health').then((r) => r.json()),
};
