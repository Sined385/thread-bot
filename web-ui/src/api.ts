export interface ApiUser {
  id: number;
  email: string;
  name: string;
  workspace_name: string;
  workspace_website: string | null;
  onboarding_completed_at: string | null;
  telegram_linked: boolean;
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    throw new ApiError(body?.error || `API error: ${res.status}`, res.status, body);
  }
  return body;
}

export const api = {
  // Auth
  signup: (input: {
    email: string;
    password: string;
    name: string;
    workspace_name: string;
    workspace_website?: string | null;
  }) => apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(input) }) as Promise<{ user: ApiUser }>,
  login: (input: { email: string; password: string }) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(input) }) as Promise<{ user: ApiUser }>,
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  me: () => apiFetch('/auth/me') as Promise<{ user: ApiUser }>,
  completeOnboarding: () =>
    apiFetch('/auth/onboarding-complete', { method: 'POST' }) as Promise<{ user: ApiUser }>,
  linkTelegram: () =>
    apiFetch('/auth/telegram/link', { method: 'POST' }) as Promise<{ url: string; expires_at: string }>,

  // Settings
  getSettings: () => apiFetch('/settings'),
  updateSetting: (key: string, value: any) =>
    apiFetch(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  updateSettings: (updates: Record<string, any>) =>
    apiFetch('/settings', { method: 'PUT', body: JSON.stringify(updates) }),

  // Drafts
  getDrafts: (status?: string) => apiFetch(`/drafts${status ? `?status=${status}` : ''}`),
  getDraftStats: () => apiFetch('/drafts/stats'),
  createDraft: (content: string, type?: string) =>
    apiFetch('/drafts', { method: 'POST', body: JSON.stringify({ content, type }) }),
  generateDraft: () => apiFetch('/drafts/generate', { method: 'POST' }),
  approveDraft: (id: number) => apiFetch(`/drafts/${id}/approve`, { method: 'POST' }),
  rejectDraft: (id: number) => apiFetch(`/drafts/${id}/reject`, { method: 'POST' }),
  scheduleDraft: (id: number, scheduledFor: string) =>
    apiFetch(`/drafts/${id}/schedule`, { method: 'POST', body: JSON.stringify({ scheduled_for: scheduledFor }) }),
  unscheduleDraft: (id: number) =>
    apiFetch(`/drafts/${id}/unschedule`, { method: 'POST' }),
  updateDraft: (id: number, content: string) =>
    apiFetch(`/drafts/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }),

  // Posts
  getPosts: () => apiFetch('/posts'),
  getAccount: () => apiFetch('/posts/account'),
  disconnectAccount: () => apiFetch('/posts/account', { method: 'DELETE' }),

  getHealth: () => fetch('/api/health').then((r) => r.json()),
};
