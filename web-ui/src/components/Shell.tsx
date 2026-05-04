import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icons } from './Icons';
import { useAuth } from '../auth';

interface ShellProps {
  children: React.ReactNode;
  crumbs: string[];
  right?: React.ReactNode;
}

function workspaceInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : 'W';
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const Item = ({ path, label, icon, count, attn }: {
    path: string; label: string; icon: React.ReactNode;
    count?: number; attn?: boolean;
  }) => (
    <button
      className={`nav-item ${isActive(path) ? 'active' : ''}`}
      onClick={() => navigate(path)}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`nav-count ${attn ? 'attn' : ''}`}>{count}</span>
      )}
    </button>
  );

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  const workspaceName = user?.workspace_name ?? 'Workspace';
  const userName = user?.name ?? 'You';
  const userEmail = user?.email ?? '';

  return (
    <aside className="sidebar">
      <div className="workspace">
        <div className="workspace-mark">{workspaceInitial(workspaceName)}</div>
        <div className="workspace-meta">
          <div className="workspace-name">{workspaceName}</div>
          <div className="workspace-plan">Workspace</div>
        </div>
      </div>

      <Item path="/" label="Home" icon={<Icons.Home />} />
      <Item path="/plan" label="Content plan" icon={<Icons.Calendar />} />

      <div className="nav-section-label">Configure</div>
      <Item path="/bot" label="Bot settings" icon={<Icons.Bot />} />
      <Item path="/integrations" label="Integrations" icon={<Icons.Link />} />

      <div className="sidebar-foot">
        <div className="user-chip" onClick={onLogout} title="Log out">
          <div className="avatar">{userInitials(userName)}</div>
          <div className="user-meta">
            <div className="user-name">{userName}</div>
            <div className="user-email">{userEmail}</div>
          </div>
          <Icons.Logout size={14} />
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumbs, right }: { crumbs: string[]; right?: React.ReactNode }) {
  return (
    <div className="topbar">
      <div className="crumb">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && <span style={{ margin: '0 6px', color: 'var(--ink-5)' }}>/</span>}
            {i === crumbs.length - 1 ? <b>{c}</b> : c}
          </span>
        ))}
      </div>
      <div className="topbar-tools">
        {right}
        <button className="icon-btn" title="Search"><Icons.Search size={15} /></button>
        <button className="icon-btn" title="Notifications"><Icons.Bell size={15} /></button>
      </div>
    </div>
  );
}

export default function AppShell({ crumbs, right, children }: ShellProps) {
  return (
    <div className="app">
      <Sidebar />
      <main>
        <Topbar crumbs={crumbs} right={right} />
        {children}
      </main>
    </div>
  );
}
