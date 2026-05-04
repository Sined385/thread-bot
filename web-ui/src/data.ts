export function fmtRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function typeLabel(t: string): string {
  return ({
    original_post: 'Original post',
    reply: 'Reply',
    mention_reply: 'Mention reply',
    keyword_reply: 'Keyword reply',
  } as Record<string, string>)[t] || t;
}

export const SAMPLE_ACTIVITY = [
  { who: 'Anna', action: 'approved', target: 'a reply to @mira.builds', when: '2m ago' },
  { who: 'You', action: 'rejected', target: 'a scheduled post', when: '14m ago' },
  { who: 'Bot', action: 'drafted', target: '3 new replies from mentions', when: '21m ago' },
  { who: 'Marcus', action: 'edited', target: 'tone settings', when: '1h ago' },
  { who: 'Anna', action: 'connected', target: '@studio.threads', when: '4h ago' },
];

export const SAMPLE_MEMBERS = [
  { name: 'Denys Sharkov', email: 'denys@studio.co', role: 'owner', initials: 'DS', last: 'Active now' },
  { name: 'Anna Rivera', email: 'anna@studio.co', role: 'admin', initials: 'AR', last: 'Active 2m ago' },
  { name: 'Marcus Chen', email: 'marcus@studio.co', role: 'reviewer', initials: 'MC', last: 'Yesterday' },
  { name: 'Lea Bonnet', email: 'lea@studio.co', role: 'reviewer', initials: 'LB', last: '3 days ago' },
];

export const SAMPLE_ACCOUNTS = [
  { handle: 'studio.threads', followers: '12.4k', status: 'active', autoMode: 'review', initials: 'ST' },
  { handle: 'denys.builds', followers: '3.1k', status: 'active', autoMode: 'auto', initials: 'DB' },
  { handle: 'studio.support', followers: '842', status: 'paused', autoMode: 'review', initials: 'SS' },
];
