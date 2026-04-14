import React, { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  Building2
} from 'lucide-react';
import { Loader } from './Loader';

interface AuthProps {
  onSuccess: () => void;
}

export const Auth = ({ onSuccess }: AuthProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [hospital, setHospital] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [signupStep, setSignupStep] = useState(1);

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
      } else {
        if (!displayName.trim()) {
          setError("Please enter your full name.");
          return false;
        }
        if (!hospital.trim()) {
          setError("Please enter your hospital or institution.");
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

    if (!isLogin && signupStep === 1) {
      setSignupStep(2);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName });
        
        const path = `users/${user.uid}`;
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email || email,
            displayName: displayName || user.displayName || '',
            hospital: hospital || '',
            createdAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }
      onSuccess();
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("Sign-in method not enabled. Please enable Email/Password in the Firebase Console.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Please sign in instead.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Please use at least 6 characters.");
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      if (!user.email) {
        throw new Error("No email associated with this Google account.");
      }

      // Create/Update user document
      const path = `users/${user.uid}`;
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          createdAt: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
      
      onSuccess();
    } catch (err: any) {
      console.error("Google Sign-In error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in cancelled. The popup was closed before completion.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Google sign-in is not enabled. Please enable it in the Firebase Console.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("Sign-in popup was blocked by your browser. Please allow popups for this site.");
      } else if (err.message?.includes('Missing or insufficient permissions')) {
        setError("Database access denied. Please check Firestore security rules.");
      } else {
        setError(err.message || "Google Sign-In failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-bg font-sans selection:bg-primary/30 selection:text-accent">
      {/* Left Section: Immersive Branding & Imagery */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-text-main">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1631217818217-058317d921cd?auto=format&fit=crop&q=80&w=1974" 
            alt="Modern Healthcare" 
            className="w-full h-full object-cover opacity-40 scale-105"
            referrerPolicy="no-referrer"
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
                <div className="w-full h-full pink-gradient flex items-center justify-center text-white font-black text-2xl">M</div>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white tracking-widest uppercase leading-none">Malae</span>
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mt-1">Clinical Workspace</span>
              </div>
            </div>

            <div className="space-y-6 max-w-lg">
              <h2 className="text-6xl font-bold text-white leading-[0.95] tracking-tight">
                Crafting the <span className="font-serif italic text-primary font-normal">narrative</span> of modern medicine.
              </h2>
              <div className="w-20 h-1 bg-primary rounded-full" />
              <p className="text-xl text-text-muted leading-relaxed font-medium">
                Empowering healthcare professionals to transform clinical data into compelling case stories with the power of AI.
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { label: 'AI Synthesis', desc: 'Instant case stories' },
              { label: 'Clinical Focus', desc: 'Designed for medical professionals' },
              { label: 'Secure Data', desc: 'HIPAA-ready infrastructure' },
              { label: 'Global Reach', desc: 'Share your expertise' }
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all group">
                <div className="text-primary font-bold text-[10px] uppercase tracking-[0.2em] mb-2 group-hover:text-primary transition-colors">{feature.label}</div>
                <div className="text-white font-semibold text-sm">{feature.desc}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Right Section: Interactive Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-bg/50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px]"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden text-white font-black">
                M
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-text-main tracking-widest uppercase leading-none">Malae</span>
                <span className="text-[8px] font-bold text-primary uppercase tracking-[0.3em] mt-1">Clinical Workspace</span>
              </div>
            </div>
          </div>

          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-main tracking-tight mb-3">
              {isLogin ? 'Welcome back' : (signupStep === 1 ? 'Get started' : 'Professional Profile')}
            </h1>
            <p className="text-text-muted text-sm sm:text-base">
              {isLogin 
                ? 'Enter your credentials to access your clinical workspace.' 
                : (signupStep === 1 
                    ? 'Join the community of medical professionals documenting the future of medicine.'
                    : 'Tell us a bit more about your clinical practice.')}
            </p>
            {!isLogin && (
              <div className="flex gap-2 mt-6">
                {[1, 2].map(step => (
                  <div 
                    key={step} 
                    className={`h-1 flex-1 rounded-full transition-all duration-500 ${signupStep >= step ? 'bg-primary' : 'bg-line'}`} 
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {isLogin || signupStep === 1 ? (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full bg-white border border-line hover:border-primary/50 hover:bg-bg text-text-main font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 text-sm sm:text-base shadow-sm hover:shadow-md disabled:opacity-70 group"
                >
                  {loading ? (
                    <Loader />
                  ) : (
                    <>
                      <Chrome className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Continue with Google
                    </>
                  )}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-line"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-bg px-4 text-text-muted font-bold tracking-[0.2em]">Or use email</span>
                  </div>
                </div>
              </>
            ) : (
              <button 
                onClick={() => setSignupStep(1)}
                className="text-primary font-bold text-xs uppercase tracking-widest hover:underline mb-4 flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to Account Details
              </button>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              <AnimatePresence mode="wait">
                {!isLogin && signupStep === 2 ? (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label htmlFor="auth-display-name" className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" aria-hidden="true" />
                        <input
                          id="auth-display-name"
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-line bg-white text-sm sm:text-base text-text-main focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-text-muted/50"
                          placeholder="Dr. Samantha A."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="auth-hospital" className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Hospital / Institution</label>
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" aria-hidden="true" />
                        <input
                          id="auth-hospital"
                          type="text"
                          required
                          value={hospital}
                          onChange={(e) => setHospital(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-line bg-white text-sm sm:text-base text-text-main focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-text-muted/50"
                          placeholder="General Hospital"
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label htmlFor="auth-email" className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" aria-hidden="true" />
                        <input
                          id="auth-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-line bg-white text-sm sm:text-base text-text-main focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-text-muted/50"
                          placeholder="name@hospital.com"
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
              </AnimatePresence>

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
                      {isLogin ? 'Sign In' : (signupStep === 1 ? 'Continue' : 'Create Account')}
                    </span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center mt-10 text-text-muted text-sm">
              {isLogin ? "New to Malae?" : "Already have an account?"}{' '}
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setSignupStep(1);
                }}
                className="text-primary font-bold hover:underline ml-1"
              >
                {isLogin ? 'Create an account' : 'Log in here'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
