import React, { useState, useEffect, useRef } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  Chrome, 
  Eye, 
  EyeOff, 
  Building2,
  FileUp,
  ShieldCheck,
  CheckCircle2,
  FileText,
  X,
  Stethoscope,
  Award,
  Sparkles,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Loader } from './Loader';
import { Capacitor } from '@capacitor/core';

interface AuthProps {
  onSuccess: () => void;
  onEnterPreview?: () => void;
}

export const Auth = ({ onSuccess, onEnterPreview }: AuthProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [hospital, setHospital] = useState('');
  const [medicalCadre, setMedicalCadre] = useState('Medical Doctor (MBChB / MBBS / MD)');
  const [specialty, setSpecialty] = useState('Internal Medicine');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [issuingCouncil, setIssuingCouncil] = useState('Uganda Medical & Dental Practitioners Council (UMDPC)');
  
  // Medical ID Upload State
  const [medicalIdFile, setMedicalIdFile] = useState<File | null>(null);
  const [medicalIdPreview, setMedicalIdPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [attestationAccepted, setAttestationAccepted] = useState(false);
  const [verificationRef, setVerificationRef] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // signupStep: 1 = Credentials, 2 = Doctor Details, 3 = Medical ID Upload, 4 = Confirmation
  const [signupStep, setSignupStep] = useState(1);

  // Image compression utility to ensure storage fits comfortably within Firestore
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    if (!file) return;

    // Check size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit. Please upload a smaller document.");
      return;
    }

    // Supported formats
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a valid image (JPEG, PNG, WEBP) or PDF document.");
      return;
    }

    setMedicalIdFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setMedicalIdPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setMedicalIdPreview(null);
    }
  };

  const validateInputs = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid clinical email address.");
      return false;
    }

    if (!isLogin) {
      if (signupStep === 1) {
        const minLength = 8;
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) {
          setError(`Password must be at least ${minLength} characters long.`);
          return false;
        }
        if (!hasNumber) {
          setError("Password must include at least one number.");
          return false;
        }
        if (!hasSpecialChar) {
          setError("Password must include at least one special character (!@#$%^&*).");
          return false;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return false;
        }
      } else if (signupStep === 2) {
        if (!displayName.trim()) {
          setError("Please enter your full name with professional title.");
          return false;
        }
        if (!hospital.trim()) {
          setError("Please enter your hospital, health center, or university hospital.");
          return false;
        }
        if (!licenseNumber.trim()) {
          setError("Please provide your medical council registration or license number.");
          return false;
        }
      } else if (signupStep === 3) {
        if (!medicalIdFile) {
          setError("Please upload your Medical Practicing License or Council Registration ID.");
          return false;
        }
        if (!attestationAccepted) {
          setError("Please confirm the medical practitioner attestation before submitting.");
          return false;
        }
      }
    }

    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateInputs()) return;

    // Advance step 1 -> step 2
    if (!isLogin && signupStep === 1) {
      setSignupStep(2);
      return;
    }

    // Advance step 2 -> step 3 (Medical ID Upload)
    if (!isLogin && signupStep === 2) {
      setSignupStep(3);
      return;
    }

    // Step 3 submission: create account and submit medical ID verification
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        onSuccess();
      } else {
        // Sign Up with Doctor Verification
        let compressedBase64 = '';
        if (medicalIdFile) {
          try {
            compressedBase64 = await compressImage(medicalIdFile);
          } catch (e) {
            console.warn("Failed to compress credential image, proceeding without preview:", e);
          }
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName });
        
        const generatedRef = `MED-VERIF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        setVerificationRef(generatedRef);

        const path = `users/${user.uid}`;
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email || email,
            displayName: displayName || user.displayName || '',
            hospital: hospital || '',
            medicalCadre,
            specialty,
            licenseNumber,
            issuingCouncil,
            verificationStatus: 'pending',
            verificationRef: generatedRef,
            medicalIdFileName: medicalIdFile?.name || 'medical_id.jpg',
            medicalIdFileType: medicalIdFile?.type || 'image/jpeg',
            medicalIdBase64: compressedBase64,
            medicalIdSubmittedAt: serverTimestamp(),
            createdAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }

        // Show Confirmation Screen before continuing
        setSignupStep(4);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("Sign-in method not enabled. Please enable Email/Password in the Firebase Console.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Please sign in instead.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Please use at least 8 characters with numbers and symbols.");
      } else if (err.code === 'auth/invalid-credential') {
        setError("Invalid email or password. Please check your credentials.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("Sign-in popup was blocked by your browser. Please allow popups for this site.");
      } else if (err.message?.includes('Missing or insufficient permissions')) {
        setError("Database access denied. Please check Firestore security rules.");
      } else {
        setError(err.message || "An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const syncGoogleUserProfile = async (user: any) => {
    if (!user.email) {
      throw new Error("No email associated with this Google account.");
    }

    const userRef = doc(db, 'users', user.uid);
    const path = `users/${user.uid}`;
    
    try {
      const userSnap = await getDocFromServer(userRef);
      
      if (!userSnap.exists()) {
        console.log("Creating new Google user profile...");
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Dr. Medical Clinician',
          hospital: 'Clinical Practice',
          medicalCadre: 'Medical Doctor',
          specialty: 'General Medicine',
          verificationStatus: 'pending',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      } else {
        console.log("Updating existing Google user profile...");
        await setDoc(userRef, {
          lastLogin: serverTimestamp(),
          ...(user.displayName ? { displayName: user.displayName } : {})
        }, { merge: true });
      }
    } catch (error) {
      console.error("Firestore error during Google sign-in profile sync:", error);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        setLoading(true);
        console.log("Checking for Google Sign-In redirect result...");
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          console.log("Redirect Google Sign-In success:", result.user.uid);
          await syncGoogleUserProfile(result.user);
          onSuccess();
        }
      } catch (err: any) {
        console.error("Redirect Google Sign-In error:", err);
        setError(err.message || "Google Sign-In failed during redirect. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    checkRedirectResult();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      console.log("Starting Google Sign-In...");
      const isMobile = Capacitor.isNativePlatform() || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        await syncGoogleUserProfile(user);
        onSuccess();
      }
    } catch (err: any) {
      console.error("Google Sign-In error details:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in cancelled. The popup was closed before completion.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Google sign-in is not enabled. Please enable it in Firebase Console.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("Sign-in popup was blocked by your browser. Please allow popups to sign in.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError("This domain is not authorized for Google Sign-In. Please add it in Firebase Console.");
      } else {
        setError(err.message || "Google Sign-In failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-bg font-sans selection:bg-primary/30 selection:text-accent">
      {/* Left Section: Immersive Branding & Medical Identity */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-text-main">
        <div className="absolute inset-0 z-0">
          <img 
            src="/auth_bg.png" 
            alt="African Medical Professional" 
            className="w-full h-full object-cover opacity-35 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-text-main via-text-main/80 to-transparent mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-text-main via-transparent to-transparent opacity-60" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 w-full flex flex-col justify-between p-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="flex items-center gap-4 mb-12">
              <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center shadow-2xl shadow-black/20 overflow-hidden border border-white/20">
                <img src="/images/logo.png" alt="Malae Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white tracking-widest uppercase leading-none">Malae</span>
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mt-1">Clinical Workspace</span>
              </div>
            </div>

            <div className="space-y-6 max-w-lg">
              <h2 className="text-5xl font-bold text-white leading-[1.05] tracking-tight">
                Crafting the <span className="font-serif italic text-primary font-normal">narrative</span> of modern African clinical medicine.
              </h2>
              <div className="w-20 h-1 bg-primary rounded-full" />
              <p className="text-lg text-slate-300 leading-relaxed font-normal">
                Empowering healthcare professionals to transform bed-side clinical findings into structured case presentations with AI-assisted clinical synthesis.
              </p>

              {/* Instant Preview Badge on Left Side */}
              {onEnterPreview && (
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={onEnterPreview}
                    className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur-md transition-all group"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-wider">Explore Clinical Workspace (Preview Mode)</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { label: 'Doctor Verification', desc: 'Medical council verified practitioner IDs' },
              { label: 'Clinical Synthesizer', desc: 'Automatic HPC, impression & management plans' },
              { label: 'Ward Audio Transcriber', desc: 'Hands-free clinical bedside recording' },
              { label: 'Academic Presentation', desc: 'Instant PPT & PDF clinical case export' }
            ].map((feature, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all">
                <div className="text-primary font-bold text-[10px] uppercase tracking-[0.2em] mb-1.5">{feature.label}</div>
                <div className="text-white/90 font-medium text-xs leading-snug">{feature.desc}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Right Section: Multi-Step Doctor Sign-In / Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-bg/50 overflow-y-auto min-h-screen">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[480px] py-8"
        >
          {/* Mobile Header Logo */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
                <img src="/images/logo.png" alt="Malae Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black text-text-main tracking-widest uppercase leading-none">Malae</span>
                <span className="text-[7px] font-bold text-primary uppercase tracking-[0.3em] mt-0.5">Clinical Workspace</span>
              </div>
            </div>

            {onEnterPreview && (
              <button
                type="button"
                onClick={onEnterPreview}
                className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Preview Mode</span>
              </button>
            )}
          </div>

          {/* Desktop Instant Preview Link at Top Right */}
          {onEnterPreview && (
            <div className="hidden lg:flex justify-end mb-6">
              <button
                type="button"
                onClick={onEnterPreview}
                className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-amber-500/20"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Explore Live Workspace (Preview Mode)</span>
              </button>
            </div>
          )}

          {/* Flow Header */}
          <div className="mb-8">
            <div className="hidden lg:flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-line flex items-center justify-center shadow-sm">
                <img src="/images/logo.png" alt="Malae Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black text-text-main tracking-widest uppercase leading-none">Malae Tech</span>
                <span className="text-[8px] font-bold text-primary uppercase tracking-[0.25em] mt-0.5">Clinical Verification Board</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-text-main tracking-tight mb-2">
              {isLogin 
                ? 'Welcome back, Doctor' 
                : (signupStep === 1 
                    ? 'Clinical Account Registration' 
                    : (signupStep === 2 
                        ? 'Medical Practitioner Details' 
                        : (signupStep === 3 
                            ? 'Medical ID Verification' 
                            : 'Verification Submitted')))}
            </h1>
            <p className="text-text-muted text-xs sm:text-sm">
              {isLogin 
                ? 'Enter your clinical credentials to access your hospital records & cases.' 
                : (signupStep === 1 
                    ? 'Step 1 of 3: Create secure clinical access credentials.' 
                    : (signupStep === 2 
                        ? 'Step 2 of 3: Provide your official medical licensing information.' 
                        : (signupStep === 3 
                            ? 'Step 3 of 3: Upload your medical ID to verify doctor status with our team.' 
                            : 'Your application has been received by our clinical review board.')))}
            </p>

            {/* Step Progress Bar for Sign Up */}
            {!isLogin && signupStep < 4 && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                  <span className={signupStep >= 1 ? 'text-primary' : ''}>1. Credentials</span>
                  <span className={signupStep >= 2 ? 'text-primary' : ''}>2. Doctor Details</span>
                  <span className={signupStep >= 3 ? 'text-primary' : ''}>3. Medical ID Upload</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map(step => (
                    <div 
                      key={step} 
                      className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${signupStep >= step ? 'bg-primary shadow-sm shadow-primary/30' : 'bg-line'}`} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Step 4: Submission Complete Confirmation Screen */}
            {!isLogin && signupStep === 4 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-surface rounded-2xl p-6 sm:p-8 border border-line shadow-sm space-y-6 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                  <ShieldCheck className="w-9 h-9" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Pending Verification Review
                  </div>
                  <h3 className="text-xl font-bold text-text-main">
                    Medical Credentials Submitted!
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
                    Thank you, <strong className="text-text-main">{displayName || 'Doctor'}</strong>. Your medical practicing ID has been transmitted to the Malae Clinical Verification Team.
                  </p>
                </div>

                <div className="bg-bg rounded-xl p-4 border border-line text-left space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-text-muted">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Verification Ref:</span>
                    <span className="font-mono font-bold text-text-main bg-surface px-2 py-0.5 rounded border border-line">{verificationRef}</span>
                  </div>
                  <div className="flex justify-between items-center text-text-muted">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Practitioner:</span>
                    <span className="font-medium text-text-main">{displayName}</span>
                  </div>
                  <div className="flex justify-between items-center text-text-muted">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">License Number:</span>
                    <span className="font-medium text-text-main">{licenseNumber || 'Submitted'}</span>
                  </div>
                  <div className="flex justify-between items-center text-text-muted">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Institution:</span>
                    <span className="font-medium text-text-main">{hospital}</span>
                  </div>
                  <div className="flex justify-between items-center text-text-muted">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Review SLA:</span>
                    <span className="font-bold text-emerald-600">Provisional Full Access Activated</span>
                  </div>
                </div>

                <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-left flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    While our medical board verifies your credentials against the national council registry, your provisional clinical workspace is unlocked with complete AI story generation and transcription tools.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onSuccess}
                  className="w-full bg-primary hover:bg-accent text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group text-sm sm:text-base"
                >
                  <span>Launch Clinical Workspace</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ) : (
              <>
                {/* Google Sign In (Available on Login and Step 1 of Sign Up) */}
                {(isLogin || signupStep === 1) && (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full bg-white border border-line hover:border-primary/50 hover:bg-bg text-text-main font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 text-sm sm:text-base shadow-sm hover:shadow-md disabled:opacity-70 group"
                    >
                      {loading ? (
                        <Loader />
                      ) : (
                        <>
                          <Chrome className="w-5 h-5 group-hover:scale-110 transition-transform text-red-500" />
                          <span>Continue with Google</span>
                        </>
                      )}
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-line"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase">
                        <span className="bg-bg px-4 text-text-muted font-bold tracking-[0.2em]">Or clinical email</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Back button when inside signup steps 2 or 3 */}
                {!isLogin && signupStep > 1 && (
                  <button 
                    type="button"
                    onClick={() => setSignupStep(prev => prev - 1)}
                    className="text-primary font-bold text-xs uppercase tracking-widest hover:underline mb-2 flex items-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    <span>Back to {signupStep === 3 ? 'Doctor Details' : 'Account Details'}</span>
                  </button>
                )}

                <form onSubmit={handleAuth} className="space-y-5">
                  <AnimatePresence mode="wait">
                    {/* STEP 1: Email & Password */}
                    {(isLogin || signupStep === 1) && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <label htmlFor="auth-email" className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Clinical Email Address</label>
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" aria-hidden="true" />
                            <input
                              id="auth-email"
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-line bg-white text-sm sm:text-base text-text-main focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-text-muted/50"
                              placeholder="doctor@hospital.org"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center ml-1">
                            <label htmlFor="auth-password" className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Password</label>
                            {isLogin && (
                              <button type="button" className="text-[11px] font-bold text-primary hover:underline uppercase tracking-wider">
                                Forgot?
                              </button>
                            )}
                          </div>
                          <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" aria-hidden="true" />
                            <input
                              id="auth-password"
                              type={showPassword ? "text" : "password"}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-line bg-white text-sm sm:text-base text-text-main focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-text-muted/50"
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>

                          {!isLogin && (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 ml-1">
                              {[
                                { label: '8+ Characters', met: password.length >= 8 },
                                { label: 'One Number', met: /\d/.test(password) },
                                { label: 'One Symbol', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
                                { label: 'Matches Confirm', met: password === confirmPassword && password.length > 0 }
                              ].map((req, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${req.met ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-200'}`} />
                                  <span className={`text-[10px] font-bold uppercase tracking-tight transition-colors duration-300 ${req.met ? 'text-emerald-600' : 'text-text-muted'}`}>
                                    {req.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {!isLogin && (
                          <div className="space-y-2">
                            <label htmlFor="auth-confirm-password" className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Confirm Password</label>
                            <div className="relative group">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" aria-hidden="true" />
                              <input
                                id="auth-confirm-password"
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-line bg-white text-sm sm:text-base text-text-main focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-text-muted/50"
                                placeholder="••••••••"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                              >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* STEP 2: Doctor Professional Profile */}
                    {!isLogin && signupStep === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <label htmlFor="auth-display-name" className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Full Legal & Professional Name</label>
                          <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" aria-hidden="true" />
                            <input
                              id="auth-display-name"
                              type="text"
                              required
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-line bg-white text-sm sm:text-base text-text-main focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-text-muted/50"
                              placeholder="e.g. Dr. Samantha Ainembabazi"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label htmlFor="auth-cadre" className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Medical Cadre</label>
                            <div className="relative">
                              <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                              <select
                                id="auth-cadre"
                                value={medicalCadre}
                                onChange={(e) => setMedicalCadre(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-line bg-white text-xs sm:text-sm text-text-main focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none"
                              >
                                <option value="Medical Doctor (MBChB / MBBS / MD)">Physician / Medical Doctor</option>
                                <option value="Consultant Specialist">Consultant Specialist</option>
                                <option value="Senior House Officer (Resident)">Senior House Officer (Resident)</option>
                                <option value="Medical Officer">Medical Officer</option>
                                <option value="Intern Doctor">Intern Doctor</option>
                                <option value="Medical Student / Clinical Scholar">Medical Student / Scholar</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="auth-specialty" className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Primary Specialty</label>
                            <div className="relative">
                              <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                              <select
                                id="auth-specialty"
                                value={specialty}
                                onChange={(e) => setSpecialty(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-line bg-white text-xs sm:text-sm text-text-main focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none"
                              >
                                <option value="Internal Medicine">Internal Medicine</option>
                                <option value="Pediatrics & Child Health">Pediatrics & Child Health</option>
                                <option value="Obstetrics & Gynecology">Obstetrics & Gynecology</option>
                                <option value="General Surgery">General Surgery</option>
                                <option value="Emergency Medicine">Emergency Medicine</option>
                                <option value="Family Medicine">Family Medicine</option>
                                <option value="Cardiology">Cardiology</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="auth-hospital" className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Hospital / Medical Institution</label>
                          <div className="relative group">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" aria-hidden="true" />
                            <input
                              id="auth-hospital"
                              type="text"
                              required
                              value={hospital}
                              onChange={(e) => setHospital(e.target.value)}
                              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-line bg-white text-sm sm:text-base text-text-main focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-text-muted/50"
                              placeholder="e.g. Mengo Hospital / Mulago NRH"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="auth-license" className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Medical License / Council Registration No.</label>
                          <div className="relative group">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" aria-hidden="true" />
                            <input
                              id="auth-license"
                              type="text"
                              required
                              value={licenseNumber}
                              onChange={(e) => setLicenseNumber(e.target.value)}
                              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-line bg-white text-sm sm:text-base text-text-main focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-text-muted/50"
                              placeholder="e.g. UMDPC-49201 or Practitioner Reg #"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="auth-council" className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Issuing Regulatory Council / Medical Board</label>
                          <input
                            id="auth-council"
                            type="text"
                            required
                            value={issuingCouncil}
                            onChange={(e) => setIssuingCouncil(e.target.value)}
                            className="w-full px-4 py-3.5 rounded-2xl border border-line bg-white text-sm text-text-main focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                            placeholder="e.g. Uganda Medical and Dental Practitioners Council (UMDPC)"
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 3: Medical ID Document Upload & Attestation */}
                    {!isLogin && signupStep === 3 && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-900 leading-relaxed">
                            <strong>Official Medical Verification:</strong> Please upload a photo or document of your Medical Practicing License, Medical Council ID, or Hospital Badge. Our medical team will verify your details.
                          </div>
                        </div>

                        {/* File Upload Zone */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">
                            Upload Medical License / Doctor ID Document
                          </label>

                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileSelect(file);
                            }}
                          />

                          {!medicalIdFile ? (
                            <div
                              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                              onDragLeave={() => setIsDragging(false)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const file = e.dataTransfer.files?.[0];
                                if (file) handleFileSelect(file);
                              }}
                              onClick={() => fileInputRef.current?.click()}
                              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                                isDragging 
                                  ? 'border-primary bg-primary/5 scale-[1.01]' 
                                  : 'border-line bg-white hover:border-primary/50 hover:bg-bg/60'
                              }`}
                            >
                              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                                <FileUp className="w-6 h-6" />
                              </div>
                              <p className="text-sm font-bold text-text-main mb-1">
                                Click or drag & drop your Medical ID
                              </p>
                              <p className="text-xs text-text-muted">
                                Supports PNG, JPG, WEBP, or PDF (Max 10MB)
                              </p>
                              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg border border-line text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Encrypted & Transmitted Directly to Medical Board
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-2xl bg-white border border-line shadow-sm space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    {medicalIdFile.type === 'application/pdf' ? (
                                      <FileText className="w-5 h-5" />
                                    ) : (
                                      <FileUp className="w-5 h-5" />
                                    )}
                                  </div>
                                  <div className="truncate">
                                    <div className="text-xs font-bold text-text-main truncate">{medicalIdFile.name}</div>
                                    <div className="text-[10px] text-text-muted">
                                      {(medicalIdFile.size / 1024).toFixed(1)} KB • Ready for verification
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMedicalIdFile(null);
                                    setMedicalIdPreview(null);
                                  }}
                                  className="p-1.5 text-text-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Image Preview Thumbnail if available */}
                              {medicalIdPreview && (
                                <div className="relative rounded-xl overflow-hidden border border-line max-h-48 bg-slate-50 flex items-center justify-center">
                                  <img 
                                    src={medicalIdPreview} 
                                    alt="Medical ID Preview" 
                                    className="object-contain max-h-48 w-full"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Practitioner Declaration & Attestation */}
                        <div className="p-4 rounded-2xl bg-bg border border-line space-y-3">
                          <label className="flex items-start gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={attestationAccepted}
                              onChange={(e) => setAttestationAccepted(e.target.checked)}
                              className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary/20 border-line"
                            />
                            <span className="text-xs text-text-muted leading-relaxed font-medium">
                              I certify that I am a registered medical practitioner and that the uploaded document represents my authentic license or council registration. I authorize the Malae Clinical Verification Team to verify my credentials.
                            </span>
                          </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error display */}
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-xs sm:text-sm"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="font-medium">{error}</p>
                    </motion.div>
                  )}

                  {/* Action Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-accent text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader />
                    ) : (
                      <>
                        <span className="text-sm sm:text-base">
                          {isLogin 
                            ? 'Sign In to Workspace' 
                            : (signupStep === 1 
                                ? 'Continue to Doctor Details' 
                                : (signupStep === 2 
                                    ? 'Continue to Medical ID Upload' 
                                    : 'Submit Credentials for Verification'))}
                        </span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                {/* Toggle between Sign In & Sign Up */}
                <p className="text-center mt-6 text-text-muted text-xs sm:text-sm">
                  {isLogin ? "New medical practitioner?" : "Already registered as a doctor?"}{' '}
                  <button 
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setSignupStep(1);
                      setError(null);
                    }}
                    className="text-primary font-bold hover:underline ml-1"
                  >
                    {isLogin ? 'Register & Verify Medical ID' : 'Sign in here'}
                  </button>
                </p>

                {/* Direct Preview Link for Instant Testing */}
                {onEnterPreview && (
                  <div className="pt-2 text-center border-t border-line/60">
                    <button
                      type="button"
                      onClick={onEnterPreview}
                      className="text-xs text-text-muted hover:text-primary transition-colors inline-flex items-center gap-1.5 font-medium"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Just exploring? <strong>Launch in Clinical Preview Mode</strong></span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
