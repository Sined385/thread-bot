import React from 'react';

interface IconProps {
  size?: number;
  stroke?: number;
  className?: string;
}

function Icon({ size = 16, stroke = 1.5, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export const Icons = {
  Home: (p: IconProps) => <Icon {...p}><path d="M2.5 7L8 2.5 13.5 7v6a1 1 0 0 1-1 1H10v-4H6v4H3.5a1 1 0 0 1-1-1V7z" /></Icon>,
  Inbox: (p: IconProps) => <Icon {...p}><path d="M2 9.5l1.5-6h9L14 9.5" /><path d="M2 9.5h3l1 1.5h4l1-1.5h3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3z" /></Icon>,
  Posts: (p: IconProps) => <Icon {...p}><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M5 6.5h6M5 9h4" /></Icon>,
  Settings: (p: IconProps) => <Icon {...p}><circle cx="8" cy="8" r="2" /><path d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8L3.4 3.4" /></Icon>,
  Team: (p: IconProps) => <Icon {...p}><circle cx="6" cy="6" r="2.2" /><path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4" /><circle cx="11.5" cy="5.5" r="1.7" /><path d="M10.5 9c2.2 0 3.5 1.5 3.5 3.5" /></Icon>,
  Link: (p: IconProps) => <Icon {...p}><path d="M6.5 9.5l3-3" /><path d="M9 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1" /><path d="M7 11.5l-1 1a2.5 2.5 0 0 1-3.5-3.5l1-1" /></Icon>,
  Bot: (p: IconProps) => <Icon {...p}><rect x="2.5" y="5" width="11" height="8" rx="2" /><circle cx="6" cy="9" r="0.7" fill="currentColor" /><circle cx="10" cy="9" r="0.7" fill="currentColor" /><path d="M8 5V2.5M6.5 2.5h3" /></Icon>,
  Bell: (p: IconProps) => <Icon {...p}><path d="M4 11V7.5a4 4 0 0 1 8 0V11l1 1.5H3L4 11z" /><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" /></Icon>,
  Search: (p: IconProps) => <Icon {...p}><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5l3 3" /></Icon>,
  Plus: (p: IconProps) => <Icon {...p}><path d="M8 3v10M3 8h10" /></Icon>,
  Check: (p: IconProps) => <Icon {...p}><path d="M3 8.5l3 3 7-7" /></Icon>,
  X: (p: IconProps) => <Icon {...p}><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></Icon>,
  ChevronDown: (p: IconProps) => <Icon {...p}><path d="M3.5 6l4.5 4.5L12.5 6" /></Icon>,
  ChevronRight: (p: IconProps) => <Icon {...p}><path d="M6 3.5L10.5 8 6 12.5" /></Icon>,
  ChevronLeft: (p: IconProps) => <Icon {...p}><path d="M10 3.5L5.5 8 10 12.5" /></Icon>,
  Edit: (p: IconProps) => <Icon {...p}><path d="M11 2.5l2.5 2.5L6 12.5l-3 0.5 0.5-3z" /></Icon>,
  Calendar: (p: IconProps) => <Icon {...p}><rect x="2" y="3.5" width="12" height="10" rx="1.5" /><path d="M2 6.5h12M5.5 2v3M10.5 2v3" /></Icon>,
  Clock: (p: IconProps) => <Icon {...p}><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3l2 1.5" /></Icon>,
  Filter: (p: IconProps) => <Icon {...p}><path d="M2.5 3.5h11l-4 5v4l-3 1.5V8.5z" /></Icon>,
  Switch: (p: IconProps) => <Icon {...p}><path d="M3 4.5h8M9 2.5l2 2-2 2" /><path d="M13 11.5H5M7 13.5l-2-2 2-2" /></Icon>,
  External: (p: IconProps) => <Icon {...p}><path d="M6 3.5H3.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V10" /><path d="M9 2.5h4v4M13 2.5L7.5 8" /></Icon>,
  Sparkle: (p: IconProps) => <Icon {...p}><path d="M8 2v3M8 11v3M2 8h3M11 8h3M4.5 4.5l2 2M11.5 11.5l-2-2M11.5 4.5l-2 2M4.5 11.5l2-2" /></Icon>,
  Logout: (p: IconProps) => <Icon {...p}><path d="M9 2.5H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h5" /><path d="M7 8h7M11.5 5.5L14 8l-2.5 2.5" /></Icon>,
  Eye: (p: IconProps) => <Icon {...p}><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" /><circle cx="8" cy="8" r="1.8" /></Icon>,
  Trash: (p: IconProps) => <Icon {...p}><path d="M3 4.5h10M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5 4.5l.5 8a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1l.5-8" /></Icon>,
  Copy: (p: IconProps) => <Icon {...p}><rect x="5" y="5" width="9" height="9" rx="1.5" /><path d="M3 11V3a1 1 0 0 1 1-1h7" /></Icon>,
  More: (p: IconProps) => <Icon {...p}><circle cx="3.5" cy="8" r="0.9" fill="currentColor" /><circle cx="8" cy="8" r="0.9" fill="currentColor" /><circle cx="12.5" cy="8" r="0.9" fill="currentColor" /></Icon>,
};
