import React, { useEffect, useState } from 'react';
import { apiRequest } from '../apiClient';

export const Settings: React.FC<{
  onNavigate?: (screen: string) => void;
  onBack: () => void;
  onLogout: () => void;
}> = ({ onNavigate, onBack, onLogout }) => {
  const [profile, setProfile] = useState<null | {
    user: { name: string; email: string; role: string };
  }>(null);
  const [error, setError] = useState<string | null>(null);

  // Expanded Settings State
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [highContrast, setHighContrast] = useState(() => document.documentElement.classList.contains('high-contrast'));
  
  const [language, setLanguage] = useState('English');
  const [dataSaver, setDataSaver] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    apiRequest<{ user: { name: string; email: string; role: string } }>('/api/auth/me')
      .then((data) => setProfile(data))
      .catch((e: any) => setError(e?.message ?? 'Failed to load profile'));
  }, []);

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <button 
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-slate-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto pb-24 font-sans relative">
      <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-slate-200/50 to-transparent -z-10 pointer-events-none"></div>

      <header className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/60 px-5 py-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-200/50 text-slate-500 hover:text-slate-900 transition-colors">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-[17px] font-bold text-slate-900">Settings</h1>
        </div>
        <button
          onClick={onLogout}
          className="p-2 -mr-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors shadow-sm"
          title="Sign Out"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
        </button>
      </header>

      <main className="px-5 py-6 space-y-6">
        {error ? (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
            <p className="text-xs text-red-700 font-bold">{error}</p>
          </div>
        ) : null}

        {/* Profile Section */}
        <section className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-5">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/30">
              {profile?.user.name ? profile.user.name[0].toUpperCase() : '👤'}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">{profile?.user.name ?? 'Loading...'}</h2>
              <p className="text-sm font-medium text-slate-500">{profile?.user.email ?? '...'}</p>
              <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-1">
                {profile?.user.role ?? '...'} Account
              </div>
            </div>
          </div>
          <button onClick={() => onNavigate?.('EDIT_PROFILE')} className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-bold rounded-xl transition-colors border border-slate-200">
            Edit Profile
          </button>
        </section>

        {/* General Preferences */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">App Preferences</h3>
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <span className="material-symbols-outlined text-[20px]">language</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Language</p>
                  <p className="text-xs text-slate-500">App display language</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-slate-500 cursor-pointer hover:text-slate-800">
                <span className="text-sm font-semibold">{language}</span>
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </div>
            </div>

            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                  <span className="material-symbols-outlined text-[20px]">data_saver_on</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Data Saver</p>
                  <p className="text-xs text-slate-500">Compress image uploads</p>
                </div>
              </div>
              <ToggleSwitch checked={dataSaver} onChange={() => setDataSaver(!dataSaver)} />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <span className="material-symbols-outlined text-[20px]">location_on</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Location Services</p>
                  <p className="text-xs text-slate-500">Use GPS for reports</p>
                </div>
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">Allowed</span>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Notifications</h3>
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                  <span className="material-symbols-outlined text-[20px]">notifications_active</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Push Notifications</p>
                  <p className="text-xs text-slate-500">Instantly receive status alerts</p>
                </div>
              </div>
              <ToggleSwitch checked={pushEnabled} onChange={() => setPushEnabled(!pushEnabled)} />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <span className="material-symbols-outlined text-[20px]">mark_email_read</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Email Updates</p>
                  <p className="text-xs text-slate-500">Get daily briefing emails</p>
                </div>
              </div>
              <ToggleSwitch checked={emailEnabled} onChange={() => setEmailEnabled(!emailEnabled)} />
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Appearance</h3>
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <span className="material-symbols-outlined text-[20px]">dark_mode</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Dark Mode</p>
                  <p className="text-xs text-slate-500">Easier on the eyes</p>
                </div>
              </div>
              <ToggleSwitch checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
            </div>
            
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl">
                  <span className="material-symbols-outlined text-[20px]">contrast</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">High Contrast</p>
                  <p className="text-xs text-slate-500">Improve readability</p>
                </div>
              </div>
              <ToggleSwitch checked={highContrast} onChange={() => setHighContrast(!highContrast)} />
            </div>
          </div>
        </section>

        {/* Security & Support */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">More</h3>
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <a href="mailto:kseb@kerala.gov.in" className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
                  <span className="material-symbols-outlined text-[20px]">help_center</span>
                </div>
                <p className="text-sm font-bold text-slate-900">Help & Support</p>
              </div>
              <span className="material-symbols-outlined text-[18px] text-slate-400">chevron_right</span>
            </a>
          </div>
          <p className="text-center text-[11px] text-slate-400 pt-4 pb-2 font-medium">Civic Pulse v2.1.0 (Build 4920)<br/>© 2026 Government of Kerala</p>
        </section>
      </main>
    </div>
  );
};
