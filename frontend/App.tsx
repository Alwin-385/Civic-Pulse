
import React, { useState, useEffect } from 'react';
import Login from './screens/Login';
import CitizenDashboard from './screens/CitizenDashboard';
import OfficialDashboard from './screens/OfficialDashboard';
import NewComplaint from './screens/NewComplaint';
import TrackComplaint from './screens/TrackComplaint';
import ManageStaff from './screens/ManageStaff';
import ManageComplaints from './screens/ManageComplaints';
import { UserRole } from './types';
import { apiRequest } from './apiClient';
import { getStoredToken, isStoredTokenValid, logout, setStoredAuth, setStoredRole } from './authStore';
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
    'Database schema was out of date. A fix has been applied — redeploy Render, then try Google sign-in again.',
  oauth_error:
    'Google sign-in failed on the deployed site. Use https://civic-pulse-platform.vercel.app and ensure Render has a valid DATABASE_URL.',
};

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<string>('DASHBOARD');
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

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

      if (urlToken) {
        setStoredAuth(urlToken);
        setToken(urlToken);
      }

      const storedToken = urlToken || getStoredToken();

      try {
        if (storedToken && isStoredTokenValid()) {
          const data = await apiRequest<{ user: { role: UserRole } }>('/api/auth/me', {
            token: storedToken,
          });
          if (!cancelled) {
            setToken(storedToken);
            setRole(data.user.role);
            setStoredRole(data.user.role);
          }
          return;
        }

        if (storedToken && !isStoredTokenValid()) {
          logout();
        }

        const data = await apiRequest<{ user: { role: UserRole } }>('/api/auth/me');
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
      } finally {
        if (!cancelled) {
          setAuthChecking(false);
        }
      }
    };

    bootstrapAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
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
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <span className="material-symbols-outlined animate-spin text-3xl text-indigo-600">progress_activity</span>
            <p className="text-sm font-medium">Checking session...</p>
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
