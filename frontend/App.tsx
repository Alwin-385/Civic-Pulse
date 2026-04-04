
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
import { decodeJwtPayload, getStoredRole, getStoredToken, logout, setStoredAuth, setStoredRole } from './authStore';
import { Settings } from './screens/Settings';
import { MapView } from './screens/MapView';
import EditProfile from './screens/EditProfile';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(getStoredRole());
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [currentScreen, setCurrentScreen] = useState<string>('DASHBOARD');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (urlToken) {
      try {
        setStoredAuth(urlToken);
        setToken(urlToken);
        
        const payload = decodeJwtPayload(urlToken);
        if (!payload) {
           alert("Auth Error: Could not decode JWT token securely. Please use Email login.");
        } else if (!payload.role) {
           alert("Auth Error: No role found in payload: " + JSON.stringify(payload));
        } else {
           alert("Login successful! Welcome back.");
        }
      } catch (e: any) {
        alert("Critial Parse Error: " + e.message);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (token && !role) {
      const payload = decodeJwtPayload(token);
      const decodedRole =
        payload?.role === UserRole.CITIZEN
          ? UserRole.CITIZEN
          : payload?.role === UserRole.OFFICIAL
            ? UserRole.OFFICIAL
            : null;
      setRole(decodedRole);
      if (decodedRole) setStoredRole(decodedRole);
    }
  }, [token, role]);

  useEffect(() => {
    if (role) return;
    // Cookie-based auth (Google OAuth) will not have token in localStorage.
    apiRequest<{ user: { role: UserRole } }>('/api/auth/me')
      .then((data) => {
        setRole(data.user.role);
        setStoredRole(data.user.role);
      })
      .catch(() => {});
  }, [role]);

  // Simple state-based routing
  const renderScreen = () => {
    if (!role) {
      return (
        <Login
          onLogin={(auth) => {
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
              onLogout={() => {
                logout();
                setToken(null);
                setRole(null);
              }}
            />
          );
        case 'EDIT_PROFILE':
          return <EditProfile onBack={() => setCurrentScreen('SETTINGS')} />;
        case 'DASHBOARD':
        default:
          return <CitizenDashboard 
            onNavigate={(screen) => setCurrentScreen(screen)} 
            onLogout={() => {
              // Best-effort: clear cookie auth too.
              apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
              logout();
              setToken(null);
              setRole(null);
            }} 
          />;
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
              onLogout={() => {
                logout();
                setToken(null);
                setRole(null);
              }}
            />
          );
        case 'EDIT_PROFILE':
          return <EditProfile onBack={() => setCurrentScreen('SETTINGS')} />;
        case 'DASHBOARD':
        default:
          return <OfficialDashboard 
            onNavigate={(screen) => setCurrentScreen(screen)} 
            onLogout={() => {
              apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
              logout();
              setToken(null);
              setRole(null);
            }} 
          />;
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
            MANAGE_COMPLAINTS: 'Official Hub'
        };
        return mapping[screen] || screen;
    };

    return (
      <div className="min-h-screen bg-slate-50 flex justify-center">
        <div className="w-full max-w-7xl min-h-screen bg-white shadow-xl relative overflow-hidden flex flex-col">
          {role && currentScreen !== 'DASHBOARD' && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-xl overflow-hidden animate-in slide-in-from-top-4 fade-in duration-300">
                 <button onClick={() => setCurrentScreen('DASHBOARD')} className="text-[10px] font-black uppercase tracking-widest text-indigo-300 hover:text-white transition-colors flex items-center">
                     <span className="material-symbols-outlined text-[14px]">home</span>
                 </button>
                 <span className="material-symbols-outlined text-[12px] text-slate-500">chevron_right</span>
                 
                 {currentScreen === 'EDIT_PROFILE' && (
                     <>
                        <button onClick={() => setCurrentScreen('SETTINGS')} className="text-[10px] font-black uppercase tracking-widest text-indigo-300 hover:text-white transition-colors">
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
