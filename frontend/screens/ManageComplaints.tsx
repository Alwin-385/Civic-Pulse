import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../apiClient';
import { NotificationsWidget } from '../components/NotificationsWidget';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format as formatDate } from 'date-fns';

interface ManageComplaintsProps {
  onBack: () => void;
}

const ManageComplaints: React.FC<ManageComplaintsProps> = ({ onBack }) => {
  type StatusHistoryItem = {
    status: string;
    note?: string | null;
    createdAt: string;
    updatedBy?: { id: number, name: string, role: string } | null;
  };

  type ApiStaff = {
    id: number;
    name: string;
    role: string;
    status: string;
    workload: number;
    maxWorkload: number;
    location?: string | null;
    avatarUrl?: string | null;
    department?: { name: string };
  };

  type ApiComplaint = {
    id: number;
    title: string;
    description: string;
    location: string;
    latitude?: number;
    longitude?: number;
    imageUrl?: string | null;
    severity: string;
    status: string;
    createdAt: string;
    department?: { name: string };
    user?: { id: number; name: string; email: string; phone?: string | null };
    assignedStaff?: ApiStaff | null;
    statusHistory: StatusHistoryItem[];
    feedback?: { rating: number; comment?: string | null } | null;
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<ApiComplaint[]>([]);
  const [staff, setStaff] = useState<ApiStaff[]>([]);
  const [query, setQuery] = useState('');
  
  // Advanced Filters
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | 'KSEB' | 'PWD'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [timeframeFilter, setTimeframeFilter] = useState<string>('all');
  
  const [userEmail, setUserEmail] = useState('');

  const [reviewComplaint, setReviewComplaint] = useState<ApiComplaint | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const [assignStaffId, setAssignStaffId] = useState<number | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>('ACKNOWLEDGED');
  const [note, setNote] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
      if (timeframeFilter !== 'all') queryParams.append('timeframe', timeframeFilter);

      const [staffRes, complaintsRes, meRes] = await Promise.all([
        apiRequest<ApiStaff[]>('/api/staff').catch(() => []),
        apiRequest<ApiComplaint[]>(`/api/complaints?${queryParams.toString()}`),
        apiRequest<{ user: { email: string } }>('/api/auth/me'),
      ]);
      setStaff(staffRes);
      setComplaints(complaintsRes);
      
      const email = (meRes.user?.email || '').toLowerCase();
      setUserEmail(email);
      if (email.includes('kseb')) setDepartmentFilter('KSEB');
      else if (email.includes('pwd')) setDepartmentFilter('PWD');

    } catch (e: any) {
      if (e?.message !== "No token provided") {
         setError(e?.message ?? 'Failed to load complaints');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [statusFilter, timeframeFilter]);

  const filteredComplaints = useMemo(() => {
    const q = query.trim().toLowerCase();
    const deptBase =
      departmentFilter === 'ALL' ? complaints : complaints.filter((c) => (c.department?.name ?? '') === departmentFilter);

    if (!q) return [...deptBase].sort((a,b) => {
      const aCrit = (a.severity === 'CRITICAL' || a.severity === 'HIGH') ? 1 : 0;
      const bCrit = (b.severity === 'CRITICAL' || b.severity === 'HIGH') ? 1 : 0;
      return bCrit - aCrit;
    });

    const filtered = deptBase.filter((c) => {
      const dept = c.department?.name ?? '';
      return (
        String(c.id).includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
      );
    });

    return filtered.sort((a,b) => {
      const aCrit = (a.severity === 'CRITICAL' || a.severity === 'HIGH') ? 1 : 0;
      const bCrit = (b.severity === 'CRITICAL' || b.severity === 'HIGH') ? 1 : 0;
      return bCrit - aCrit;
    });
  }, [complaints, query, departmentFilter]);

  const openReview = (c: ApiComplaint) => {
    setReviewComplaint(c);
    setReviewOpen(true);
    setAssignStaffId(c.assignedStaff?.id ?? null);
    setUpdateStatus(c.status === 'REPORTED' ? 'ACKNOWLEDGED' : c.status === 'ACKNOWLEDGED' ? 'IN_PROGRESS' : c.status === 'DISPATCHED' ? 'IN_PROGRESS' : 'RESOLVED');
    setNote('');
  };

  const assignToStaff = async () => {
    if (!reviewComplaint || !assignStaffId) return;
    await apiRequest('/api/assignments', {
      method: 'POST',
      body: { complaintId: reviewComplaint.id, staffId: assignStaffId },
    });
    await refresh();
    setReviewOpen(false);
  };

  const updateStatusForComplaint = async () => {
    if (!reviewComplaint) return;
    await apiRequest(`/api/complaints/${reviewComplaint.id}/status`, {
      method: 'PATCH',
      body: { status: updateStatus, note: note.trim() || undefined },
    });
    await refresh();
    setReviewOpen(false);
  };

  const exportComplaintPdf = () => {
    if (!reviewComplaint) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text(`Official Complaint Report`, 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text(`Civic Pulse Network - Record #${reviewComplaint.id}`, 14, 28);
      doc.text(`Generated on: ${formatDate(new Date(), 'PPPP')}`, 14, 34);

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Complaint Overview:', 14, 45);
      
      const detailsBody = [
        ['Title:', reviewComplaint.title],
        ['Department:', reviewComplaint.department?.name || 'ALL GRID'],
        ['Severity:', reviewComplaint.severity],
        ['Status:', reviewComplaint.status],
        ['Created:', formatDate(new Date(reviewComplaint.createdAt), 'PPPpp')],
        ['Description:', reviewComplaint.description || 'No additional details provided.']
      ];

      autoTable(doc, {
        startY: 50,
        margin: { left: 14 },
        theme: 'plain',
        body: detailsBody,
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 
          0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 35 },
          1: { textColor: [15, 23, 42] }
        }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 10;
      
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Location & Citizen Data:', 14, currentY);

      const locBody = [
        ['Address:', reviewComplaint.location],
        ['Coordinates:', reviewComplaint.latitude ? `LAT: ${reviewComplaint.latitude}, LON: ${reviewComplaint.longitude}` : 'No exact GPS array detected']
      ];

      if (reviewComplaint.user) {
         locBody.push(['Reporting Citizen:', `${reviewComplaint.user.name} (${reviewComplaint.user.email})`]);
      } else {
         locBody.push(['Reporting Citizen:', 'System Guest / Unknown']);
      }

      if (reviewComplaint.assignedStaff) {
         locBody.push(['Assigned Official:', `${reviewComplaint.assignedStaff.name} [${reviewComplaint.assignedStaff.role}]`]);
         if ((reviewComplaint.assignedStaff as any).phone) {
           locBody.push(['Official Contact:', (reviewComplaint.assignedStaff as any).phone]);
         }
      }

      autoTable(doc, {
        startY: currentY + 5,
        margin: { left: 14 },
        theme: 'plain',
        body: locBody,
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 
          0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 35 },
          1: { textColor: [15, 23, 42] }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
      
      if (reviewComplaint.statusHistory && reviewComplaint.statusHistory.length > 0) {
         doc.setFontSize(14);
         doc.setTextColor(15, 23, 42);
         doc.text('Full Secure Timeline Matrix:', 14, currentY);
         
         const historyBody = reviewComplaint.statusHistory.map(h => [
           formatDate(new Date(h.createdAt), 'MMM d, h:mm a'),
           h.status,
           h.updatedBy ? `${h.updatedBy.name}\n(${h.updatedBy.role})` : 'System Matrix',
           h.note || '-'
         ]);
         
         autoTable(doc, {
            startY: currentY + 5,
            head: [['Timestamp', 'Phase', 'Updated By', 'Official Notes']],
            body: historyBody,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 9 }
         });
         
         currentY = (doc as any).lastAutoTable.finalY + 10;
      }
      
      if (reviewComplaint.feedback) {
         doc.setFontSize(14);
         doc.text('Citizen Audit Feedback:', 14, currentY);
         doc.setFontSize(10);
         doc.setTextColor(71, 85, 105);
         doc.text(`Satisfaction Rating: ${reviewComplaint.feedback.rating} / 5 Stars`, 14, currentY + 7);
         doc.text(`Closing Comments: "${reviewComplaint.feedback.comment || 'N/A'}"`, 14, currentY + 13);
         currentY += 25;
      }

      // Audit Signature Block
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text('_________________________________', 14, currentY + 15);
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Verified by Civic Pulse System Kernel', 14, currentY + 20);
      doc.text(`Executing Official: ${userEmail.split('@')[0].toUpperCase()}`, 14, currentY + 25);
      doc.text(`Network Timestamp: ${formatDate(new Date(), 'PPpp')}`, 14, currentY + 30);

      doc.save(`CivicPulse_OfficialReport_${reviewComplaint.id}.pdf`);
    } catch (e) {
      alert('Failed to construct Official PDF locally.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f0f4f8] font-sans h-full shadow-2xl overflow-hidden relative">
      
      {/* Premium Glass Header */}
      <header className="shrink-0 z-20 pb-2">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-5 pt-8 pb-10 shadow-2xl transition-all duration-300 rounded-b-3xl relative overflow-hidden">
             
          <div className="absolute top-[-30%] left-[-10%] w-60 h-60 bg-indigo-500/30 blur-[80px] rounded-full pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center justify-between mb-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <button 
                 onClick={onBack} 
                 className="flex items-center justify-center size-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition-all transform hover:-translate-x-1"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">Manage Complaints</h1>
                <p className="text-indigo-200 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-0.5">
                  {loading ? 'Loading...' : `${complaints.filter((c) => c.status !== 'RESOLVED').length} ACTIVE COMPLAINTS`}
                </p>
              </div>
            </div>
            
            <div className="relative z-50">
               <NotificationsWidget 
                  bellClassName="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-colors border border-white/10 shadow-lg relative"
               />
            </div>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 text-xl">search</span>
            <input
              className="w-full bg-white/10 backdrop-blur-md border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:ring-2 focus:ring-indigo-400/50 outline-none placeholder:text-indigo-200/70 font-medium shadow-inner transition-all"
              placeholder="Search ID, title, or locale..."
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          
          {!userEmail.includes('kseb') && !userEmail.includes('pwd') && (
            <div className="flex p-1 bg-white/5 backdrop-blur-sm rounded-xl mt-4 border border-white/10 shadow-inner max-w-7xl mx-auto">
              <button
                onClick={() => setDepartmentFilter('ALL')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  departmentFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:text-white'
                }`}
              >
                Global
              </button>
              <button
                onClick={() => setDepartmentFilter('KSEB')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  departmentFilter === 'KSEB' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:text-white'
                }`}
              >
                KSEB Division
              </button>
              <button
                onClick={() => setDepartmentFilter('PWD')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  departmentFilter === 'PWD' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:text-white'
                }`}
              >
                PWD Division
              </button>
            </div>
          )}

          {/* Advanced Filters */}
          <div className="flex items-center gap-3 mt-4 max-w-7xl mx-auto overflow-x-auto pb-2 scrollbar-none">
             <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white/10 backdrop-blur-md border border-white/10 text-white text-[11px] font-bold py-2.5 px-4 rounded-xl outline-none shadow-sm cursor-pointer hover:bg-white/20 transition-all appearance-none"
             >
                <option value="ALL" className="text-slate-900 font-bold">All Phases</option>
                <option value="REPORTED" className="text-slate-900 font-bold">Reported</option>
                <option value="ACKNOWLEDGED" className="text-slate-900 font-bold">Acknowledged</option>
                <option value="DISPATCHED" className="text-slate-900 font-bold">Dispatched</option>
                <option value="IN_PROGRESS" className="text-slate-900 font-bold">In Progress</option>
                <option value="RESOLVED" className="text-slate-900 font-bold">Resolved</option>
             </select>

             <select 
                value={timeframeFilter}
                onChange={(e) => setTimeframeFilter(e.target.value)}
                className="bg-white/10 backdrop-blur-md border border-white/10 text-white text-[11px] font-bold py-2.5 px-4 rounded-xl outline-none shadow-sm cursor-pointer hover:bg-white/20 transition-all appearance-none"
             >
                <option value="all" className="text-slate-900 font-bold">All Time</option>
                <option value="day" className="text-slate-900 font-bold">Last 24 Hours</option>
                <option value="week" className="text-slate-900 font-bold">Past Week</option>
                <option value="month" className="text-slate-900 font-bold">Past Month</option>
             </select>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-12 z-10 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {error && (
              <div className="mb-4 p-4 col-span-full bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700 text-sm font-medium animate-in fade-in zoom-in-95 shadow-sm">
                <span className="material-symbols-outlined shrink-0 text-red-500">error</span>
                <p>{error}</p>
              </div>
          )}

          {filteredComplaints.length === 0 && !loading && (
             <div className="col-span-full bg-white/60 border border-slate-200 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-sm backdrop-blur-sm mt-4">
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">fact_check</span>
                <p className="text-slate-500 font-bold">No Records Found</p>
                <p className="text-slate-400 text-xs font-medium mt-1">Adjust filters or search parameters.</p>
             </div>
          )}

          {filteredComplaints.map((complaint) => {
            const deptName = complaint.department?.name ?? 'DEPT';
            const isReported = complaint.status === 'REPORTED';
            const dotIsHigh = ['HIGH', 'CRITICAL'].includes((complaint.severity ?? '').toUpperCase());

            return (
            <div 
               key={complaint.id} 
               onClick={() => openReview(complaint)}
               className={`group bg-white rounded-2xl p-4 shadow-sm border flex gap-4 cursor-pointer hover:shadow-md transition-all ${dotIsHigh && isReported ? 'border-red-500/50 hover:border-red-500 ring-4 ring-red-500/5' : 'border-slate-100 hover:border-indigo-200'}`}
            >
              <div className="w-20 h-28 md:h-24 rounded-xl overflow-hidden shrink-0 bg-slate-100 relative shadow-inner">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src={complaint.imageUrl ?? 'https://picsum.photos/seed/complaint/200/300'}
                  alt={complaint.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                {dotIsHigh && isReported && (
                  <div className="absolute inset-0 border-[3px] border-red-500/80 animate-pulse pointer-events-none rounded-xl" />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col pt-1 pb-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-sm ${deptName === 'KSEB' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                      {deptName}
                    </span>
                    {dotIsHigh && isReported && (
                      <span className="bg-gradient-to-r from-red-600 to-rose-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-lg shadow-sm animate-pulse">
                        Urgent
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {isReported ? (
                      <>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                        </span>
                        <span className="text-[10px] hidden sm:inline font-bold text-amber-600 tracking-wide uppercase">Open</span>
                      </>
                    ) : complaint.status === 'RESOLVED' ? (
                      <>
                        <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                        <span className="text-[10px] hidden sm:inline font-bold text-emerald-600 tracking-wide uppercase">Resolved</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[14px] text-indigo-500">engineering</span>
                        <span className="text-[10px] hidden sm:inline font-bold text-indigo-600 tracking-wide uppercase">Active</span>
                      </>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                  {complaint.title}
                </h3>
                
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1 line-clamp-1 mb-auto">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {complaint.location.length > 25 ? complaint.location.substring(0,25) + '...' : complaint.location}
                </p>

                <div className="flex items-center justify-between mt-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <span>ID: #{complaint.id}</span>
                  <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </main>

      {/* Extreme Review Modal */}
      {reviewOpen && reviewComplaint && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl sm:max-h-[85vh] max-h-[95vh] sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-500 ease-out border border-white/20 relative">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
              <div className="flex items-center gap-3">
                 <div className="size-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                    <span className="material-symbols-outlined text-indigo-600">admin_panel_settings</span>
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Review Complaint</h3>
                    <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">ID #{reviewComplaint.id}</p>
                 </div>
              </div>
              <button onClick={() => setReviewOpen(false)} className="size-10 bg-slate-50 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-6 no-scrollbar relative">
              <div className="max-w-xl mx-auto space-y-6">
                
                {/* Core Record */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl group-hover:bg-indigo-50/50 transition-colors"></div>
                   <div className="relative z-10">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <h4 className="text-lg font-bold text-slate-900">{reviewComplaint.title}</h4>
                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider self-start sm:self-auto ${reviewComplaint.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {reviewComplaint.status.replace('_', ' ')}
                        </span>
                     </div>
                     <p className="text-sm font-medium text-slate-600 mb-6">{reviewComplaint.description}</p>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                           <span className="block text-[10px] tracking-widest uppercase text-slate-400 font-bold mb-1">Locality</span>
                           <span className="text-xs font-bold text-slate-800">{reviewComplaint.location}</span>
                        </div>
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                           <span className="block text-[10px] tracking-widest uppercase text-slate-400 font-bold mb-1">Severity</span>
                           <span className="text-xs font-bold text-slate-800">{reviewComplaint.severity}</span>
                        </div>
                     </div>
                   </div>
                </div>

                {/* Citizen Feedback Plaque (Only if feedback exists) */}
                {reviewComplaint.feedback && (
                  <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl p-6 shadow-md shadow-indigo-600/20 relative overflow-hidden">
                     <div className="absolute right-[-10%] bottom-[-20%] w-40 h-40 bg-white/10 blur-3xl rounded-full"></div>
                     <div className="relative z-10 flex flex-col gap-2">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-black text-indigo-50 uppercase tracking-widest">Citizen Audit Matrix</h4>
                          <div className="flex gap-1 text-amber-400">
                            {[1, 2, 3, 4, 5].map(star => (
                              <span key={star} className="material-symbols-outlined text-[18px]">
                                {star <= (reviewComplaint.feedback?.rating ?? 0) ? 'star' : 'star_border'}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-white text-sm font-medium italic">
                           "{reviewComplaint.feedback.comment || 'No visual comments provided by citizen.'}"
                        </p>
                     </div>
                  </div>
                )}

                {/* Assignment Engine */}
                {!reviewComplaint.assignedStaff && reviewComplaint.status !== 'RESOLVED' && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 border-l-4 border-l-amber-500 relative">
                    <h4 className="text-sm font-black text-slate-900 mb-3 tracking-tight flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-500">warning</span>
                      Deploy Field Engineer
                    </h4>
                    <div className="space-y-3">
                      <div className="relative">
                         <select
                           className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 block p-3.5 appearance-none shadow-inner transition-all"
                           value={assignStaffId || ''}
                           onChange={(e) => setAssignStaffId(Number(e.target.value))}
                         >
                           <option value="" disabled>Select available engineer...</option>
                           {staff
                             .filter(s => (s.department?.name || '') === (reviewComplaint.department?.name || ''))
                             .map((s) => (
                             <option key={s.id} value={s.id}>
                               {s.name} (Load: {s.workload}/{s.maxWorkload}) - {s.status}
                             </option>
                           ))}
                         </select>
                         <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={assignToStaff}
                        disabled={!assignStaffId}
                        className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-slate-800 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">engineering</span>
                        Dispatch Personnel
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <h4 className="text-sm font-black text-slate-900 mb-3 tracking-tight">Update Status</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                         <select
                           className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 block p-3.5 appearance-none"
                           value={updateStatus}
                           onChange={(e) => setUpdateStatus(e.target.value)}
                         >
                           <option value="ACKNOWLEDGED">Acknowledged</option>
                           <option value="IN_PROGRESS">In Progress</option>
                           <option value="RESOLVED">Resolved</option>
                         </select>
                         <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                      </div>
                      <button
                        type="button"
                        onClick={updateStatusForComplaint}
                        className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                      >
                        Update
                      </button>
                    </div>
                    <textarea
                      placeholder="Attach additional notes (optional)..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl p-3.5 min-h-[100px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Secure Audit Trails */}
                {reviewComplaint.statusHistory && reviewComplaint.statusHistory.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mt-4">
                    <h4 className="text-sm font-black text-slate-900 mb-4 tracking-tight flex items-center gap-2">
                       <span className="material-symbols-outlined text-indigo-500">history</span>
                       Official Audit Logs
                    </h4>
                    <div className="relative border-l-2 border-slate-100 ml-3 space-y-4">
                       {reviewComplaint.statusHistory.map((history, idx) => (
                          <div key={idx} className="relative pl-6">
                            {/* Node Ping */}
                            <div className="absolute -left-[5px] top-1.5 size-[8px] bg-indigo-500 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,1),_0_0_0_4px_rgba(99,102,241,0.2)]"></div>
                            
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-black text-indigo-600 tracking-wider uppercase">{history.status.replace('_', ' ')}</span>
                                <span className="text-[10px] items-center flex gap-1 font-bold text-slate-400 bg-slate-100 px-2 rounded-md">
                                  <span className="material-symbols-outlined text-[10px]">schedule</span>
                                  {formatDate(new Date(history.createdAt), 'MMM d, h:mm a')}
                                </span>
                            </div>
                            
                            <p className="text-xs text-slate-600 font-medium">{history.note || "System processed status alignment."}</p>
                            
                            {history.updatedBy && (
                               <p className="text-[10px] mt-1.5 font-bold text-slate-400 flex items-center gap-1 bg-slate-50 border border-slate-100 max-w-fit px-2 py-0.5 rounded-lg shadow-inner">
                                  <span className="material-symbols-outlined text-[11px] text-slate-300">verified_user</span>
                                  Executed securely by: {history.updatedBy.name} ({history.updatedBy.role})
                               </p>
                            )}
                          </div>
                       ))}
                    </div>
                  </div>
                )}

                {/* PDF Export Button (Local Generator) */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={exportComplaintPdf}
                    disabled={isExporting}
                    className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl shadow-sm hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-700 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
                  >
                    <span className="material-symbols-outlined group-hover:-translate-y-1 transition-transform">picture_as_pdf</span>
                    {isExporting ? 'Generating PDF...' : 'Export to PDF'}
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageComplaints;
