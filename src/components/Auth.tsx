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
    <div className="min-h-screen flex items-center justify-center bg-[#FDF2F8] p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#D946EF] text-white mb-4 shadow-lg shadow-[#D946EF]/20">
            <Lock className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-2 px-4">
            {isLogin ? 'Access your medical workspace' : 'Join Malae to start creating surgical case stories'}
          </p>
        </div>

        <div className="bg-white rounded-[2rem] sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-8">
          <form onSubmit={handleAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-sm sm:text-base text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D946EF]/20 focus:border-[#D946EF] transition-all"
                        placeholder="Dr. Samantha"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hospital / Institution</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input
                        type="text"
                        required
                        value={hospital}
                        onChange={(e) => setHospital(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-sm sm:text-base text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D946EF]/20 focus:border-[#D946EF] transition-all"
                        placeholder="General Hospital"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-sm sm:text-base text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D946EF]/20 focus:border-[#D946EF] transition-all"
                  placeholder="name@hospital.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-2.5 sm:py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-sm sm:text-base text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D946EF]/20 focus:border-[#D946EF] transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {!isLogin && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                  {[
                    { label: '8+ Characters', met: password.length >= 8 },
                    { label: 'One Number', met: /\d/.test(password) },
                    { label: 'One Symbol', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
                    { label: 'Matches Confirm', met: password === confirmPassword && password.length > 0 }
                  ].map((req, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className={`w-1 h-1 rounded-full ${req.met ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                      <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-tight ${req.met ? 'text-emerald-600' : 'text-slate-400'}`}>
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
                  className="space-y-1.5"
                >
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-2.5 sm:py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-sm sm:text-base text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D946EF]/20 focus:border-[#D946EF] transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-xs sm:text-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D946EF] hover:bg-[#C026D3] text-white font-bold py-3.5 sm:py-4 rounded-xl shadow-lg shadow-[#D946EF]/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {loading ? (
                <Loader />
              ) : (
                <>
                  <span className="text-sm sm:text-base">{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2 text-slate-400 font-bold tracking-widest">Or continue with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 sm:py-3 rounded-xl transition-all flex items-center justify-center gap-3 text-sm sm:text-base disabled:opacity-70"
            >
              {loading ? (
                <Loader />
              ) : (
                <>
                  <Chrome className="w-5 h-5" />
                  Google
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center mt-8 text-slate-500 text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#D946EF] font-bold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};
