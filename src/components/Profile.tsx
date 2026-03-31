import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { 
  User, 
  Building2, 
  Mail, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { Loader } from './Loader';

interface ProfileProps {
  onBack: () => void;
}

export const Profile = ({ onBack }: ProfileProps) => {
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
  const [hospital, setHospital] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      const path = `users/${auth.currentUser.uid}`;
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDisplayName(data.displayName || auth.currentUser.displayName || '');
          setHospital(data.hospital || '');
        }
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, path);
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Update Auth Profile
      await updateProfile(auth.currentUser, { displayName });

      // Update Firestore Document
      const path = `users/${auth.currentUser.uid}`;
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          displayName,
          hospital
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="mb-4">
          <Loader />
        </div>
        <p className="text-slate-500 font-medium">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-[#AE6965] transition-colors mb-6 sm:mb-10 group"
      >
        <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-[8px] sm:text-xs font-black uppercase tracking-widest">Back to My Cases</span>
      </button>

      <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="bg-[#AE6965] p-6 sm:p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-white/10 rounded-full blur-3xl" />
          <div className="flex items-center gap-4 sm:gap-6 relative z-10">
            <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-xl sm:rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <User className="w-6 h-6 sm:w-10 sm:h-10" />
            </div>
            <div>
              <h1 className="text-lg sm:text-3xl font-black tracking-tight uppercase tracking-widest">Clinical Profile</h1>
              <p className="text-white/70 text-[10px] sm:text-sm font-medium">Manage your professional identity</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="p-6 sm:p-10 space-y-6 sm:space-y-8">
          <div className="space-y-2 sm:space-y-3">
            <label htmlFor="profile-email" className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-5 sm:h-5 text-slate-300" aria-hidden="true" />
              <input
                id="profile-email"
                type="email"
                disabled
                value={auth.currentUser?.email || ''}
                className="w-full pl-10 sm:pl-12 pr-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed text-[10px] sm:text-sm font-medium"
              />
            </div>
            <p className="text-[8px] sm:text-[10px] text-slate-400 font-medium ml-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Email cannot be changed for security reasons.
            </p>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <label htmlFor="profile-display-name" className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-5 sm:h-5 text-slate-300 group-focus-within:text-[#AE6965] transition-colors" aria-hidden="true" />
              <input
                id="profile-display-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#AE6965]/5 focus:border-[#AE6965] transition-all text-[10px] sm:text-base font-medium"
                placeholder="Dr. Samantha"
              />
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <label htmlFor="profile-hospital" className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Hospital / Institution</label>
            <div className="relative group">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-5 sm:h-5 text-slate-300 group-focus-within:text-[#AE6965] transition-colors" aria-hidden="true" />
              <input
                id="profile-hospital"
                type="text"
                required
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#AE6965]/5 focus:border-[#AE6965] transition-all text-[10px] sm:text-base font-medium"
                placeholder="General Hospital"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl sm:rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-[10px] sm:text-sm font-bold"
            >
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-emerald-600 text-[10px] sm:text-sm font-bold"
            >
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <p>Profile updated successfully!</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#AE6965] hover:bg-[#8E5450] text-white font-black py-3.5 sm:py-5 rounded-xl sm:rounded-2xl shadow-xl shadow-[#AE6965]/20 transition-all flex items-center justify-center gap-3 disabled:opacity-70 group"
          >
            {saving ? (
              <Loader />
            ) : (
              <>
                <Save className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] sm:text-sm tracking-widest uppercase">Save Changes</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
