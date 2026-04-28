import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import ApprovalQueue from './pages/ApprovalQueue';
import PostHistory from './pages/PostHistory';
import Connection from './pages/Connection';

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  padding: '16px 24px',
  borderBottom: '1px solid #222',
  background: '#111',
};

const linkStyle: React.CSSProperties = {
  color: '#888',
  textDecoration: 'none',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '14px',
};

function App() {
  return (
    <BrowserRouter>
      <nav style={navStyle}>
        <NavLink to="/" style={({ isActive }) => ({ ...linkStyle, color: isActive ? '#fff' : '#888', background: isActive ? '#333' : 'transparent' })}>Dashboard</NavLink>
        <NavLink to="/queue" style={({ isActive }) => ({ ...linkStyle, color: isActive ? '#fff' : '#888', background: isActive ? '#333' : 'transparent' })}>Approval Queue</NavLink>
        <NavLink to="/history" style={({ isActive }) => ({ ...linkStyle, color: isActive ? '#fff' : '#888', background: isActive ? '#333' : 'transparent' })}>Post History</NavLink>
        <NavLink to="/settings" style={({ isActive }) => ({ ...linkStyle, color: isActive ? '#fff' : '#888', background: isActive ? '#333' : 'transparent' })}>Settings</NavLink>
        <NavLink to="/connection" style={({ isActive }) => ({ ...linkStyle, color: isActive ? '#fff' : '#888', background: isActive ? '#333' : 'transparent' })}>Connection</NavLink>
      </nav>
      <main style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/queue" element={<ApprovalQueue />} />
          <Route path="/history" element={<PostHistory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/connection" element={<Connection />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
