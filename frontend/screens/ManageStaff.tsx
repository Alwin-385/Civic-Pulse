import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../apiClient';

interface ManageStaffProps {
  onBack: () => void;
}

const ManageStaff: React.FC<ManageStaffProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [userEmail, setUserEmail] = useState('');

  type ApiStaff = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    status: string;
    workload: number;
    maxWorkload: number;
    location?: string | null;
    avatarUrl?: string | null;
    department?: { name: string };
    departmentId?: number;
  };

  const [staff, setStaff] = useState<ApiStaff[]>([]);

  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    email: string;
    phone: string;
    role: string;
    status: string;
    workload: number;
    maxWorkload: number;
    location: string;
    avatarUrl: string;
    departmentId: number | null;
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'Field Technician',
    status: 'Online',
    workload: 0,
    maxWorkload: 5,
    location: '',
    avatarUrl: '',
    departmentId: null,
  });

  const [reassignStaff, setReassignStaff] = useState<ApiStaff | null>(null);
  const [reassignDeptId, setReassignDeptId] = useState<number>(0);
  const [reassignRole, setReassignRole] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, staffRes, meRes] = await Promise.all([
        apiRequest<Array<{ id: number; name: string }>>('/api/departments'),
        apiRequest<any[]>('/api/staff'),
        apiRequest<{ user: { email: string } }>('/api/auth/me'),
      ]);

      setDepartments(deptRes);
      setStaff(staffRes);

      const email = (meRes.user?.email || '').toLowerCase();
      setUserEmail(email);

      let defaultTargetId = deptRes?.[0]?.id ?? null;
      if (email.includes('kseb')) {
        setDepartmentFilter('KSEB');
        defaultTargetId = deptRes?.find(d => d.name === 'KSEB')?.id ?? defaultTargetId;
      } else if (email.includes('pwd')) {
        setDepartmentFilter('PWD');
        defaultTargetId = deptRes?.find(d => d.name === 'PWD')?.id ?? defaultTargetId;
      }

      setCreateForm((f) => ({
        ...f,
        departmentId: f.departmentId ?? defaultTargetId,
      }));
    } catch (e: any) {
      if (e?.message !== "No token provided") setError(e?.message ?? 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (departmentFilter === 'ALL') return;
    const dept = departments.find((d) => d.name === departmentFilter);
    if (dept) {
      setCreateForm((f) => ({ ...f, departmentId: dept.id }));
    }
  }, [departmentFilter, departments]);

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    const deptBase =
      departmentFilter === 'ALL' ? staff : staff.filter((s) => s.department?.name === departmentFilter);

    if (!q) return deptBase;

    return deptBase.filter((s) => {
      return (
        String(s.id).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.role ?? '').toLowerCase().includes(q)
      );
    });
  }, [staff, query, departmentFilter]);

  const createStaff = async () => {
    setError(null);
    if (!createForm.name.trim() || !createForm.role || !createForm.status || !createForm.departmentId) {
      setError('Name, role, status, and department are strictly required.');
      return;
    }

    try {
      await apiRequest('/api/staff', {
        method: 'POST',
        body: {
          ...createForm,
          workload: Number(createForm.workload ?? 0),
          maxWorkload: Number(createForm.maxWorkload ?? 5),
          departmentId: Number(createForm.departmentId),
          email: createForm.email || undefined,
          phone: createForm.phone || undefined,
          avatarUrl: createForm.avatarUrl || undefined,
        },
      });
      setShowCreate(false);
      await loadData();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create staff record');
    }
  };

  const submitReassign = async () => {
    if (!reassignStaff) return;
    try {
      await apiRequest(`/api/staff/${reassignStaff.id}`, {
        method: 'PUT',
        body: { departmentId: Number(reassignDeptId), role: reassignRole }
      });
      setReassignStaff(null);
      await loadData();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to reassign staff structure');
    }
  };



  const deleteStaff = async (id: number) => {
    setError(null);
    try {
      await apiRequest(`/api/staff/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to terminate staff');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f0f4f8] font-sans h-full shadow-2xl overflow-hidden relative">
      
      {/* Extreme Glass Header Base */}
      <header className="shrink-0 z-20 pb-2">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-5 pt-8 pb-10 shadow-2xl transition-all duration-300 rounded-b-3xl relative overflow-hidden">
             
          <div className="absolute top-[-30%] right-[-10%] w-60 h-60 bg-blue-500/30 blur-[80px] rounded-full pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center justify-between mb-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <button 
                 onClick={onBack} 
                 className="flex items-center justify-center size-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition-all transform hover:-translate-x-1"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">Manage Staff</h1>
                <p className="text-indigo-200 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-0.5">
                  {loading ? 'Loading...' : `${staff.length} STAFF MEMBERS`}
                </p>
              </div>
            </div>
            
            <button
               onClick={() => setShowCreate((s) => !s)}
               className="bg-indigo-600 hover:bg-indigo-500 text-white size-12 md:w-auto md:px-5 rounded-full flex items-center justify-center gap-2 shadow-[0_10px_30px_rgb(79,70,229,0.5)] transition-all transform hover:-translate-y-1"
            >
               <span className="material-symbols-outlined font-black">person_add</span>
               <span className="hidden md:inline font-bold">Onboard Engineer</span>
            </button>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 text-xl">search</span>
            <input
              className="w-full bg-white/10 backdrop-blur-md border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:ring-2 focus:ring-indigo-400/50 outline-none placeholder:text-indigo-200/70 font-medium shadow-inner transition-all"
              placeholder="Query name, ID, or callsign..."
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
                Global Grid
              </button>
              <button
                onClick={() => setDepartmentFilter('KSEB')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  departmentFilter === 'KSEB' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:text-white'
                }`}
              >
                KSEB Platoon
              </button>
              <button
                onClick={() => setDepartmentFilter('PWD')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  departmentFilter === 'PWD' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:text-white'
                }`}
              >
                PWD Platoon
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-12 z-10 relative">
        <div className="max-w-7xl mx-auto space-y-4">
          
          {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700 text-sm font-medium animate-in fade-in zoom-in-95 shadow-sm">
                <span className="material-symbols-outlined shrink-0 text-red-500">error</span>
                <p>{error}</p>
              </div>
          )}

          {showCreate && (
             <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 animate-in slide-in-from-top-10 fade-in duration-500 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl"></div>
                
                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6">Onboard New Personnel</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name *</label>
                      <input
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                        placeholder="e.g. John Doe"
                        value={createForm.name}
                        onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                      />
                   </div>
                   
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Direct Contact (Phone) *</label>
                      <input
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                        placeholder="e.g. +91 98765 43210"
                        value={createForm.phone}
                        onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Designation *</label>
                      <div className="relative">
                         <select
                           className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none"
                           value={createForm.role}
                           onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                         >
                           <option value="Field Technician">Field Technician</option>
                           <option value="Senior Engineer">Senior Engineer</option>
                           <option value="Inspector">Inspector</option>
                           <option value="Site Manager">Site Manager</option>
                         </select>
                         <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                      </div>
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initial Status</label>
                      <div className="relative">
                         <select
                           className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none"
                           value={createForm.status}
                           onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))}
                         >
                           <option value="Online">Online / Ready</option>
                           <option value="Offline">Offline</option>
                           <option value="Busy">Busy (Do Not Break)</option>
                         </select>
                         <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                      </div>
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Division Pipeline</label>
                      <div className="relative">
                         <select
                           className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none"
                           value={createForm.departmentId || ''}
                           onChange={(e) => setCreateForm((f) => ({ ...f, departmentId: Number(e.target.value) }))}
                         >
                           <option value="" disabled>Select parent division...</option>
                           {departments.map((d) => (
                             <option key={d.id} value={d.id}>{d.name}</option>
                           ))}
                         </select>
                         <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                      </div>
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Concurrent Load Limit</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                        placeholder="Maximum Active Tickets"
                        value={createForm.maxWorkload}
                        onChange={(e) => setCreateForm((f) => ({ ...f, maxWorkload: parseInt(e.target.value) || 5 }))}
                      />
                   </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 mt-8 relative z-10 pt-4 border-t border-slate-100">
                   <button
                     type="button"
                     onClick={createStaff}
                     className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                   >
                     Initialize Onboarding
                   </button>
                   <button
                     type="button"
                     onClick={() => setShowCreate(false)}
                     className="w-full sm:w-auto bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-3 px-8 rounded-xl shadow-sm transition-all"
                   >
                     Cancel
                   </button>
                </div>
             </div>
          )}

          {/* Master Grid Formations */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {filteredStaff.length === 0 && !loading && (
                <div className="col-span-full bg-white/60 border border-slate-200 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-sm backdrop-blur-sm mt-4">
                   <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">engineering</span>
                   <p className="text-slate-500 font-bold">No Personnel Found</p>
                   <p className="text-slate-400 text-xs font-medium mt-1">Try tweaking filters or query bounds.</p>
                </div>
             )}

             {filteredStaff.map((person) => {
               const loadPercentage = person.maxWorkload ? (person.workload / person.maxWorkload) * 100 : 0;
               const isRedlined = loadPercentage >= 100;

               return (
                 <div
                   key={person.id}
                   className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-xl hover:border-indigo-100 transition-all duration-500"
                 >
                   <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl group-hover:bg-indigo-50/50 transition-colors pointer-events-none"></div>

                   <div className="flex justify-between items-start mb-4 relative z-10">
                     <div className="flex items-center gap-3">
                       <div className="relative">
                          <img
                            src={person.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=4f46e5&color=fff`}
                            alt={person.name}
                            className="w-14 h-14 rounded-full object-cover shadow-inner ring-4 ring-slate-50"
                          />
                          <span className={`absolute bottom-0 right-0 w-4 h-4 border-2 border-white rounded-full ${person.status === 'Online' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                       </div>
                       <div>
                         <h4 className="font-black text-slate-900 text-base">{person.name}</h4>
                         <p className="text-xs font-bold text-indigo-600 tracking-tight">{person.role}</p>
                       </div>
                     </div>
                   </div>

                   <div className="space-y-2 mb-6 relative z-10 flex-1">
                      {person.department && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                           <span className="material-symbols-outlined text-[14px] text-slate-400">factory</span>
                           Division: <span className="text-slate-900">{person.department.name}</span>
                        </div>
                      )}
                      
                      {person.phone && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                           <span className="material-symbols-outlined text-[14px] text-slate-400">phone_callback</span>
                           Contact: <span className="text-slate-900">{person.phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                         <span className="material-symbols-outlined text-[14px] text-slate-400">tag</span>
                         System ID: <span className="text-slate-900">#{person.id}</span>
                      </div>
                   </div>

                   {/* Workload Telemetry */}
                   <div className="relative z-10 mb-4 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-wider mb-2">
                       <span className={isRedlined ? "text-red-500" : "text-slate-500"}>
                         {isRedlined ? 'MAX CAP' : 'Workload'}
                       </span>
                       <span className={isRedlined ? "text-red-500" : "text-indigo-600"}>
                         {person.workload} / {person.maxWorkload}
                       </span>
                     </div>
                     <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                       <div
                         className={`h-2 rounded-full transition-all duration-1000 ${
                           isRedlined ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-indigo-500 to-blue-500'
                         }`}
                         style={{ width: `${Math.min(loadPercentage, 100)}%` }}
                       />
                     </div>
                   </div>

                   {/* Quick Actions */}
                   <div className="flex justify-between items-center border-t border-slate-100 pt-4 relative z-10">
                     <button
                       onClick={() => {
                         if (confirm('Permanently terminate this personnel from the matrix?')) {
                           void deleteStaff(person.id);
                         }
                       }}
                       className="text-xs font-bold text-red-600 flex items-center gap-1 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                     >
                       <span className="material-symbols-outlined text-[14px]">person_remove</span>
                       Terminate
                     </button>
                     <button
                        onClick={() => {
                          setReassignStaff(person);
                          setReassignDeptId(Number(person.departmentId) || (departments[0]?.id || 0));
                          setReassignRole(person.role || 'Field Technician');
                        }}
                        className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors group"
                     >
                       Re-assign
                       <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                     </button>
                   </div>
                 </div>
               );
             })}
          </div>

        </div>
      </main>

      {/* Reassign Modal */}
      {reassignStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setReassignStaff(null)}></div>
           <div className="relative bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 slide-in-from-bottom-10">
              <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">Re-assign Personnel</h3>
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-6">Matrix Shift: {reassignStaff.name}</p>

              <div className="space-y-4 mb-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department Node</label>
                    <div className="relative">
                       <select
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none"
                          value={reassignDeptId}
                          onChange={(e) => setReassignDeptId(Number(e.target.value))}
                       >
                          {departments.map((d: any) => (
                             <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                       </select>
                       <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                 </div>
                 
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Designation Shift</label>
                    <div className="relative">
                       <select
                         className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none"
                         value={reassignRole}
                         onChange={(e) => setReassignRole(e.target.value)}
                       >
                          <option value="Field Technician">Field Technician</option>
                          <option value="Senior Engineer">Senior Engineer</option>
                          <option value="Inspector">Inspector</option>
                          <option value="Site Manager">Site Manager</option>
                       </select>
                       <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                 </div>
              </div>

              <div className="flex gap-3 relative z-10">
                 <button onClick={() => setReassignStaff(null)} className="flex-1 py-3 bg-slate-50 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm">Cancel</button>
                 <button onClick={submitReassign} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-[0_10px_30px_rgb(79,70,229,0.3)] transition-all transform hover:-translate-y-0.5 text-sm">Confirm</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default ManageStaff;
