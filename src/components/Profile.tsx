import React, { useState, useEffect, useRef } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { 
  User, 
  Building2, 
  Mail, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Globe,
  ShieldCheck,
  Clock,
  FileText,
  FileUp,
  Award,
  Stethoscope,
  X
} from 'lucide-react';
import { Loader } from './Loader';
import { Capacitor } from '@capacitor/core';

interface ProfileProps {
  onBack: () => void;
}

export const Profile = ({ onBack }: ProfileProps) => {
  const currentUser = auth.currentUser;
  const [displayName, setDisplayName] = useState(currentUser?.displayName || 'Dr. Samantha Ainembabazi');
  const [hospital, setHospital] = useState('Mengo Hospital');
  const [medicalCadre, setMedicalCadre] = useState('Medical Doctor (MBChB / MBBS / MD)');
  const [specialty, setSpecialty] = useState('Internal Medicine');
  const [licenseNumber, setLicenseNumber] = useState('UMDPC-49201');
  const [issuingCouncil, setIssuingCouncil] = useState('Uganda Medical & Dental Practitioners Council (UMDPC)');
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [verificationRef, setVerificationRef] = useState<string>('MED-VERIF-7A89F2');
  const [medicalIdFileName, setMedicalIdFileName] = useState<string>('medical_practicing_license.pdf');

  const [apiUrl, setApiUrl] = useState(() => {
    return localStorage.getItem('malae_api_url') || 'https://ais-pre-uyd6ehinkvjd3dd3ytwd53-33678728397.europe-west1.run.app';
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // New file upload state for updating ID
  const [newFile, setNewFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) {
        // In preview mode or unauthenticated
        setLoading(false);
        return;
      }

      const path = `users/${currentUser.uid}`;
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDisplayName(data.displayName || currentUser.displayName || '');
          setHospital(data.hospital || '');
          if (data.medicalCadre) setMedicalCadre(data.medicalCadre);
          if (data.specialty) setSpecialty(data.specialty);
          if (data.licenseNumber) setLicenseNumber(data.licenseNumber);
          if (data.issuingCouncil) setIssuingCouncil(data.issuingCouncil);
          if (data.verificationStatus) setVerificationStatus(data.verificationStatus);
          if (data.verificationRef) setVerificationRef(data.verificationRef);
          if (data.medicalIdFileName) setMedicalIdFileName(data.medicalIdFileName);
        }
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, path);
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (currentUser) {
        // Update Auth Profile
        await updateProfile(currentUser, { displayName });

        // Update Firestore Document
        const path = `users/${currentUser.uid}`;
        try {
          const updatePayload: any = {
            displayName,
            hospital,
            medicalCadre,
            specialty,
            licenseNumber,
            issuingCouncil,
            updatedAt: serverTimestamp()
          };

          if (newFile) {
            updatePayload.medicalIdFileName = newFile.name;
            updatePayload.medicalIdFileType = newFile.type;
            updatePayload.verificationStatus = 'pending';
            updatePayload.medicalIdSubmittedAt = serverTimestamp();
            setMedicalIdFileName(newFile.name);
            setVerificationStatus('pending');
          }

          await updateDoc(doc(db, 'users', currentUser.uid), updatePayload);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, path);
        }
      }

      // Save local API Base URL setting
      localStorage.setItem('malae_api_url', apiUrl);

      setSuccess(true);
      setNewFile(null);
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
        <p className="text-slate-500 font-medium">Loading clinical profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Back to Workspace Dashboard</span>
      </button>

      <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
        {/* Header Profile Banner */}
        <div className="bg-bg p-6 sm:p-10 border-b border-line relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-text-main flex items-center justify-center text-white shadow-md">
                <User className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-text-main">
                  {displayName || 'Clinical Physician'}
                </h1>
                <p className="text-text-muted text-xs sm:text-sm font-medium mt-0.5 flex items-center gap-2">
                  <span>{medicalCadre}</span>
                  <span>•</span>
                  <span>{hospital || 'Clinical Center'}</span>
                </p>
              </div>
            </div>

            {/* Doctor Verification Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-line shadow-xs">
              {verificationStatus === 'verified' ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Verified Doctor</span>
                    <span className="text-[11px] font-bold text-text-main">Medical Board Certified</span>
                  </div>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Verification In Review</span>
                    <span className="text-[11px] font-bold text-text-main">Submitted to Team</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Verification Status Card */}
        <div className="p-6 sm:p-10 bg-gradient-to-br from-bg/80 to-surface border-b border-line space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-main">
                Doctor Credential Verification
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-surface px-2.5 py-1 rounded border border-line text-text-muted">
              Ref: {verificationRef || 'MED-VERIF-7A89F2'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-surface border border-line">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Status</span>
              <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Under Medical Board Review
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-line">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">License No.</span>
              <span className="text-xs font-bold text-text-main font-mono">
                {licenseNumber || 'Not submitted'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-line">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Council</span>
              <span className="text-xs font-bold text-text-main truncate block" title={issuingCouncil}>
                {issuingCouncil || 'Medical Council'}
              </span>
            </div>
          </div>

          {medicalIdFileName && (
            <div className="p-3.5 rounded-xl bg-surface border border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-text-main">{medicalIdFileName}</div>
                  <div className="text-[10px] text-text-muted">Submitted to Malae Clinical Verification Team</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-primary hover:underline"
              >
                Update Document
              </button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setNewFile(file);
            }}
          />

          {newFile && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>New document selected: <strong>{newFile.name}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setNewFile(null)}
                className="text-emerald-700 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleUpdate} className="p-6 sm:p-10 space-y-6">
          <div className="space-y-2">
            <label htmlFor="profile-email" className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
              <input
                id="profile-email"
                type="email"
                disabled
                value={currentUser?.email || 'doctor@hospital.org'}
                className="w-full pl-12 pr-6 py-3.5 rounded-xl border border-line bg-bg text-text-muted cursor-not-allowed text-sm font-medium"
              />
            </div>
            <p className="text-[9px] text-text-muted font-medium ml-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Clinical email cannot be changed for regulatory compliance reasons.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="profile-display-name" className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-1">Full Legal Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" aria-hidden="true" />
                <input
                  id="profile-display-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-line bg-surface text-text-main focus:outline-none focus:border-primary transition-all text-sm font-medium"
                  placeholder="Dr. Samantha Ainembabazi"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="profile-hospital" className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-1">Hospital / Institution</label>
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" aria-hidden="true" />
                <input
                  id="profile-hospital"
                  type="text"
                  required
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-line bg-surface text-text-main focus:outline-none focus:border-primary transition-all text-sm font-medium"
                  placeholder="Mengo Hospital"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="profile-cadre" className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-1">Medical Cadre</label>
              <div className="relative group">
                <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <input
                  id="profile-cadre"
                  type="text"
                  value={medicalCadre}
                  onChange={(e) => setMedicalCadre(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-line bg-surface text-text-main focus:outline-none focus:border-primary transition-all text-sm font-medium"
                  placeholder="e.g. Physician / Medical Doctor"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="profile-specialty" className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-1">Clinical Specialty</label>
              <div className="relative group">
                <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <input
                  id="profile-specialty"
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-line bg-surface text-text-main focus:outline-none focus:border-primary transition-all text-sm font-medium"
                  placeholder="e.g. Internal Medicine"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="profile-license" className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-1">Medical Council License No.</label>
              <input
                id="profile-license"
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-line bg-surface text-text-main focus:outline-none focus:border-primary transition-all text-sm font-medium font-mono"
                placeholder="UMDPC-XXXXX"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="profile-council" className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-1">Medical Council Board</label>
              <input
                id="profile-council"
                type="text"
                value={issuingCouncil}
                onChange={(e) => setIssuingCouncil(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-line bg-surface text-text-main focus:outline-none focus:border-primary transition-all text-sm font-medium"
                placeholder="Uganda Medical & Dental Practitioners Council"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="profile-api-url" className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-1">Backend Server URL ({Capacitor.isNativePlatform() ? 'Mobile Mode' : 'Web Mode'})</label>
            <div className="relative group">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" aria-hidden="true" />
              <input
                id="profile-api-url"
                type="url"
                required
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full pl-12 pr-6 py-3.5 rounded-xl border border-line bg-surface text-text-main focus:outline-none focus:border-primary transition-all text-sm font-medium"
                placeholder="https://your-custom-backend.run.app"
              />
            </div>
            <p className="text-[9px] text-text-muted font-medium ml-1">
              The full endpoint URL that this application uses for server-side AI processing and transcription.
            </p>
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
              <p>Doctor profile updated and credentials synchronized!</p>
            </motion.div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary text-white font-bold text-xs hover:bg-accent transition-all shadow-lg shadow-primary/20 uppercase tracking-widest flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {saving ? (
                <Loader />
              ) : (
                <>
                  <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Save Clinical Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
