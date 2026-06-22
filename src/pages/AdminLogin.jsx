import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAdminAuthSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Enforce static administrative username rule
    if (username.trim().toLowerCase() !== "admin") {
      setError("Unauthorized access token identifier.");
      return;
    }

    setLoading(true);
    try {
      // Background abstraction of username string to administrative email node
      const hiddenAdminEmail = "admin@gmail.com";
      await login(hiddenAdminEmail, password);
      
      // Navigate cleanly to switchboard router deck
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Invalid administrative token signature key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased font-sans text-left">
      
      {/* LEFT ASPECT PANEL: BRANDING INFRASTRUCTURE BRAND ADVERTISEMENT */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-600 via-blue-500 to-indigo-600 p-12 flex-col justify-between relative overflow-hidden">
        
        {/* Futuristic Background Matrix Gradients */}
        <div className="absolute top-[-20%] right-[-20%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />
        
        {/* Core Identity Banner */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center font-bold text-lg text-white border border-white/20 shadow-inner">
            🏥
          </div>
          <div>
            <h1 className="text-[18px] font-black  tracking-tight leading-none">MedCare Core</h1>
            <p className="text-[12px] text-white font-semibold uppercase tracking-wider mt-0.5">Admin Management</p>
          </div>
        </div>

        {/* Center Copy Statement */}
        <div className="max-w-md space-y-4 relative z-10 my-auto">
          <span className="bg-indigo-500/20 text-white border border-indigo-400/20 text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-md">
            Security Layer Alpha
          </span>
          <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
            Centralized Medical Administration Platform
          </h2>
          <p className="text-xs text-white font-medium leading-relaxed">
            Authorized administrative personnel security gateway clearance point. Access terminal tracking systems, roster configurations, and operational metrics layers globally.
          </p>
        </div>

        {/* Footer Metrics Indicator */}
        <div className="flex justify-between items-center text-[11px] font-bold text-white relative z-10 border-t border-white/10 pt-4">
          <p>© 2026 MedCare Systems Inc.</p>
          <p className="tracking-mono font-mono">v4.2.1-SECURE</p>
        </div>
      </div>

      {/* RIGHT ASPECT PANEL: AUTHENTICATION INTERACTIVE CONTROL INTERFACE */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 sm:px-12 bg-white relative">
        <div className="max-w-sm w-full space-y-8">
          
          {/* Header Mobile Workspace Navigation & Description labels */}
          <div className="space-y-2">
            {/* Display icon wrapper context on small devices only */}
            <div className="md:hidden w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-lg border border-indigo-100 mb-4">
              🏥
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Admin Login</h3>
            <p className="text-xs text-slate-400 font-medium">
              Provide administration credentials to access the system
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-4 py-3 rounded-xl font-bold flex items-center gap-2 animate-fadeIn">
              <span className="text-sm">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
            
            {/* Input Node 1: Admin Username identifier field text input element wrapper */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Administration Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-xs">
                  👤
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g., admin"
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200/80 text-slate-800 font-semibold rounded-xl text-xs placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Input Node 2: Administrative credential security key hash secret text field element wrapper */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Security Code
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-xs">
                  🔒
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200/80 text-slate-800 font-semibold rounded-xl text-xs placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Security Notice Checklist Banner Link Elements */}
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-500 font-medium">
              <span className="text-xs text-indigo-500 mt-0.5">ℹ️</span>
              <p className="leading-normal">
                Provide your admin credentials to access the dashboard.
              </p>
            </div>

            {/* Action Executive Submit Control Trigger Node Button element component */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer tracking-wider shadow-md shadow-indigo-600/10 disabled:opacity-40 select-none mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-b-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>

          {/* Navigation Action Secondary Redirect Layer Link element blocks */}
          <div className="text-center pt-2">
            <button 
              type="button" 
              onClick={() => navigate("/login")} 
              className="text-[11px] font-bold text-slate-400 hover:text-indigo-600 transition cursor-pointer bg-transparent border-none outline-none"
            >
              ← Exit Admin Login & return to user login
            </button>
          </div>

        </div>
      </div>
      
    </div>
  );
}