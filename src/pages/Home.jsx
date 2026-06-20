import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Dynamic Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏥</span>
            <span className="text-xl font-bold text-slate-800 tracking-tight">MedSchedule Portal</span>
          </div>
          
          <div>
            {user ? (
              <button 
                onClick={() => navigate("/dashboard")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm shadow-sm transition duration-150"
              >
                Go to Dashboard
              </button>
            ) : (
              <button 
                onClick={() => navigate("/login")}
                className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-5 py-2.5 rounded-lg text-sm shadow-sm transition duration-150"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Display Showcase */}
      <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-20 px-6 text-center shadow-inner">
        <div className="max-w-3xl mx-auto">
          <span className="bg-blue-500/30 text-blue-200 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-blue-400/20">
            Smart Healthcare Solutions
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-4 mb-6">
            Your Medical Appointments, Simplified.
          </h1>
          <p className="text-lg text-blue-100 max-w-xl mx-auto leading-relaxed mb-8">
            Connect with verified healthcare practitioners, view open time slots, and schedule clinical care instantly through our centralized smart platform.
          </p>
          <button 
            onClick={() => navigate(user ? "/dashboard" : "/login")}
            className="bg-white text-blue-700 font-bold px-8 py-3.5 rounded-xl shadow-md hover:bg-blue-50 transition transform hover:-translate-y-0.5 duration-150"
          >
            Book Appointment Now
          </button>
        </div>
      </header>

      {/* App Informative Features Layout */}
      <main className="max-w-7xl mx-auto px-6 py-16 flex-1 w-full">
        <h2 className="text-center text-3xl font-extrabold text-slate-800 mb-12 tracking-tight">
          How Our System Works For You
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Find Specialists</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Browse through multiple verified clinicians sorted dynamically by expertise, experience metrics, fees, and location profiles.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-xl mb-4">📅</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Pick Custom Slots</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              No more endless phone queues. View explicit daily schedules provided directly by doctors and confirm your appointment with a single tap.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-xl mb-4">🛡️</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Verified Operations</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Our absolute administrative portal guarantees all medical licenses are validated before their profiles appear on your dashboard.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Content */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        &copy; 2026 MedSchedule Systems. All rights reserved. Registered Clinical Application Workspace.
      </footer>
    </div>
  );
}