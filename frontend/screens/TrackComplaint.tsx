import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../apiClient';
import { NotificationsWidget } from '../components/NotificationsWidget';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TrackComplaintProps {
  onBack: () => void;
}

type StatusHistoryItem = {
  status: string;
  note?: string | null;
  createdAt: string;
};

type ApiComplaint = {
  id: number;
  title: string;
  description: string;
  location: string;
  imageUrl?: string | null;
  severity: string;
  status: string;
  createdAt: string;
  department?: { name: string };
  assignedStaff?: { name: string; phone?: string | null; role?: string } | null;
  statusHistory: StatusHistoryItem[];
  feedback?: { rating: number; comment?: string | null } | null;
};

const statusToLabel = (status: string) => {
  switch (status) {
    case 'REPORTED':
      return 'Reported';
    case 'ACKNOWLEDGED':
      return 'Acknowledged';
    case 'DISPATCHED':
      return 'En Route';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'RESOLVED':
      return 'Resolved';
    default:
      return status;
  }
};

const TrackComplaint: React.FC<TrackComplaintProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<ApiComplaint[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchComplaints();
    const handle = window.setInterval(fetchComplaints, 10000); // Polling telemetry
    return () => window.clearInterval(handle);
  }, []);

  const fetchComplaints = async () => {
    try {
      if (complaints.length === 0) setLoading(true);
      setError(null);
      const data = await apiRequest<ApiComplaint[]>(`/api/complaints/mine`);
      setComplaints(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch tracking history');
    } finally {
      if (complaints.length === 0) setLoading(false);
    }
  };

  const selectedComplaint = useMemo(() => {
    return complaints.find(c => c.id === selectedId) || null;
  }, [complaints, selectedId]);

  const historyChronological = useMemo(() => {
    if (!selectedComplaint?.statusHistory) return [];
    return [...selectedComplaint.statusHistory].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [selectedComplaint]);

  const generateCitizenPDF = () => {
    const c = selectedComplaint;
    if (!c) return;
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text('Civic Pulse - Validation Report', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Record ID: #${c.id}`, 14, 30);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 35);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`Issue Title: ${c.title}`, 14, 45);
      doc.text(`Location: ${c.location}`, 14, 52);
      doc.text(`Severity: ${c.severity} | Intercepting Dept: ${c.department?.name || 'N/A'}`, 14, 59);

      let currentY = 66;

      if (c.assignedStaff) {
         doc.text(`Assigned Technician: ${c.assignedStaff.name} (${c.assignedStaff.phone || 'No phone provided'})`, 14, currentY);
      } else {
         doc.text(`Assigned Technician: Pending Dispatch`, 14, currentY);
      }

      autoTable(doc, {
        startY: 75,
        head: [['Date', 'Time', 'Phase', 'System Note']],
        body: c.statusHistory.map(h => {
             const d = new Date(h.createdAt);
             return [d.toLocaleDateString(), d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), statusToLabel(h.status), h.note || '-'];
        }),
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 75;
      
      if (c.feedback) {
         doc.text('Citizen Feedback Logging:', 14, finalY + 15);
         doc.setFontSize(10);
         doc.text(`Rating: ${c.feedback.rating} / 5 Stars`, 14, finalY + 22);
         doc.text(`Feedback Text: ${c.feedback.comment || 'N/A'}`, 14, finalY + 29);
      }

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Secure Document generated internally by Civic Pulse Network.', 14, 280);

      doc.save(`CivicPulse_Citizen_${c.id}.pdf`);
    } catch (e) {
      alert("Failed to compile internal Document. Please try again.");
    }
  };

  const submitFeedback = async () => {
    if (!selectedComplaint) return;
    setFeedbackLoading(true);
    setFeedbackMessage(null);
    try {
      await apiRequest(`/api/feedback/${selectedComplaint.id}`, {
        method: 'POST',
        body: { rating: feedbackRating, comment: feedbackComment },
      });
      setFeedbackMessage('Feedback successfully submitted. Thank you!');
      await fetchComplaints();
    } catch (e: any) {
      setFeedbackMessage(e?.message ?? 'Failed to submit feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f0f4f8] font-sans h-full shadow-2xl overflow-hidden relative">
      <header className="absolute top-0 inset-x-0 z-20 pb-4">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-5 pt-8 pb-8 shadow-2xl transition-all duration-300 rounded-b-3xl relative overflow-hidden">
          <div className="absolute top-[-20%] left-[20%] w-60 h-60 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <button 
                 onClick={() => { selectedId ? setSelectedId(null) : onBack() }} 
                 className="flex items-center justify-center size-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition-all transform hover:-translate-x-1"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                   {selectedId ? `Report #${selectedId}` : 'My Reports'}
                </h1>
                <p className="text-indigo-200 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-0.5">
                   {selectedId ? 'Live Tracking' : `${complaints.length} Reports Filed`}
                </p>
              </div>
            </div>
            
            <div className="relative z-50">
               <NotificationsWidget 
                  bellClassName="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-colors border border-white/10 shadow-lg relative"
               />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-36 pb-12 z-10 relative">
        <div className="max-w-4xl mx-auto h-full">

          {!selectedId ? (
            // Master List View
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
               {error && (
                 <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700 text-sm font-medium shadow-sm">
                   <span className="material-symbols-outlined shrink-0 text-red-500">error</span>
                   <p>{error}</p>
                 </div>
               )}

               {loading && complaints.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                   <span className="material-symbols-outlined animate-spin text-4xl mb-4 text-indigo-400">sync</span>
                   <p className="font-bold tracking-tight">Loading...</p>
                 </div>
               ) : complaints.length === 0 ? (
                 <div className="bg-white/60 border border-slate-200 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-sm backdrop-blur-sm mt-4">
                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">radar</span>
                    <p className="text-slate-500 font-bold">No Records Found</p>
                    <p className="text-slate-400 text-xs font-medium mt-1">You haven't filed any reports yet.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {complaints.map(c => {
                     const isResolved = c.status === 'RESOLVED';
                     return (
                       <div
                         key={c.id}
                         onClick={() => setSelectedId(c.id)}
                         className={`group bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden cursor-pointer hover:shadow-xl hover:border-indigo-200 transition-all duration-300 transform hover:-translate-y-1 ${isResolved ? 'opacity-80' : ''}`}
                       >
                         <div className="flex items-start gap-4 mb-4">
                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${isResolved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                             <span className="material-symbols-outlined text-[24px]">
                               {isResolved ? 'check_circle' : 'track_changes'}
                             </span>
                           </div>
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                               <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm ${c.department?.name === 'KSEB' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                 {c.department?.name || 'DEPT'}
                               </span>
                               <span className="text-[10px] font-bold text-slate-400">ID #{c.id}</span>
                             </div>
                             <h3 className="font-bold text-slate-900 text-lg mb-0.5 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                               {c.title}
                             </h3>
                             <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                               {statusToLabel(c.status)}
                             </p>
                           </div>
                         </div>
                         <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
                           <span className="flex items-center gap-1">
                             <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                             {new Date(c.createdAt).toLocaleDateString()}
                           </span>
                           <span className="group-hover:translate-x-1 transition-transform text-indigo-600 font-bold flex items-center gap-0.5">
                             Locate <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                           </span>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               )}
            </div>
          ) : selectedComplaint ? (
            // Detail / Telemetry View
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 pb-10">
              
              {/* Primary Node Graph */}
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row gap-6">
                   <div className="w-full md:w-1/3 aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 relative shadow-inner">
                      <img 
                        src={selectedComplaint.imageUrl || 'https://picsum.photos/seed/complaint/400/300'} 
                        className="w-full h-full object-cover"
                        alt="Issue" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                      <div className="absolute bottom-3 left-3 right-3">
                         <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-md ${selectedComplaint.status === 'RESOLVED' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                           {statusToLabel(selectedComplaint.status)}
                         </span>
                      </div>
                   </div>
                   <div className="flex-1 flex flex-col justify-center">
                      <div className="mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md mb-2 inline-block">
                          {selectedComplaint.department?.name || 'Department'} Action
                        </span>
                        <h2 className="text-2xl font-black text-slate-900 leading-tight mb-2">{selectedComplaint.title}</h2>
                        <p className="text-slate-600 text-sm font-medium mb-4">{selectedComplaint.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                           <span className="block text-[10px] tracking-widest uppercase text-slate-400 font-bold mb-1">Severity Levels</span>
                           <span className="text-xs font-bold text-slate-800">{selectedComplaint.severity} Priority</span>
                        </div>
                         <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                           <span className="block text-[10px] tracking-widest uppercase text-slate-400 font-bold mb-1">Time of Log</span>
                           <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                             {new Date(selectedComplaint.createdAt).toLocaleDateString()}
                           </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={generateCitizenPDF}
                        className="mt-4 w-full bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 hover:bg-slate-800"
                      >
                         <span className="material-symbols-outlined text-[18px]">download</span>
                         Download PDF Report
                      </button>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                
                {/* Visual Timeline Tracker */}
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600 text-[20px]">history</span>
                     Status History
                  </h3>
                  
                  <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-8 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-blue-500 before:to-slate-200">
                    {historyChronological.map((history, idx) => {
                      const isLast = idx === historyChronological.length - 1;
                      const isResolved = history.status === 'RESOLVED';
                      
                      return (
                        <div key={idx} className="relative flex items-center gap-4 group">
                          <div className={`absolute -left-9 h-6 w-6 rounded-full border-4 border-white flex items-center justify-center shrink-0 z-10 shadow-md ${isLast && !isResolved ? 'bg-indigo-600 animate-pulse ring-4 ring-indigo-500/20' : isResolved ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                             {isLast && !isResolved && <span className="h-2 w-2 bg-white rounded-full"></span>}
                             {isResolved && <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>}
                          </div>
                          <div className={`p-4 rounded-2xl flex-1 shadow-sm border ${isLast && !isResolved ? 'bg-indigo-50/50 border-indigo-100 ring-1 ring-indigo-500/10' : 'bg-slate-50 border-slate-100'}`}>
                             <div className="flex justify-between items-center mb-1">
                               <h4 className={`text-sm font-black uppercase tracking-widest ${isLast && !isResolved ? 'text-indigo-700' : isResolved ? 'text-emerald-700' : 'text-slate-700'}`}>
                                 {statusToLabel(history.status)}
                               </h4>
                               <span className="text-[10px] font-bold text-slate-400">
                                 {new Date(history.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                             </div>
                             <p className="text-xs font-medium text-slate-600 mt-1">{history.note || `Status updated to ${history.status}`}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Engineer Dispatch Panel */}
                  {selectedComplaint.status !== 'REPORTED' && selectedComplaint.status !== 'ACKNOWLEDGED' && (
                     <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                       <div className="absolute top-0 right-[-10%] w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                       
                       <div className="flex items-center gap-2 mb-4 relative z-10">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">Assigned Technician</h3>
                       </div>

                       {selectedComplaint.assignedStaff ? (
                         <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
                           <div className="flex items-center gap-3">
                             <div className="size-12 rounded-full bg-white/20 flex items-center justify-center text-white shadow-inner">
                               <span className="material-symbols-outlined">engineering</span>
                             </div>
                             <div className="flex-1">
                               <h4 className="text-lg font-bold text-white">{selectedComplaint.assignedStaff.name}</h4>
                               <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">Field Engineer</p>
                             </div>
                           </div>

                           {selectedComplaint.assignedStaff.phone ? (
                              <a 
                                href={`tel:${selectedComplaint.assignedStaff.phone}`} 
                                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                              >
                                <span className="material-symbols-outlined text-[18px]">call</span>
                                Contact {selectedComplaint.assignedStaff.phone}
                              </a>
                           ) : (
                              <p className="text-xs text-indigo-200 mt-2 bg-white/5 p-2 rounded-lg text-center">Contact number not provided.</p>
                           )}
                         </div>
                       ) : (
                         <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-3 text-white">
                           <div className="size-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                             <span className="material-symbols-outlined">pending</span>
                           </div>
                           <p className="text-sm font-bold">Pending Assignment...</p>
                         </div>
                       )}
                     </div>
                  )}

                  {/* Citizen Feedback Survey Array */}
                  {selectedComplaint.status === 'RESOLVED' && !selectedComplaint.feedback && (
                    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 relative overflow-hidden text-center flex flex-col items-center">
                      <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-amber-100 rounded-full blur-3xl pointer-events-none"></div>
                      
                      <div className="size-14 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-lg mb-4 relative z-10">
                        <span className="material-symbols-outlined text-2xl">star_rate</span>
                      </div>
                      
                      <h3 className="text-lg font-black text-slate-900 mb-1 relative z-10 tracking-tight">Submit Feedback</h3>
                      <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-5 relative z-10">Rate the resolution</p>

                      <div className="flex items-center justify-center gap-2 mb-6 relative z-10">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setFeedbackRating(star)}
                            className="p-1 hover:scale-110 active:scale-95 transition-transform drop-shadow-sm"
                          >
                            <span className={`material-symbols-outlined text-3xl ${star <= feedbackRating ? 'text-amber-400 drop-shadow-[0_2px_10px_rgba(251,191,36,0.5)]' : 'text-slate-200'}`}>
                              {star <= feedbackRating ? 'star' : 'star_rate'}
                            </span>
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Write your comments here..."
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-2xl p-4 min-h-[100px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 relative z-10 mb-4 transition-all"
                      />

                      {feedbackMessage && (
                        <p className={`text-xs font-bold mb-4 ${feedbackMessage.includes('Thank') ? 'text-emerald-600' : 'text-red-600'}`}>
                          {feedbackMessage}
                        </p>
                      )}

                      <button
                        onClick={submitFeedback}
                        disabled={feedbackLoading}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all relative z-10 active:scale-95 flex justify-center items-center gap-2"
                      >
                        {feedbackLoading ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">send</span>}
                        {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
                      </button>
                    </div>
                  )}

                  {selectedComplaint.feedback && (
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl p-6 shadow-xl relative overflow-hidden px-8 flex flex-col items-center text-center">
                       <span className="material-symbols-outlined text-[60px] text-white/20 absolute top-[-10%] right-[-5%] rotate-12 pointer-events-none">verified</span>
                       <div className="size-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white mb-3 shadow-inner">
                         <span className="material-symbols-outlined">thumb_up</span>
                       </div>
                       <h3 className="text-xl font-black text-white tracking-tight mb-1">Feedback Submitted</h3>
                       <p className="text-emerald-100 text-sm font-medium italic mb-3">"{selectedComplaint.feedback.comment || 'No comments provided'}"</p>
                       <div className="flex gap-1 text-amber-300">
                         {[1, 2, 3, 4, 5].map(star => (
                           <span key={star} className="material-symbols-outlined text-[16px]">
                             {star <= (selectedComplaint.feedback?.rating ?? 5) ? 'star' : 'star_border'}
                           </span>
                         ))}
                       </div>
                    </div>
                  )}
                 </div>

              </div>
            </div>
          ) : (
             <div className="text-center py-20 text-slate-500 font-bold">Record not found.</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TrackComplaint;
