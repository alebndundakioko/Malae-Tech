import React, { useState } from 'react';
import { auth, db } from '../firebase';
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

  const validateInputs = () => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid clinical email address.");
      return false;
    }

    if (!isLogin) {
      if (!displayName.trim()) {
        setError("Please enter your full name.");
        return false;
      }
      if (!hospital.trim()) {
        setError("Please enter your hospital or institution.");
        return false;
      }

      // Password complexity validation
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
    }

    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateInputs()) return;

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName });
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email || email,
          displayName: displayName || user.displayName || '',
          hospital: hospital || '',
          createdAt: serverTimestamp()
        });
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
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        createdAt: serverTimestamp()
      }, { merge: true });
      
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
    <div className="min-h-screen flex bg-white font-sans selection:bg-[#AE6965]/30 selection:text-[#8E5450]">
      {/* Left Section: Immersive Branding & Imagery */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#151619]">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/surgery-clinical/1200/1600" 
            alt="Medical Workspace" 
            className="w-full h-full object-cover opacity-40 scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#151619] via-[#151619]/80 to-transparent" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 w-full flex flex-col justify-between p-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 rounded-xl bg-[#AE6965] flex items-center justify-center shadow-lg shadow-[#AE6965]/40">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">Malae</span>
            </div>

            <div className="space-y-6 max-w-md">
              <h2 className="text-5xl font-bold text-white leading-[1.1] tracking-tight">
                Crafting the <span className="text-[#D4A5A2]">narrative</span> of modern medicine.
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                Empowering surgeons to transform clinical data into compelling case stories with the power of AI.
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="grid grid-cols-2 gap-8"
          >
            {[
              { label: 'AI Synthesis', desc: 'Instant case stories' },
              { label: 'Clinical Focus', desc: 'Designed for surgeons' },
              { label: 'Secure Data', desc: 'HIPAA-ready infrastructure' },
              { label: 'Global Reach', desc: 'Share your expertise' }
            ].map((feature, i) => (
              <div key={i} className="space-y-1">
                <div className="text-[#AE6965] font-bold text-sm uppercase tracking-widest">{feature.label}</div>
                <div className="text-slate-500 text-xs">{feature.desc}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#AE6965]/10 rounded-full blur-[120px]" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#D4A5A2]/10 rounded-full blur-[120px]" />
      </div>

      {/* Right Section: Interactive Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-[#FAF5F5]/30">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px]"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#AE6965] flex items-center justify-center shadow-lg shadow-[#AE6965]/20">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">Malae</span>
            </div>
          </div>

          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
              {isLogin ? 'Welcome back' : 'Get started'}
            </h1>
            <p className="text-slate-500 text-sm sm:text-base">
              {isLogin 
                ? 'Enter your credentials to access your clinical workspace.' 
                : 'Join the community of surgeons documenting the future of medicine.'}
            </p>
          </div>

          <div className="space-y-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white border border-slate-200 hover:border-[#AE6965]/50 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 text-sm sm:text-base shadow-sm hover:shadow-md disabled:opacity-70 group"
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
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-[#FAF5F5]/30 px-4 text-slate-400 font-bold tracking-[0.2em]">Or use email</span>
              </div>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#AE6965] transition-colors" />
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm sm:text-base text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#AE6965]/10 focus:border-[#AE6965] transition-all placeholder:text-slate-300"
                          placeholder="Dr. Samantha A."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Hospital / Institution</label>
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#AE6965] transition-colors" />
                        <input
                          type="text"
                          required
                          value={hospital}
                          onChange={(e) => setHospital(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm sm:text-base text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#AE6965]/10 focus:border-[#AE6965] transition-all placeholder:text-slate-300"
                          placeholder="General Hospital"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#AE6965] transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm sm:text-base text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#AE6965]/10 focus:border-[#AE6965] transition-all placeholder:text-slate-300"
                    placeholder="name@hospital.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                  {isLogin && (
                    <button type="button" className="text-[11px] font-bold text-[#AE6965] hover:underline uppercase tracking-wider">
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#AE6965] transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm sm:text-base text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#AE6965]/10 focus:border-[#AE6965] transition-all placeholder:text-slate-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
                        <span className={`text-[10px] font-bold uppercase tracking-tight transition-colors duration-300 ${req.met ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Confirm Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#AE6965] transition-colors" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm sm:text-base text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#AE6965]/10 focus:border-[#AE6965] transition-all placeholder:text-slate-300"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
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
                className="w-full bg-[#AE6965] hover:bg-[#8E5450] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[#AE6965]/25 hover:shadow-[#AE6965]/40 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 active:scale-[0.98]"
              >
                {loading ? (
                  <Loader />
                ) : (
                  <>
                    <span className="text-sm sm:text-base">{isLogin ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center mt-10 text-slate-500 text-sm">
              {isLogin ? "New to Malae?" : "Already have an account?"}{' '}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#AE6965] font-bold hover:underline ml-1"
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
