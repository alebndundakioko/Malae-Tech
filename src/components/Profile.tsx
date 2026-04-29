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
  ArrowLeft,
  Smartphone,
  Download,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { Loader } from './Loader';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

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

  const { isInstallable, installApp } = useInstallPrompt();

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
    <div className="max-w-2xl mx-auto px-6 sm:px-10 py-10 sm:py-16">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors mb-10 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Back to Archive</span>
      </button>

      <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
        <div className="bg-bg p-8 sm:p-12 border-b border-line relative overflow-hidden">
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-text-main flex items-center justify-center text-white shadow-sm">
              <User className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-widest text-text-main">Clinical Profile</h1>
              <p className="text-text-muted text-xs sm:text-sm font-medium mt-1">Manage your professional identity</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="p-8 sm:p-12 space-y-8 sm:space-y-10">
          <div className="space-y-3">
            <label htmlFor="profile-email" className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
              <input
                id="profile-email"
                type="email"
                disabled
                value={auth.currentUser?.email || ''}
                className="w-full pl-12 pr-6 py-4 rounded-xl border border-line bg-bg text-text-muted cursor-not-allowed text-sm font-medium"
              />
            </div>
            <p className="text-[9px] text-text-muted font-medium ml-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Email cannot be changed for security reasons.
            </p>
          </div>

          <div className="space-y-3">
            <label htmlFor="profile-display-name" className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-1">Full Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" aria-hidden="true" />
              <input
                id="profile-display-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-12 pr-6 py-4 rounded-xl border border-line bg-surface text-text-main focus:outline-none focus:border-primary transition-all text-sm font-medium"
                placeholder="Dr. Samantha"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="profile-hospital" className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-1">Hospital / Institution</label>
            <div className="relative group">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" aria-hidden="true" />
              <input
                id="profile-hospital"
                type="text"
                required
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className="w-full pl-12 pr-6 py-4 rounded-xl border border-line bg-surface text-text-main focus:outline-none focus:border-primary transition-all text-sm font-medium"
                placeholder="General Hospital"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-xs font-bold"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-emerald-600 text-xs font-bold"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p>Profile updated successfully!</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-text-main hover:bg-slate-800 text-white font-bold py-4 sm:py-5 rounded-xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-70 group"
          >
            {saving ? (
              <Loader />
            ) : (
              <>
                <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-xs tracking-widest uppercase">Save Profile</span>
              </>
            )}
          </button>
        </form>

        <div className="p-8 sm:p-12 border-t border-line bg-slate-50/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-text-main leading-none">Mobile App Access</h3>
              <p className="text-[10px] text-text-muted font-medium mt-1">Install clinical workspace on your device</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-text-muted leading-relaxed">
              Malae Tech utilizes <span className="text-primary font-bold">Progressive Web Technology</span> to provide a native-level clinical experience. Installing the application ensures:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-[10px] text-text-muted font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                <span><strong className="text-text-main">Full-Screen Workspace:</strong> Removes browser UI for focused history taking.</span>
              </li>
              <li className="flex items-start gap-2 text-[10px] text-text-muted font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                <span><strong className="text-text-main">Offline Capability:</strong> Access clinical archives without an active internet connection.</span>
              </li>
              <li className="flex items-start gap-2 text-[10px] text-text-muted font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                <span><strong className="text-text-main">Instant Launch:</strong> Dedicated icon on your home screen for rapid clinical access.</span>
              </li>
            </ul>

            {isInstallable ? (
              <button
                onClick={installApp}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-primary text-white font-bold transition-all hover:bg-accent shadow-lg shadow-primary/20 active:scale-95 group"
              >
                <Download className="w-4 h-4 group-hover:bounce transition-transform" />
                <span className="text-xs tracking-widest uppercase">Install Mobile App</span>
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-line bg-white/50 text-center">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  App already installed or not supported by this browser
                </p>
                <p className="text-[9px] text-text-muted mt-1 lowercase italic">
                  (On iOS: Tap "Share" → "Add to Home Screen")
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 sm:p-12 border-t border-line bg-red-50/30">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-red-900 leading-none">Privacy & Data</h3>
              <p className="text-[10px] text-red-700/70 font-medium mt-1">Manage your account and medical data</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-red-800/80 leading-relaxed">
              In accordance with medical data privacy regulations, you have the right to request the complete deletion of your account and all associated clinical data.
            </p>
            
            <a
              href={`mailto:support@malae.tech?subject=Account%20and%20Data%20Deletion%20Request&body=I%20would%20like%20to%20request%20the%20complete%20deletion%20of%20my%20account%20(${auth.currentUser?.email})%20and%20all%20associated%20clinical%20records%20from%20Malae%20Tech.`}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl border-2 border-red-200 bg-white text-red-600 font-bold transition-all hover:bg-red-50 hover:border-red-300 active:scale-95 group"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-xs tracking-widest uppercase">Request Data Deletion</span>
            </a>
            
            <p className="text-[9px] text-red-700/60 italic text-center">
              Please note: Professional clinical data once deleted cannot be recovered. Requests are typically processed within 30 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
