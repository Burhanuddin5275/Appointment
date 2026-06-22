import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleAdminShortcut = (event) => {
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        navigate("/admin-login");
      }
    };

    window.addEventListener("keydown", handleAdminShortcut);
    return () => {
      window.removeEventListener("keydown", handleAdminShortcut);
    };
  }, [navigate]);

  // Premium, curated medical photography array representing different specializations
  const specializationShowcase = [
    {
      specialty: "Cardiology",
      doctorName: "Dr. Amara Malik",
      tagline: "Heart & Vascular Care",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
      bgTint: "from-blue-500/10 to-indigo-500/10"
    },
    {
      specialty: "Neurology",
      doctorName: "Dr. Zain Raza",
      tagline: "Cognitive & Brain Sciences",
      image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
      bgTint: "from-purple-500/10 to-indigo-500/10"
    },
    {
      specialty: "Pediatrics",
      doctorName: "Dr. Sarah Ahmed",
      tagline: "Child Growth & Wellness",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQyxWn6AKripQvEwJHaeCLsdXGCHXpXWsektw&s",
      bgTint: "from-teal-500/10 to-emerald-500/10"
    },
    {
      specialty: "Dermatology",
      doctorName: "Dr. Omar Farooq",
      tagline: "Advanced Skin Therapeutics",
      image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80",
      bgTint: "from-amber-500/10 to-orange-500/10"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-600">
      
      {/* Premium Sticky Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 shadow-xs px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 10.5V20a2 2 0 01-2 2H7a2 2 0 01-2-2v-9.5m14 0a2 2 0 00-3-1.73l-4.31 2.5a2 2 0 01-2 0L6 8.77a2 2 0 00-3 1.73M19 10.5a2 2 0 00-2-2H7a2 2 0 00-2 2M9 5a2 2 0 012-2h2a2 2 0 012 2v3H9V5z" />
              </svg>
            </div>
            <div>
              <span className="text-base font-black text-slate-900 tracking-tight block leading-none">MedCare Core</span>
              <span className="text-[10px] text-indigo-600 font-bold tracking-wider uppercase mt-0.5 block">Integrated Workspace</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <button 
                onClick={() => navigate("/dashboard")}
                className="bg-blue-800 hover:bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm transition active:scale-[0.98] cursor-pointer"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button 
                  onClick={() => navigate("/login")}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm shadow-indigo-600/10 transition active:scale-[0.98] cursor-pointer"
                >
                  Sign In / Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Advanced Split Grid Hero Showcase */}
      <header className="relative bg-white border-b border-slate-200 overflow-hidden py-16 lg:py-24 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Column: Core Values & Actions */}
          <div className="lg:col-span-5 text-left space-y-6">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              <span className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider">
                PMDC Verified Healthcare Networks
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Connecting Patients with <span className="text-indigo-600">Validated Specialists</span>
            </h1>
            
            <p className="text-xs md:text-sm text-slate-500 leading-relaxed font-medium">
              Streamline your clinical consultation lifecycle. Authenticate your account, examine available time blocks configured by active physicians, and book immediate healthcare pathways.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button 
                onClick={() => navigate(user ? "/dashboard" : "/login")}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 transition text-xs uppercase tracking-wider cursor-pointer"
              >
                Book Consultation Slot
              </button>
              <a 
                href="#learn-more"
                className="w-full sm:w-auto bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-center font-bold px-6 py-3.5 rounded-xl transition text-xs uppercase tracking-wider"
              >
                System Operations
              </a>
            </div>

            {/* Micro Analytics Info */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
              <div>
                <p className="text-xl font-black text-slate-900">100% Verified</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Licensed Practitioners</p>
              </div>
              <div>
                <p className="text-xl font-black text-slate-900">Real-Time</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Live Slot Synced Logs</p>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Doctor Showcase Grid */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {specializationShowcase.map((doc, idx) => (
                <div 
                  key={idx} 
                  className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:shadow-md hover:border-indigo-200 transition-all duration-200 group relative overflow-hidden"
                >
                  {/* Subtle Colored Accent Backdrop behind images */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${doc.bgTint} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-0`} />

                  <img 
                    src={doc.image} 
                    alt={doc.doctorName} 
                    className="w-16 h-16 rounded-xl object-cover object-center border border-slate-100 shadow-inner group-hover:scale-105 transition-transform duration-200 relative z-10"
                  />

                  <div className="relative z-10 text-left">
                    <span className="bg-indigo-50 text-indigo-700 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                      {doc.specialty}
                    </span>
                    <h3 className="text-xs font-black text-slate-900 mt-2 mb-0.5 tracking-tight">
                      {doc.doctorName}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {doc.tagline}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </header>

      {/* Structural Core Features Roster Layout Segment */}
      <main id="learn-more" className="max-w-7xl mx-auto px-6 py-20 flex-1 w-full scroll-smooth">
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            End-to-End Medical Management
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-2 leading-relaxed">
            A comprehensive solution mapped cleanly for independent practitioners and consulting patients.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card Module 1 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-xs hover:shadow-md hover:border-slate-300 transition duration-200 group">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition duration-200 shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-base font-black text-slate-900 mb-2 tracking-tight uppercase">Dynamic Specialization Sorting</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Filter through registered profiles via structured selection inputs. Sort effortlessly across Cardiology, Neurology, Dermatology, and general medical rosters.
            </p>
          </div>

          {/* Card Module 2 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-xs hover:shadow-md hover:border-slate-300 transition duration-200 group">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition duration-200 shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-black text-slate-900 mb-2 tracking-tight uppercase">Automated Slot Expiration</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Time blocks auto-terminate securely if unbooked and past expiration matrices. Eliminates scheduling conflicts, managing empty hours automatically.
            </p>
          </div>

          {/* Card Module 3 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-xs hover:shadow-md hover:border-slate-300 transition duration-200 group">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition duration-200 shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-base font-black text-slate-900 mb-2 tracking-tight uppercase">Administrative Oversight</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Absolute administrative control blocks non-compliant or suspended users in real-time, enforcing security protocols immediately.
            </p>
          </div>
        </div>
      </main>

      {/* Corporate Structural Footer Grid */}
      <footer className="bg-white border-t border-slate-200 py-8 px-6 text-center text-xs font-bold text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 MedSchedule Solutions Platform Inc. All clinical documentation ledgers encrypted.</p>
          <div className="flex gap-6 text-[11px] text-slate-400/80 font-semibold">
            <span className="hover:text-slate-600 cursor-pointer">Security Ledger</span>
            <span className="hover:text-slate-600 cursor-pointer">Terms of Practice</span>
            <span className="hover:text-slate-600 cursor-pointer">Support Channel</span>
          </div>
        </div>
      </footer>
    </div>
  );
}