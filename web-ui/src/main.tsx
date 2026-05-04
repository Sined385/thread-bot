import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import './styles.css';

import AppShell from './components/Shell';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import ContentPlan from './pages/ContentPlan';
import BotSettings from './pages/Settings';
import Integrations from './pages/Integrations';
import { AuthProvider, RequireAuth, RequireOnboarded, RedirectIfAuthed, useAuth } from './auth';

function ShellLayout() {
  const location = useLocation();
  const { user } = useAuth();

  const workspaceName = user?.workspace_name ?? 'Workspace';

  const crumbMap: Record<string, string[]> = {
    '/': [workspaceName, 'Home'],
    '/plan': [workspaceName, 'Content plan'],
    '/bot': [workspaceName, 'Bot settings'],
    '/integrations': [workspaceName, 'Integrations'],
  };

  const crumbs = crumbMap[location.pathname] || [workspaceName];

  return (
    <AppShell crumbs={crumbs}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/plan" element={<ContentPlan />} />
        <Route path="/bot" element={<BotSettings />} />
        <Route path="/integrations" element={<Integrations />} />
      </Routes>
    </AppShell>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <Login />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/signup"
            element={
              <RedirectIfAuthed>
                <Signup />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <Onboarding />
              </RequireAuth>
            }
          />
          <Route
            path="/*"
            element={
              <RequireOnboarded>
                <ShellLayout />
              </RequireOnboarded>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
