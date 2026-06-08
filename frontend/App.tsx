
import React, { useState, useEffect } from 'react';
import Login from './screens/Login';
import CitizenDashboard from './screens/CitizenDashboard';
import OfficialDashboard from './screens/OfficialDashboard';
import NewComplaint from './screens/NewComplaint';
import TrackComplaint from './screens/TrackComplaint';
import ManageStaff from './screens/ManageStaff';
import ManageComplaints from './screens/ManageComplaints';
import { UserRole } from './types';
import { apiRequest, wakeApi } from './apiClient';
import {
  getStoredToken,
  isStoredTokenValid,
  isTokenValid,
  logout,
  roleFromToken,
  setStoredAuth,
  setStoredRole,
} from './authStore';
import { Settings } from './screens/Settings';
import { MapView } from './screens/MapView';
import EditProfile from './screens/EditProfile';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  google_login_failed:
    'Google sign-in failed. Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Render to match your new Google Cloud OAuth client, then redeploy.',
  oauth_redirect_mismatch:
    'Google redirect URI mismatch. In Google Cloud Console add: https://civic-pulse-ak6s.onrender.com/api/auth/google/callback',
  oauth_invalid_client:
    'Invalid Google OAuth client on Render. Paste the new Client ID and Client Secret from Google Cloud into Render Environment variables.',
  oauth_access_denied:
    'Google access was denied. Add your Gmail under Google Cloud → Audience → Test users (app is in Testing mode).',
  oauth_state: 'Google sign-in session expired. Please try again.',
  database_unavailable:
    'Cannot connect to the database. On Render set DATABASE_URL to the Supabase session pooler (port 5432) with no quotes around the value.',
  database_schema:
    'Database schema was out of date. Redeploy Render, then try Google sign-in again.',
  oauth_error:
    'Google sign-in failed on the deployed site. Use https://civic-pulse-platform.vercel.app and ensure Render has a valid DATABASE_URL.',
};

const AUTH_BOOTSTRAP_MAX_MS = 12000;

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<string>('DASHBOARD');
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState('Checking session...');

  useEffect(() => {
    wakeApi();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const safetyTimer = window.setTimeout(() => {
      if (!cancelled) {
        setAuthChecking(false);
        setAuthStatus('Checking session...');
      }
    }, AUTH_BOOTSTRAP_MAX_MS);

    const applyToken = (authToken: string) => {
      const decodedRole = roleFromToken(authToken);
      if (!decodedRole) return false;
      setStoredAuth(authToken);
      setToken(authToken);
      setRole(decodedRole);
      setStoredRole(decodedRole);
      return true;
    };

    const validateInBackground = (authToken: string) => {
      apiRequest<{ user: { role: UserRole } }>('/api/auth/me', { token: authToken, timeoutMs: 20000 })
        .then((data) => {
          if (cancelled) return;
          setRole(data.user.role);
          setStoredRole(data.user.role);
        })
        .catch(() => {
          if (cancelled) return;
          logout();
          setToken(null);
          setRole(null);
          setAuthError('Session expired. Please sign in again.');
        });
    };

    const bootstrapAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      const urlError = urlParams.get('error');
      const oauthError = urlParams.get('oauth_error');

      if (urlToken || urlError || oauthError) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (oauthError) {
        setAuthError(AUTH_ERROR_MESSAGES.oauth_error);
      } else if (urlError) {
        setAuthError(AUTH_ERROR_MESSAGES[urlError] ?? 'Sign-in failed. Please try again.');
      }

      // Google OAuth redirect: log in immediately from JWT — do not block on slow API wake-up.
      if (urlToken && isTokenValid(urlToken) && applyToken(urlToken)) {
        validateInBackground(urlToken);
        return;
      }

      const storedToken = getStoredToken();
      if (storedToken && isStoredTokenValid() && applyToken(storedToken)) {
        validateInBackground(storedToken);
        return;
      }

      if (storedToken && !isStoredTokenValid()) {
        logout();
      }

      setAuthStatus('Connecting to server...');
      try {
        const data = await apiRequest<{ user: { role: UserRole } }>('/api/auth/me', { timeoutMs: 20000 });
        if (!cancelled) {
          setRole(data.user.role);
          setStoredRole(data.user.role);
        }
      } catch {
        logout();
        if (!cancelled) {
          setToken(null);
          setRole(null);
        }
      }
    };

    bootstrapAuth()
      .finally(() => {
        if (!cancelled) {
          setAuthChecking(false);
          setAuthStatus('Checking session...');
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimer);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST', timeoutMs: 10000 });
    } catch {
      // Still drop client state so the UI can sign out even if the network fails.
    }
    logout();
    setToken(null);
    setRole(null);
    setCurrentScreen('DASHBOARD');
  };

  const renderScreen = () => {
    if (authChecking) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3 text-slate-500 max-w-xs text-center px-4">
            <span className="material-symbols-outlined animate-spin text-3xl text-indigo-600">progress_activity</span>
            <p className="text-sm font-medium">{authStatus}</p>
            <p className="text-xs text-slate-400">First load may take up to 30 seconds while the server wakes up.</p>
          </div>
        </div>
      );
    }

    if (!role) {
      return (
        <Login
          initialError={authError}
          onLogin={(auth) => {
            setAuthError(null);
            setStoredAuth(auth.token);
            setToken(auth.token);
            setRole(auth.role);
          }}
        />
      );
    }

    if (role === UserRole.CITIZEN) {
      switch (currentScreen) {
        case 'NEW_COMPLAINT':
          return <NewComplaint onBack={() => setCurrentScreen('DASHBOARD')} />;
        case 'TRACK_COMPLAINT':
          return <TrackComplaint onBack={() => setCurrentScreen('DASHBOARD')} />;
        case 'MAP':
          return <MapView onBack={() => setCurrentScreen('DASHBOARD')} />;
        case 'SETTINGS':
          return (
            <Settings
              onNavigate={(s) => setCurrentScreen(s)}
              onBack={() => setCurrentScreen('DASHBOARD')}
              onLogout={handleLogout}
            />
          );
        case 'EDIT_PROFILE':
          return <EditProfile onBack={() => setCurrentScreen('SETTINGS')} />;
        case 'DASHBOARD':
        default:
          return (
            <CitizenDashboard
              onNavigate={(screen) => setCurrentScreen(screen)}
              onLogout={handleLogout}
            />
          );
      }
    }

    if (role === UserRole.OFFICIAL) {
      switch (currentScreen) {
        case 'MANAGE_STAFF':
          return <ManageStaff onBack={() => setCurrentScreen('DASHBOARD')} />;
        case 'MANAGE_COMPLAINTS':
          return <ManageComplaints onBack={() => setCurrentScreen('DASHBOARD')} />;
        case 'MAP':
          return <MapView onBack={() => setCurrentScreen('DASHBOARD')} />;
        case 'SETTINGS':
          return (
            <Settings
              onNavigate={(s) => setCurrentScreen(s)}
              onBack={() => setCurrentScreen('DASHBOARD')}
              onLogout={handleLogout}
            />
          );
        case 'EDIT_PROFILE':
          return <EditProfile onBack={() => setCurrentScreen('SETTINGS')} />;
        case 'DASHBOARD':
        default:
          return (
            <OfficialDashboard
              onNavigate={(screen) => setCurrentScreen(screen)}
              onLogout={handleLogout}
            />
          );
      }
    }

    return <div>Unknown Screen</div>;
  };

  const getBreadcrumbTitle = (screen: string) => {
    const mapping: Record<string, string> = {
      NEW_COMPLAINT: 'File Record',
      TRACK_COMPLAINT: 'Track Issues',
      MAP: 'Map Overlay',
      SETTINGS: 'Preferences',
      EDIT_PROFILE: 'Identity',
      MANAGE_STAFF: 'Engineer Routing',
      MANAGE_COMPLAINTS: 'Official Hub',
    };
    return mapping[screen] || screen;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-7xl min-h-screen bg-white shadow-xl relative overflow-hidden flex flex-col">
        {role && currentScreen !== 'DASHBOARD' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-xl overflow-hidden animate-in slide-in-from-top-4 fade-in duration-300">
            <button
              onClick={() => setCurrentScreen('DASHBOARD')}
              className="text-[10px] font-black uppercase tracking-widest text-indigo-300 hover:text-white transition-colors flex items-center"
            >
              <span className="material-symbols-outlined text-[14px]">home</span>
            </button>
            <span className="material-symbols-outlined text-[12px] text-slate-500">chevron_right</span>

            {currentScreen === 'EDIT_PROFILE' && (
              <>
                <button
                  onClick={() => setCurrentScreen('SETTINGS')}
                  className="text-[10px] font-black uppercase tracking-widest text-indigo-300 hover:text-white transition-colors"
                >
                  Preferences
                </button>
                <span className="material-symbols-outlined text-[12px] text-slate-500">chevron_right</span>
              </>
            )}
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-100 pr-1 truncate max-w-[120px]">
              {getBreadcrumbTitle(currentScreen)}
            </span>
          </div>
        )}
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;
