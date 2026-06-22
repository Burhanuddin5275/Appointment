import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { ref, get } from "firebase/database";

export default function Login() {
  const { loginWithGoogle, user, refreshRole } = useAuth(); 
  const [isSignUp, setIsSignUp] = useState(false); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Direct navigation is handled inside the form submission to prevent premature redirects for suspended doctors
      // checking the active database configuration state first.
    }
  }, [user]);

  // Centralized function to verify the user account status profile properties
  const checkAccountStatusAndProceed = async (uid) => {
    try {
      const userSnapshot = await get(ref(db, `users/${uid}`));
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        
        // INTERCEPT: If the doctor is suspended, block login, sign out, and show explicit message
        if (userData.role === "doctor" && userData.status === "suspended") {
          await signOut(auth); // Clear Firebase session state instantly
          setError("You are suspended by admin because of violation of medical rules.");
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error("Error reading database node status configurations:", err);
      return true; // Fallback pattern
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match. Please verify your inputs.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await refreshRole(userCredential.user.uid);
        navigate("/dashboard");
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Verify active status parameter permissions before running dashboard redirects
        const canAccess = await checkAccountStatusAndProceed(userCredential.user.uid);
        if (canAccess) {
          await refreshRole(userCredential.user.uid);
          navigate("/dashboard");
        }
      }
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email address is already registered. Try signing in.");
      } else if (err.code === "auth/weak-password") {
        setError("Security choice weak: Password must be at least 6 characters.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password combination.");
      } else {
        setError("Connection failed. Please check your internet access.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError("");
      const result = await loginWithGoogle();
      
      // Verify active status parameter permissions for social auth logins
      const canAccess = await checkAccountStatusAndProceed(result.user.uid);
      if (canAccess) {
        await refreshRole(result.user.uid);
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Google authentication was canceled.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 px-4 py-12 antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Decorative background gradients for depth */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-indigo-50 to-transparent -z-10" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-100/80 border border-slate-200/60 p-8 relative">
        
        {/* Brand/Header Segment */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl mb-4 shadow-sm border border-indigo-100/40">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isSignUp ? "Join Our Medical Portal" : "Welcome Back"}
          </h2>
          <p className="text-slate-500 text-sm mt-1.5">
            {isSignUp ? "Create an account to book and manage care appointments" : "Sign in to handle your consultations and updates"}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl mb-6 flex items-center gap-2.5 animate-fadeIn">
            <svg className="w-4 h-4 text-rose-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Input Form Module */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Email Address
            </label>
            <input 
              type="email" 
              required 
              placeholder="Email Address"
              className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-sm text-slate-800 shadow-inner transition placeholder-slate-400 font-medium"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Password
            </label>
            <input 
              type="password" 
              required 
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-sm text-slate-800 shadow-inner transition placeholder-slate-400"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          {/* Conditional Input Field Layer */}
          {isSignUp && (
            <div className="animate-fadeIn">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Confirm Password
              </label>
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-sm text-slate-800 shadow-inner transition placeholder-slate-400"
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
              />
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 py-3 px-4 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition-all duration-200 shadow-md shadow-indigo-200/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Authenticating Account Profile..." : isSignUp ? "Create Account" : "Sign In to Dashboard"}
          </button>
        </form>

        {/* View Mode Switcher Link Toggle */}
        <div className="mt-6 text-center text-sm text-slate-500 font-medium">
          {isSignUp ? "Already have an account?" : "New to our platform?"}
          <button 
            type="button" 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(""); 
            }}
            className="text-indigo-600 font-semibold hover:text-indigo-700 ml-1.5 cursor-pointer bg-transparent border-none transition"
          >
            {isSignUp ? "Sign In" : "Create Account Now"}
          </button>
        </div>

        {/* Beautiful Modern Divider Element */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200/80"></div></div>
          <span className="relative bg-white px-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Or Register Using</span>
        </div>

        {/* Provider OAuth Authorization Button Grid */}
        <button 
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm py-2.5 rounded-xl shadow-sm transition duration-150 cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.53-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-8.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.15C3.18 21.88 7.31 24 12 24z"/>
            <path fill="#FBBC05" d="M5.32 14.24A7.16 7.16 0 0 1 5 12c0-.79.13-1.57.32-2.34V6.51H1.21A11.94 11.94 0 0 0 0 12c0 1.92.45 3.74 1.21 5.39l4.11-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.18 2.12 1.21 6.51l4.11 3.15c.94-2.85 3.57-4.91 6.68-4.91z"/>
          </svg>
          Continue with Google
        </button>

        <button 
          onClick={() => navigate("/")} 
          className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600 mt-6 cursor-pointer transition block"
        >
          ← Return to Main Homepage
        </button>
      </div>
    </div>
  );
}