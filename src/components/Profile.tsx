import React, { useState, useEffect, useRef } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { updateProfile, deleteUser, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
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
  X,
  Trash2,
  Lock,
  AlertTriangle,
  Scale
} from 'lucide-react';
import { Loader } from './Loader';
import { Capacitor } from '@capacitor/core';
import { LegalAndComplianceModal, LegalTab } from './LegalAndComplianceModal';

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

  // Legal & Compliance Modal State (Google Play health compliance)
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalDefaultTab, setLegalDefaultTab] = useState<LegalTab>('disclaimer');

  // Account Deletion & Data Purge (Google Play User Data requirement)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openLegalModal = (tab: LegalTab) => {
    setLegalDefaultTab(tab);
    setLegalModalOpen(true);
  };

  const handlePermanentAccountDeletion = async () => {
    if (!currentUser) return;
    if (deleteConfirmationInput.trim().toUpperCase() !== 'DELETE') {
      setDeleteError("Please type 'DELETE' to confirm.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // 1. Delete all user reports
      try {
        const q = query(collection(db, 'reports'), where('userId', '==', currentUser.uid));
        const reportsSnapshot = await getDocs(q);
        const deletePromises = reportsSnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      } catch (err) {
        console.warn("Notice: could not delete some reports:", err);
      }

      // 2. Delete verification requests if any
      try {
        const vq = query(collection(db, 'verificationRequests'), where('userId', '==', currentUser.uid));
        const vqSnapshot = await getDocs(vq);
        const vqPromises = vqSnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(vqPromises);
      } catch (err) {
        console.warn("Notice: could not delete verification requests:", err);
      }

      // 3. Delete user document from Firestore
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid));
      } catch (err) {
        console.warn("Notice: could not delete user document:", err);
      }

      // 4. Delete user from Firebase Auth
      await deleteUser(currentUser);

      // 5. Clean local state
      localStorage.removeItem('malae_form_data');
      localStorage.removeItem('malae_api_url');

      // Reload window to reset auth state cleanly
      window.location.reload();
    } catch (err: any) {
      console.error("Account deletion failed:", err);
      if (err.code === 'auth/requires-recent-login') {
        setDeleteError("Security notice: Deleting your account requires recent authentication. Please sign out, sign in again, and retry account deletion.");
      } else {
        setDeleteError(err.message || "Failed to complete account deletion.");
      }
      setIsDeleting(false);
    }
  };

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
                    <span className="text-[9px] font-mono font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">[verified]</span>
                    <span className="text-[11px] font-bold text-text-main">Medical Board Certified</span>
                  </div>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-mono font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">[pending verification]</span>
                    <span className="text-[11px] font-bold text-text-main">Awaiting Administrator Review</span>
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
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Account Status</span>
              {verificationStatus === 'verified' ? (
                <span className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  [verified]
                </span>
              ) : (
                <span className="text-xs font-mono font-bold text-amber-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  [pending verification]
                </span>
              )}
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

      {/* Google Play Store Compliance & Legal Documentation */}
      <div className="mt-8 p-6 rounded-2xl bg-surface border border-line space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-main">App Compliance & Policies</h3>
              <p className="text-[11px] text-text-muted">Google Play Developer Policy & Medical Regulatory Disclosures</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <button
              type="button"
              id="profile-open-disclaimer-btn"
              onClick={() => openLegalModal('disclaimer')}
              className="p-3 rounded-xl bg-bg/80 border border-line text-left hover:border-primary hover:bg-surface transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-text-main group-hover:text-primary transition-colors flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Medical Disclaimer
                </span>
              </div>
              <p className="text-[10px] text-text-muted">Clinical use & diagnostic limitations notice</p>
            </button>

            <button
              type="button"
              id="profile-open-privacy-btn"
              onClick={() => openLegalModal('privacy')}
              className="p-3 rounded-xl bg-bg/80 border border-line text-left hover:border-primary hover:bg-surface transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-text-main group-hover:text-primary transition-colors flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  Privacy Policy
                </span>
              </div>
              <p className="text-[10px] text-text-muted">Data safety, encryption & user rights</p>
            </button>

            <button
              type="button"
              id="profile-open-terms-btn"
              onClick={() => openLegalModal('terms')}
              className="p-3 rounded-xl bg-bg/80 border border-line text-left hover:border-primary hover:bg-surface transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-text-main group-hover:text-primary transition-colors flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-primary" />
                  Terms of Service
                </span>
              </div>
              <p className="text-[10px] text-text-muted">Platform usage agreement & clinical terms</p>
            </button>
          </div>
        </div>

        {/* Google Play Required: In-App Account Deletion */}
        <div className="mt-8 p-6 rounded-2xl bg-red-50/60 border border-red-200/60 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-900">Account Management & Data Deletion</h3>
              <p className="text-[11px] text-red-700/80">Google Play Store User Data Compliance Requirement</p>
            </div>
          </div>

          <p className="text-xs text-red-800/90 leading-relaxed">
            In compliance with Google Play Developer policies, you have the right to permanently purge your account, profile, clinical documents, and medical verification credentials from our servers at any time.
          </p>

          <div className="pt-2">
            <button
              type="button"
              id="open-delete-account-modal-btn"
              onClick={() => {
                setDeleteConfirmationInput('');
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account & Purge Data</span>
            </button>
          </div>
        </div>

      {/* Legal & Compliance Modal */}
      <LegalAndComplianceModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        defaultTab={legalDefaultTab}
      />

      {/* Account Deletion Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div 
            id="delete-account-modal-backdrop" 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-2xl border border-line shadow-2xl w-full max-w-md p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-main">Permanently Delete Account?</h3>
                  <p className="text-xs text-red-600 font-medium">This action cannot be undone.</p>
                </div>
              </div>

              <div className="text-xs text-text-muted space-y-2 leading-relaxed bg-red-50/50 p-3.5 rounded-xl border border-red-100">
                <p>Deleting your account will permanently purge:</p>
                <ul className="list-disc pl-5 space-y-1 text-red-900 font-medium">
                  <li>Your user profile and registered credentials</li>
                  <li>All saved clinical case reports and presentations</li>
                  <li>Submitted medical student/license verification records</li>
                </ul>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-text-main block">
                  To confirm, please type <span className="font-mono text-red-600 font-black">DELETE</span> below:
                </label>
                <input
                  id="confirm-delete-account-input"
                  type="text"
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-text-main font-mono text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              {deleteError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  id="cancel-delete-account-btn"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-main transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-permanent-delete-btn"
                  onClick={handlePermanentAccountDeletion}
                  disabled={isDeleting || deleteConfirmationInput.trim().toUpperCase() !== 'DELETE'}
                  className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting ? <Loader /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{isDeleting ? 'Deleting...' : 'Permanently Delete'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
