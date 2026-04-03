import React, { useEffect, useState } from 'react';
import { apiRequest } from '../apiClient';

interface EditProfileProps {
  onBack: () => void;
}

const EditProfile: React.FC<EditProfileProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    bio: ''
  });

  useEffect(() => {
    apiRequest<{ user: any }>('/api/auth/me')
      .then((data) => {
        setFormData({
          name: data.user.name || '',
          phone: data.user.phone || '',
          address: data.user.address || '',
          bio: data.user.bio || ''
        });
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load profile details'))
      .finally(() => setInitLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!formData.name.trim()) throw new Error('Name cannot be empty');

      await apiRequest('/api/auth/me', {
        method: 'PUT',
        body: formData
      });
      setSuccess('Profile updated successfully.');
      setTimeout(onBack, 1500); 
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update user profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto relative font-sans">
      <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-indigo-500/10 to-transparent -z-10 pointer-events-none blur-3xl"></div>

      <header className="sticky top-0 z-50 bg-slate-50/80 backdrop-blur-xl border-b border-white/50 p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-200/50 transition-colors">
          <span className="material-symbols-outlined text-slate-600">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight text-slate-800">Edit Profile</h1>
        <div className="w-10"></div>
      </header>

      <main className="px-5 py-6 space-y-6">
        {error && (
          <div className="px-4 py-3 bg-red-50 text-red-600 font-bold text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}
        {success && (
          <div className="px-4 py-3 bg-green-50 text-green-700 font-bold text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {success}
          </div>
        )}

        {initLoading ? (
          <div className="text-center py-10 text-slate-500 font-medium text-sm">Loading details...</div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block ml-1">Full Name</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">account_circle</span>
                <input 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-slate-800"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block ml-1">Phone Number</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">call</span>
                <input 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-slate-800"
                  placeholder="+91 8000000000"
                />
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block ml-1">Address Details</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-4 text-slate-400 group-focus-within:text-primary transition-colors">home</span>
                <textarea 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={2}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-slate-800 resize-none"
                  placeholder="Street name, City, Code"
                />
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block ml-1">Bio (Optional)</label>
              <div className="relative group">
                <textarea 
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-slate-800 resize-none"
                  placeholder="Something about you so we can serve you better..."
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full mt-8 bg-slate-900 group text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-900/20 flex flex-col items-center justify-center hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
            >
              <span>{loading ? 'Saving Changes...' : 'Save Profile Details'}</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default EditProfile;
