import React, { useEffect, useMemo, useState } from 'react';
import { Header, BottomNav } from '../components/Layout';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, PieChart, Pie, Tooltip } from 'recharts';
import { apiRequest } from '../apiClient';
import { NotificationsWidget } from '../components/NotificationsWidget';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';

const BAR_DATA = [
  { name: 'JAN', value: 40 },
  { name: 'FEB', value: 55 },
  { name: 'MAR', value: 45 },
  { name: 'APR', value: 70 },
  { name: 'MAY', value: 85 },
  { name: 'JUN', value: 60 },
];

const DEPT_COLORS: Record<string, string> = {
  KSEB: '#f59e0b', // Amber 500
  PWD: '#3b82f6',  // Blue 500
};

interface OfficialDashboardProps {
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}

const OfficialDashboard: React.FC<OfficialDashboardProps> = ({ onNavigate, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>('...');
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState<null | {
    totalComplaints: number;
    resolvedComplaints: number;
    pendingComplaints: number;
    totalStaff: number;
    complaintsByDepartment: Array<{ name: string; _count: { complaints: number } }>;
  }>(null);

  const [complaintList, setComplaintList] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiRequest<typeof stats>('/api/reports/dashboard'),
      apiRequest<any[]>('/api/complaints')
    ])
      .then(([statsData, complaintsData]) => {
        setStats(statsData as any);
        setComplaintList(complaintsData);
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load dashboard stats'))
      .finally(() => setLoading(false));
  }, []);

  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    apiRequest<{ user: { name: string; email: string } }>('/api/auth/me')
      .then((data) => {
        setProfileName(data.user.name);
        setUserEmail(data.user.email.toLowerCase());
      })
      .catch(() => {});
  }, []);

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const isKseb = userEmail.includes('kseb');
      const isPwd = userEmail.includes('pwd');
      const deptTag = isKseb ? 'KSEB' : isPwd ? 'PWD' : 'ALL';
      
      const filtered = deptTag === 'ALL' 
        ? complaintList 
        : complaintList.filter(c => (c.department?.name || '').toUpperCase() === deptTag);

      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(24);
      doc.setTextColor(30, 41, 59);
      doc.text('Complaint System Report', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${format(new Date(), 'PPPP')}`, 14, 30);
      doc.text(`Scope: ${deptTag} Division Analytics`, 14, 35);
      
      // Summary Metrics (Page 1)
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Summary Metrics:', 14, 45);

      const resolved = filtered.filter(c => c.status === 'RESOLVED').length;
      const pending = filtered.length - resolved;
      const critical = filtered.filter(c => c.severity === 'CRITICAL' || c.severity === 'HIGH').length;

      const metricsBody = [
        ['Total Complaints Extracted', String(filtered.length)],
        ['Resolved Complaints', String(resolved)],
        ['Pending / Active Complaints', String(pending)],
        ['Critical Priority Triggers', String(critical)]
      ];

      autoTable(doc, {
        startY: 50,
        margin: { left: 14 },
        theme: 'plain',
        body: metricsBody,
        styles: { fontSize: 11, cellPadding: 2 },
        columnStyles: { 
          0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 80 },
          1: { textColor: [15, 23, 42] }
        }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 15;

      // Charts Snapshot
      const chartsEl = document.getElementById('analytics-charts-wrapper');
      if (chartsEl) {
         try {
           doc.setFontSize(14);
           doc.text('Analytic Visualizations:', 14, currentY);
           currentY += 8;
           const canvas = await html2canvas(chartsEl, { scale: 1.5, useCORS: true, logging: false });
           const imgData = canvas.toDataURL('image/png');
           
           // calculate aspect ratio for A4 width (which is 210mm)
           const printWidth = 180;
           const printHeight = (canvas.height * printWidth) / canvas.width;
           
           if (currentY + printHeight > 280) {
              doc.addPage();
              currentY = 20;
           }
           
           doc.addImage(imgData, 'PNG', 15, currentY, printWidth, printHeight);
           currentY += printHeight + 15;
         } catch (err) {
           console.warn('Canvas conversion failed, skipping visual charts', err);
         }
      }

      // Complaint Table Details
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Active Record Ledger (Top 25):', 14, currentY);

      const tableData = filtered.slice(0, 25).map(c => [
        `#${c.id}`,
        c.title.length > 25 ? c.title.substring(0, 25) + '...' : c.title,
        c.department?.name || 'N/A',
        c.status.replace('_', ' '),
        c.severity || 'N/A',
        format(new Date(c.createdAt), 'MMM d, yyyy')
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['ID', 'Issue Title', 'Dept', 'Status', 'Level', 'Reported On']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`Report generated natively by Civic Pulse Network - ${format(new Date(), 'PPpp')}`, 14, doc.internal.pageSize.getHeight() - 10);

      doc.save(`CivicPulse_${deptTag}_SystemReport_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (e) {
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const categoryData = useMemo(() => {
    if (!stats?.complaintsByDepartment) return [];
    return stats.complaintsByDepartment.map((d) => ({
      name: d.name,
      value: d._count.complaints,
      color: DEPT_COLORS[d.name] ?? '#94a3b8',
    }));
  }, [stats]);

  return (
    <div className="flex-1 flex flex-col bg-[#f0f4f8] font-sans">
      
      {/* Hero Container */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-20 pt-8 px-4 overflow-hidden rounded-b-3xl shadow-xl">
        <div className="absolute top-[-30%] left-[-10%] w-72 h-72 bg-indigo-500/20 blur-3xl rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-cyan-500/10 blur-3xl rounded-full"></div>
        
        <div className="relative z-10 flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tight">Welcome, {profileName}</h1>
            <p className="text-slate-400 text-sm font-medium">
               {userEmail.includes('kseb') ? 'KSEB Command Center' : 
                userEmail.includes('pwd') ? 'PWD Command Center' : 
                'System Analytics Matrix'}
            </p>
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

      <main className="flex-1 overflow-y-auto px-4 py-2 -mt-14 space-y-5 pb-32 z-10 relative">
        
        {/* Animated Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button className="flex h-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-5 text-white text-xs font-bold shadow-md shadow-indigo-600/30">Today</button>
          <button className="flex h-9 shrink-0 items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-slate-200 px-4 text-slate-600 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors">Last 7 Days</button>
          <button className="flex h-9 shrink-0 items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-slate-200 px-4 text-slate-600 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors">Monthly</button>
        </div>

        {/* Global Stats Matrix */}
        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="flex flex-col gap-2 rounded-2xl bg-white/90 backdrop-blur-xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-600/5 rounded-full blur-xl group-hover:bg-indigo-600/10 transition-colors"></div>
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Reports</p>
              <div className="size-6 bg-indigo-50 rounded-md flex items-center justify-center">
                 <span className="material-symbols-outlined text-indigo-600 text-[14px]">description</span>
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {loading ? '...' : stats ? stats.totalComplaints : 0}
            </p>
            <p className="text-emerald-500 text-[10px] font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">trending_up</span> +12.5%
            </p>
          </div>
          
          <div className="flex flex-col gap-2 rounded-2xl bg-white/90 backdrop-blur-xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-600/5 rounded-full blur-xl group-hover:bg-emerald-600/10 transition-colors"></div>
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Resolved</p>
              <div className="size-6 bg-emerald-50 rounded-md flex items-center justify-center">
                 <span className="material-symbols-outlined text-emerald-600 text-[14px]">check_circle</span>
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {loading ? '...' : stats ? stats.resolvedComplaints : 0}
            </p>
            <p className="text-emerald-500 text-[10px] font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">trending_up</span> +5.2%
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-white/90 backdrop-blur-xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-20 h-20 bg-amber-600/5 rounded-full blur-xl group-hover:bg-amber-600/10 transition-colors"></div>
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Pending</p>
              <div className="size-6 bg-amber-50 rounded-md flex items-center justify-center">
                 <span className="material-symbols-outlined text-amber-600 text-[14px]">pending_actions</span>
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {loading ? '...' : stats ? stats.pendingComplaints : 0}
            </p>
            <p className="text-amber-500 text-[10px] font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">trending_flat</span> 0.0%
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 p-5 shadow-md shadow-indigo-600/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-colors"></div>
             <div className="flex items-center justify-between relative z-10">
              <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider">Total Staff</p>
              <div className="size-6 bg-white/20 rounded-md flex items-center justify-center">
                 <span className="material-symbols-outlined text-white text-[14px]">group</span>
              </div>
            </div>
            <p className="text-3xl font-black text-white relative z-10">
              {loading ? '...' : stats ? stats.totalStaff : 0}
            </p>
            <p className="text-indigo-200 text-[10px] font-bold flex items-center relative z-10">
              Active workforce
            </p>
          </div>
        </div>

        {/* Analytics Charts */}
        <div id="analytics-charts-wrapper" className="space-y-4">
          <div className="rounded-2xl bg-white/90 backdrop-blur-xl p-5 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <div className="flex items-center justify-between mb-6">
            <div>
               <h3 className="text-slate-900 text-base font-black tracking-tight">Issue Trends</h3>
               <p className="text-xs text-slate-500 font-medium mt-0.5">Monthly complaint volume</p>
            </div>
            <button className="size-8 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center transition-colors">
               <span className="material-symbols-outlined text-sm text-slate-600">more_horiz</span>
            </button>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BAR_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={28}>
                  {BAR_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 5 ? '#4f46e5' : '#e2e8f0'} />
                  ))}
                </Bar>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Map */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <div className="rounded-2xl bg-white/90 backdrop-blur-xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-slate-900 text-base font-black tracking-tight mb-4">Divisional Load</h3>
            <div className="flex items-center gap-6">
              <div className="relative size-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Total</p>
                  <p className="text-xl font-black text-slate-900">{stats?.totalComplaints || 0}</p>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {categoryData.map((cat, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="size-3 rounded-full mt-1 shrink-0 shadow-inner" style={{ backgroundColor: cat.color }}></div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-none">{cat.name}</p>
                      <p className="text-xs text-slate-500 font-medium mt-1">{cat.value} Issues</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/90 backdrop-blur-xl p-4 shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 text-base font-black tracking-tight">Geo-Spatial Analysis</h3>
              <span className="material-symbols-outlined text-indigo-600 text-xl">map</span>
            </div>
            <div className="relative w-full flex-1 min-h-[300px] rounded-xl overflow-hidden bg-slate-100 z-0">
               <MapContainer 
                  center={[10.8505, 76.2711]} // Kerala Center By Default
                  zoom={7} 
                  style={{ height: '100%', width: '100%' }}
                  attributionControl={false}
               >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  {complaintList.filter(c => c.latitude && c.longitude).map(c => {
                      const color = c.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.9)' : 
                                    (c.severity === 'Critical' || c.severity === 'High') ? 'rgba(239, 68, 68, 0.9)' : 
                                    'rgba(245, 158, 11, 0.9)';
                      
                      const customMarker = L.divIcon({
                          className: 'custom-pin',
                          html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 0 4px rgba(255,255,255,0.8), 0 4px 6px rgba(0,0,0,0.3);"></div>`,
                          iconSize: [14, 14],
                          iconAnchor: [7, 7]
                      });

                      return (
                         <Marker key={c.id} position={[c.latitude, c.longitude]} icon={customMarker}>
                            <Popup className="rounded-xl border-none">
                               <div className="p-1">
                                  <span className="text-[9px] uppercase font-bold text-slate-500">{c.department?.name || 'SYS'}</span>
                                  <h4 className="font-bold text-sm text-slate-900 leading-tight mt-0.5">{c.title}</h4>
                                  <p className="text-xs text-slate-500 mt-1">{c.status}</p>
                               </div>
                            </Popup>
                         </Marker>
                      );
                  })}
               </MapContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Global Export Engine */}
        <div className="pt-2 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          <button 
             onClick={handleExportPdf}
             disabled={isExporting}
             className="w-full relative overflow-hidden bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-70 group shadow-xl shadow-slate-900/10"
          >
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
             <span className="material-symbols-outlined relative z-10 transition-transform group-hover:-translate-y-1">picture_as_pdf</span>
             <span className="relative z-10">{isExporting ? 'Generating Document...' : 'Generate Official Report (.pdf)'}</span>
          </button>
        </div>
      </main>

      <BottomNav 
        activeTab="analytics"
        onTabChange={(id) => {
          if (id === 'staff') onNavigate('MANAGE_STAFF');
          if (id === 'complaints') onNavigate('MANAGE_COMPLAINTS');
          if (id === 'analytics') onNavigate('DASHBOARD');
          if (id === 'settings') onNavigate('SETTINGS');
        }}
        tabs={[
          { id: 'complaints', label: 'Complaints', icon: 'dashboard_customize' },
          { id: 'analytics', label: 'Analytics', icon: 'monitoring' },
          { id: 'staff', label: 'Staff', icon: 'group' },
          { id: 'settings', label: 'Settings', icon: 'settings' }
        ]}
      />
    </div>
  );
};

export default OfficialDashboard;
