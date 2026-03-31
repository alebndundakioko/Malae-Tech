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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-[#AE6965] transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold uppercase tracking-wider">Back to My Cases</span>
      </button>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="bg-[#AE6965] p-8 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Clinical Profile</h1>
              <p className="text-white/70 text-sm">Manage your professional identity</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="p-8 space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="profile-email" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" aria-hidden="true" />
              <input
                id="profile-email"
                type="email"
                disabled
                value={auth.currentUser?.email || ''}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-slate-400 italic">Email cannot be changed</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-display-name" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" aria-hidden="true" />
              <input
                id="profile-display-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#AE6965]/20 focus:border-[#AE6965] transition-all"
                placeholder="Dr. Samantha"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-hospital" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hospital / Institution</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" aria-hidden="true" />
              <input
                id="profile-hospital"
                type="text"
                required
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#AE6965]/20 focus:border-[#AE6965] transition-all"
                placeholder="General Hospital"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-emerald-600 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p>Profile updated successfully!</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#AE6965] hover:bg-[#8E5450] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#AE6965]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving ? (
              <Loader />
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
