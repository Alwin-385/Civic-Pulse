import React, { useEffect, useMemo, useState } from 'react';
import { Header, BottomNav } from '../components/Layout';
import { apiRequest } from '../apiClient';
import { NotificationsWidget } from '../components/NotificationsWidget';

interface CitizenDashboardProps {
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}

const CitizenDashboard: React.FC<CitizenDashboardProps> = ({ onNavigate, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>('...');
  const [complaints, setComplaints] = useState<
    Array<{
      id: number;
      status: string;
      createdAt: string;
      title: string;
      description: string;
      department?: { name: string };
      statusHistory: Array<{ status: string; note?: string | null; createdAt: string }>;
    }>
  >([]);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / (60 * 1000));
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiRequest<any[]>('/api/complaints/mine')
      .then(setComplaints)
      .catch((e: any) => setError(e?.message ?? 'Failed to load complaints'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apiRequest<{ user: { name: string } }>('/api/auth/me')
      .then((data) => setProfileName(data.user.name))
      .catch(() => {});
  }, []);

  const counts = useMemo(() => {
    const active = complaints.filter((c) => ['DISPATCHED', 'IN_PROGRESS'].includes(c.status)).length;
    const resolved = complaints.filter((c) => c.status === 'RESOLVED').length;
    const pending = complaints.filter((c) => ['REPORTED', 'ACKNOWLEDGED'].includes(c.status)).length;
    return { active, resolved, pending };
  }, [complaints]);

  const recentUpdates = useMemo(() => {
    return [...complaints].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 3);
  }, [complaints]);

  return (
    <div className="flex-1 flex flex-col bg-[#f0f4f8] font-sans">
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 pb-20 pt-8 px-4 shadow-xl overflow-hidden rounded-b-3xl">
        <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-blue-500/20 blur-3xl rounded-full"></div>
        
        <div className="relative z-10 flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tight">Hello, {profileName}</h1>
            <p className="text-indigo-200 text-sm font-medium">Smart Reporting Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
             <NotificationsWidget />
             <button
               onClick={onLogout}
               className="size-10 flex items-center justify-center text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-colors border border-white/10 shadow-sm"
             >
               <span className="material-symbols-outlined text-lg">logout</span>
             </button>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-5 py-2 -mt-14 space-y-8 pb-32 z-10 relative">
        <section className="grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white/80 backdrop-blur-xl border border-white rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg shadow-indigo-900/5">
            <span className="text-indigo-600 font-black text-3xl">{loading ? '...' : counts.active}</span>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Active</span>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-white rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg shadow-emerald-900/5">
            <span className="text-emerald-500 font-black text-3xl">{loading ? '...' : counts.resolved}</span>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Resolved</span>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-white rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg shadow-amber-900/5">
            <span className="text-amber-500 font-black text-3xl">{loading ? '...' : counts.pending}</span>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Pending</span>
          </div>
        </section>

        {error ? <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold shadow-sm">{error}</div> : null}

        <section className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          <h2 className="text-slate-900 text-lg font-black tracking-tight mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => onNavigate('NEW_COMPLAINT')}
              className="group bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-2xl p-5 flex flex-col items-start gap-3 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:bg-white/20 transition-all"></div>
              <div className="size-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-inner relative z-10">
                <span className="material-symbols-outlined text-white">add_circle</span>
              </div>
              <div className="text-left relative z-10">
                <span className="block text-base font-bold">Report Issue</span>
                <span className="text-[11px] text-indigo-100 font-medium">Create a new ticket</span>
              </div>
            </button>
            <button 
              onClick={() => onNavigate('TRACK_COMPLAINT')}
              className="group bg-white border border-slate-200 text-slate-900 rounded-2xl p-5 flex flex-col items-start gap-3 shadow-lg shadow-slate-200/50 active:scale-95 transition-all hover:border-indigo-200"
            >
              <div className="size-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 shadow-inner group-hover:bg-indigo-100 transition-colors">
                <span className="material-symbols-outlined">track_changes</span>
              </div>
              <div className="text-left">
                <span className="block text-base font-bold">Track Status</span>
                <span className="text-[11px] text-slate-500 font-medium">View updates</span>
              </div>
            </button>
          </div>
        </section>

        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-900 text-lg font-black tracking-tight">Recent Updates</h2>
            <button onClick={() => onNavigate('TRACK_COMPLAINT')} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full text-xs font-bold transition-colors">View All</button>
          </div>
          <div className="space-y-3">
            {recentUpdates.map((c) => {
              const isResolved = c.status === 'RESOLVED';
              const dept = c.department?.name ?? 'DEPT';
              const lastStatus = c.statusHistory?.[0]?.status ?? c.status;

              return (
                <div
                  key={c.id}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => onNavigate('TRACK_COMPLAINT')}
                >
                  <div
                    className={`size-12 rounded-full shrink-0 flex items-center justify-center shadow-inner ${
                      isResolved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <span className="material-symbols-outlined">
                      {isResolved
                        ? 'check_circle'
                        : ['DISPATCHED', 'IN_PROGRESS'].includes(lastStatus)
                          ? 'engineering'
                          : 'pending_actions'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 gap-2">
                       <div className="flex flex-wrap gap-2 items-center">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${dept === 'KSEB' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {dept}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">#{c.id}</span>
                       </div>
                       <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">{timeAgo(c.createdAt)}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {c.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{c.description}</p>
                  </div>
                </div>
              );
            })}

            {loading || recentUpdates.length === 0 ? (
              <div className="bg-white border text-center border-slate-100 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center shadow-sm">
                 <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">inbox</span>
                 <p className="text-sm font-semibold text-slate-500">No updates yet.</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <BottomNav 
        activeTab="home"
        onTabChange={(id) => {
          if (id === 'home') onNavigate('DASHBOARD');
          if (id === 'reports') onNavigate('TRACK_COMPLAINT');
          if (id === 'map') onNavigate('MAP');
          if (id === 'settings') onNavigate('SETTINGS');
        }}
        tabs={[
          { id: 'home', label: 'Home', icon: 'home' },
          { id: 'reports', label: 'Reports', icon: 'description' },
          { id: 'map', label: 'Map', icon: 'map' },
          { id: 'settings', label: 'Settings', icon: 'settings' }
        ]}
        centerAction={
          <button 
            onClick={() => onNavigate('NEW_COMPLAINT')}
            className="size-16 bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(79,70,229,0.4)] border-4 border-[#f0f4f8] transform -translate-y-4 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined !text-3xl">add</span>
          </button>
        }
      />
    </div>
  );
};

export default CitizenDashboard;
