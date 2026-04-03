import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Department } from '../types';
import { apiRequest } from '../apiClient';

interface NewComplaintProps {
  onBack: () => void;
}

const NewComplaint: React.FC<NewComplaintProps> = ({ onBack }) => {
  const [category, setCategory] = useState<Department>(Department.KSEB);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Low');

  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [location, setLocation] = useState('');

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<Array<{ id: number; name: string }>>('/api/departments')
      .then(setDepartments)
      .catch(() => {
        // Ignore; user will see a server error if department mapping can't be found.
      });
  }, []);

  const resolvedDepartmentId = useMemo(() => {
    const dept = departments.find((d) => d.name === category);
    return dept?.id ?? null;
  }, [departments, category]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser');
      return;
    }

    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(`${pos.coords.latitude}, ${pos.coords.longitude}`);
      },
      (err) => {
        setError(err.message || 'Failed to get current location');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const onPickImages = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files);
    const totalFiles = imageFiles.length + newFiles.length;
    
    if (totalFiles > 3) {
      setError('You can upload a maximum of 3 photos');
      return;
    }
    
    setError(null);
    setImageFiles(prev => [...prev, ...newFiles]);
    
    const newUrls = newFiles.map(f => URL.createObjectURL(f));
    setImagePreviewUrls(prev => [...prev, ...newUrls]);
    
    if (imageInputRef.current) {
        imageInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => {
      const urls = [...prev];
      URL.revokeObjectURL(urls[index]);
      urls.splice(index, 1);
      return urls;
    });
  };

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!title.trim()) throw new Error('Title is required');
      if (!description.trim()) throw new Error('Description is required');
      if (!resolvedDepartmentId) throw new Error('Selected department is not available');

      let uploadedImageUrls: string[] = [];
      let detectedLocation: string | null = null;
      
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach(f => formData.append('images', f));
        
        const data = await apiRequest<any>(`/api/upload`, {
          method: 'POST',
          body: formData,
          isFormData: true
        });
        
        uploadedImageUrls = data.urls || [];
        if (data.detectedLocation && !location) {
          detectedLocation = data.detectedLocation;
          setLocation(data.detectedLocation);
        }
      }

      await apiRequest('/api/complaints', {
        method: 'POST',
        body: {
          title,
          description,
          severity,
          location: location || detectedLocation || 'Unknown Coordinates',
          departmentId: resolvedDepartmentId,
          imageUrl: uploadedImageUrls[0] || undefined, 
        },
      });

      onBack();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f0f4f8] font-sans h-full shadow-2xl overflow-hidden relative">
      <header className="absolute top-0 inset-x-0 z-20 pb-4">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-5 pt-8 pb-12 shadow-2xl transition-all duration-300 rounded-b-3xl relative overflow-hidden">
          <div className="absolute top-[-40%] right-[-10%] w-80 h-80 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <button 
                 onClick={onBack} 
                 className="flex items-center justify-center size-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition-all transform hover:-translate-x-1"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">Submit Complaint</h1>
                <p className="text-indigo-200 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-0.5">
                   Create a new support ticket
                </p>
              </div>
            </div>
            
            <div className="flex gap-1 bg-white/10 p-1 rounded-xl backdrop-blur-md shadow-inner border border-white/10">
              <button
                onClick={() => setCategory(Department.KSEB)}
                className={`flex-1 min-w-[70px] uppercase text-[10px] font-black px-3 py-1.5 rounded-lg transition-all ${
                  category === Department.KSEB ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:text-white'
                }`}
              >
                KSEB
              </button>
              <button
                onClick={() => setCategory(Department.PWD)}
                className={`flex-1 min-w-[70px] uppercase text-[10px] font-black px-3 py-1.5 rounded-lg transition-all ${
                  category === Department.PWD ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-200 hover:text-white'
                }`}
              >
                PWD
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-40 pb-12 z-10 relative">
        <div className="max-w-4xl mx-auto space-y-6">

          {error && (
             <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700 text-sm font-medium shadow-sm animate-in fade-in zoom-in-95">
               <span className="material-symbols-outlined shrink-0 text-red-500">error</span>
               <p>{error}</p>
             </div>
          )}

          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col sm:flex-row gap-6 relative overflow-hidden">
             
             {/* Left Column: Media & Title/Severity */}
             <div className="w-full sm:w-1/3 flex flex-col gap-4">
                <div 
                   className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-500 transition-colors relative overflow-hidden"
                   onClick={() => imageInputRef.current?.click()}
                >
                   {imagePreviewUrls.length > 0 ? (
                      <div className="absolute inset-0">
                         <img src={imagePreviewUrls[0]} alt="preview" className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-white text-3xl">add_photo_alternate</span>
                         </div>
                      </div>
                   ) : (
                     <>
                        <span className="material-symbols-outlined text-[40px] mb-2 pointer-events-none">add_a_photo</span>
                        <span className="text-[10px] uppercase font-black tracking-widest text-center pointer-events-none px-4">Attach Evidence<br/>Max 3 Photos</span>
                     </>
                   )}
                </div>
                
                {imagePreviewUrls.length > 1 && (
                   <div className="flex gap-2">
                     {imagePreviewUrls.slice(1).map((url, idx) => (
                       <div key={idx} className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden relative group">
                          <img src={url} alt="sub-preview" className="w-full h-full object-cover" />
                          <button onClick={(e) => { e.stopPropagation(); removeImage(idx + 1); }} className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                             <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                       </div>
                     ))}
                   </div>
                )}
                
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  ref={imageInputRef} 
                  onChange={(e) => onPickImages(e.target.files)} 
                />

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Severity Metric</label>
                   <div className="relative">
                      <select
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none"
                        value={severity}
                        onChange={(e: any) => setSeverity(e.target.value)}
                      >
                        <option value="Low">Low - Normal Repair</option>
                        <option value="Medium">Medium - Disturbance</option>
                        <option value="High">High - Impaired System</option>
                        <option value="Critical">Critical - Safety Hazard</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                   </div>
                </div>
             </div>

             {/* Right Column: Data Entry */}
             <div className="w-full sm:w-2/3 flex flex-col gap-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject Log</label>
                   <input
                     className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                     placeholder="e.g. Broken Powerline on 5th Avenue"
                     value={title}
                     onChange={(e) => setTitle(e.target.value)}
                   />
                </div>

                <div className="space-y-1">
                   <div className="flex items-center justify-between">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</label>
                     <button 
                        onClick={getCurrentLocation}
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1 hover:text-indigo-800 transition-colors"
                     >
                        <span className="material-symbols-outlined text-[14px]">my_location</span>
                        Get Current Location
                     </button>
                   </div>
                   <input
                     className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                     placeholder="Will auto-fill if GPS enabled..."
                     value={location}
                     onChange={(e) => setLocation(e.target.value)}
                   />
                </div>

                <div className="space-y-1 flex-1 flex flex-col">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Complaint Details</label>
                   <textarea
                     className="w-full flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all min-h-[120px] resize-none"
                     placeholder="Provide details about the issue..."
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                   />
                </div>
             </div>

          </div>

          <div className="pt-2 pb-10">
             <button
               onClick={submit}
               disabled={loading}
               className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-xl shadow-slate-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 group"
             >
               {loading ? (
                  <>
                     <span className="material-symbols-outlined animate-spin">refresh</span>
                     Submitting Complaint...
                  </>
               ) : (
                  <>
                     <span className="material-symbols-outlined group-hover:-translate-y-1 transition-transform">send</span>
                     Submit Complaint
                  </>
               )}
             </button>
          </div>

        </div>
      </main>

    </div>
  );
};

export default NewComplaint;
