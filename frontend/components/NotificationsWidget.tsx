import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../apiClient';

type MyNotification = {
  id: number;
  message: string;
  createdAt: string;
  readAt: string | null;
  complaintId?: number | null;
};

export const NotificationsWidget: React.FC<{
  bellClassName?: string;
}> = ({ bellClassName }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<MyNotification[]>([]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications]
  );

  const fetchNotifications = async () => {
    setError(null);
    try {
      const data = await apiRequest<MyNotification[]>('/api/notifications');
      setNotifications(data);
    } catch (e: any) {
       if (e?.message !== "No token provided") throw e;
    }
  };

  const knownIdsRef = React.useRef<Set<number>>(new Set());
  const initialLoadRef = React.useRef(true);

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
       Notification.requestPermission();
    }
  }, []);

  const fetchNotificationsPoll = async () => {
    try {
      const data = await apiRequest<MyNotification[]>('/api/notifications');
      
      if (!initialLoadRef.current) {
         // Check for new notifications
         const newNotifications = data.filter(n => !knownIdsRef.current.has(n.id) && !n.readAt);
         newNotifications.forEach(n => {
            if ("Notification" in window && Notification.permission === "granted") {
               new Notification("Civic Pulse Update", {
                  body: n.message,
                  icon: "/favicon.ico" // standard fallback
               });
            }
         });
      }
      
      data.forEach(n => knownIdsRef.current.add(n.id));
      initialLoadRef.current = false;
      setNotifications(data);
    } catch (e: any) {
       if (e?.message !== "No token provided") throw e;
    }
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchNotificationsPoll()
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(e?.message ?? 'Failed to load notifications');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    void fetchNotificationsPoll();
    const handle = window.setInterval(() => {
       fetchNotificationsPoll().catch(() => {});
    }, 15000); // 15 sec polling
    return () => window.clearInterval(handle);
  }, []);

  const markAllRead = async () => {
    await apiRequest('/api/notifications/read-all', { method: 'PATCH' });
    await fetchNotifications();
  };

  const portalContent = open ? (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Absolute Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => setOpen(false)}
      ></div>

      {/* Centered Premium Modal */}
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] animate-in zoom-in-95 fade-in duration-300 relative z-10 border border-slate-100">
        
        {/* Header Ribbon */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-2xl rounded-full transform translate-x-10 -translate-y-10"></div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600">notifications_active</span>
              Activity Feed
            </h3>
            <p className="text-sm font-bold text-slate-500 mt-1">
              You have {unreadCount} unread system pings
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10">
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-black text-indigo-700 uppercase tracking-widest px-4 py-2.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 disabled:opacity-50 transition-colors shadow-sm"
              disabled={notifications.length === 0 || notifications.every((n) => !!n.readAt)}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="size-10 rounded-full hover:bg-slate-200 bg-white shadow-sm flex items-center justify-center border border-slate-200 transition-colors text-slate-600 hover:text-slate-900"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Matrix */}
        <div className="px-6 py-4 h-[50vh] min-h-[300px] overflow-y-auto bg-slate-50 space-y-3">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-indigo-400">sync</span>
                <p className="text-sm font-bold">Loading Alerts...</p>
             </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700 text-sm font-medium">
              <span className="material-symbols-outlined shrink-0">error</span>
              <p>{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="size-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                 <span className="material-symbols-outlined text-4xl text-slate-300">notifications_paused</span>
              </div>
              <p className="text-slate-500 font-bold">No Notifications</p>
              <p className="text-xs text-slate-400 mt-1">You're all caught up.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUrgent = n.message.toLowerCase().includes('critical') || n.message.toLowerCase().includes('high');

              return (
                <div
                  key={n.id}
                  className={`group p-4 rounded-2xl border transition-all ${
                    n.readAt 
                       ? 'bg-white border-slate-200 shadow-sm' 
                       : isUrgent
                          ? 'bg-red-50 border-red-200 shadow-sm ring-2 ring-red-500/10'
                          : 'bg-indigo-50 border-indigo-200 shadow-sm ring-2 ring-indigo-500/10'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 flex items-center justify-center size-10 rounded-full shrink-0 shadow-inner ${n.readAt ? 'bg-slate-100 text-slate-400' : isUrgent ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white text-indigo-600 border-indigo-100'}`}>
                      <span className="material-symbols-outlined text-[18px]">
                        {isUrgent ? 'warning' : 'circle_notifications'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                         {n.complaintId && (
                           <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${n.readAt ? 'bg-slate-200 text-slate-500' : isUrgent ? 'bg-red-200 text-red-800' : 'bg-indigo-200 text-indigo-800'}`}>
                             Ref #{n.complaintId}
                           </span>
                         )}
                         {!n.readAt && (
                           <span className="flex h-2 w-2 relative">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                           </span>
                         )}
                      </div>
                      <p className={`text-sm tracking-tight ${n.readAt ? 'text-slate-600 font-semibold' : 'text-slate-900 font-black'}`}>
                        {n.message}
                      </p>
                      <p className="text-xs text-slate-400 font-medium mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        {new Date(n.createdAt).toLocaleString(undefined, {
                           month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          bellClassName ??
          'relative flex size-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm'
        }
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 ? (
          <span
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center"
            title={`${unreadCount} unread`}
          >
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full size-3 bg-red-500 border-2 border-white"></span>
          </span>
        ) : null}
      </button>

      {/* Render overlay at root document body to escape absolutely all z-index traps natively */}
      {typeof document !== 'undefined' && createPortal(portalContent, document.body)}
    </>
  );
};
