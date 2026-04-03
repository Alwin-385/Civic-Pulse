import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../apiClient';

export const MapView: React.FC<{
  onBack: () => void;
}> = ({ onBack }) => {
  const [role, setRole] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<
    Array<{ id: number; title: string; location: string; department?: { name: string } }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ user: { role: string } }>('/api/auth/me')
      .then((data) => setRole(data.user.role))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!role) return;
    setLoading(true);
    setError(null);
    const endpoint = role === 'CITIZEN' ? '/api/complaints/mine' : '/api/complaints';
    apiRequest<any[]>(endpoint)
      .then((data) => {
        setComplaints(
          data.map((c) => ({
            id: c.id,
            title: c.title,
            location: c.location,
            department: c.department,
          }))
        );
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load map data'))
      .finally(() => setLoading(false));
  }, [role]);

  const openMapsUrl = (location: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

  const filtered = useMemo(() => complaints.filter((c) => (c.location ?? '').trim().length > 0), [complaints]);

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto pb-24">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100">
            <span className="material-symbols-outlined text-primary">arrow_back_ios_new</span>
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Map</h1>
            <p className="text-xs text-slate-500">View complaint locations</p>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-bold">{loading ? 'Loading...' : `${filtered.length} pins`}</div>
      </header>

      <main className="px-4 py-6 space-y-4">
        {error ? <p className="text-sm text-red-600 font-semibold">{error}</p> : null}

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="w-full h-56 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100">
            <img
              src="https://picsum.photos/seed/civic-map/800/300"
              alt="Map placeholder"
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl px-4 py-2 text-center">
                <p className="text-sm font-bold text-slate-900">Map UI placeholder</p>
                <p className="text-xs text-slate-600">Pins open Google Maps with your location text.</p>
              </div>
            </div>
          </div>
        </div>

        <section className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500">No locations found.</p>
          ) : (
            filtered.slice(0, 20).map((c) => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">
                    {c.title} <span className="text-slate-500">#{c.id}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.location}</p>
                </div>
                <a
                  href={openMapsUrl(c.location)}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 bg-primary text-white font-bold text-xs px-3 py-2 rounded-xl"
                >
                  Open Maps
                </a>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
};

