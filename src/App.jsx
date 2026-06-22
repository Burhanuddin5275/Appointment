import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { db } from "./config/firebase";
import { ref, onValue } from "firebase/database";
import Home from "./pages/Home"; 
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin"; 
import Onboarding from "./pages/Onboarding"; 
import AdminDashboard from "./pages/admin/AdminDashboard";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import PatientDashboard from "./pages/patient/PatientDashboard";

function DashboardSwitchboard() {
  const { user, role, loading, logout, refreshRole } = useAuth();
  const [checkingRole, setCheckingRole] = useState(false);
  const [accountStatus, setAccountStatus] = useState("pending");
  const [statusLoading, setStatusLoading] = useState(true);
  const navigate = useNavigate();

  // Auto-fetch role and status tracking node if it's missing when the user lands here
  useEffect(() => {
    if (user && !role && !loading && !checkingRole) {
      setCheckingRole(true);
      if (typeof refreshRole === "function") {
        refreshRole(user.uid).finally(() => setCheckingRole(false));
      } else {
        console.error("❌ refreshRole is not defined in your AuthContext!");
        setCheckingRole(false);
      }
    }
  }, [user, role, loading, refreshRole, checkingRole]);

  // Realtime hook sync tracking current clearance status
  useEffect(() => {
    if (!user?.uid) {
      setStatusLoading(false);
      return;
    }

    const statusRef = ref(db, `users/${user.uid}/status`);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        setAccountStatus(snapshot.val());
      } else {
        setAccountStatus("pending"); // Default state initialization
      }
      setStatusLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading || checkingRole || statusLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-xs text-slate-400 font-medium animate-pulse">Verifying Account Credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin users bypass approval screening matrices instantly
  if (role === "admin") {
    return <AdminDashboard />;
  }

  if (role === "new_user") {
    return <Onboarding />;
  }

  // CRITICAL BYPASS INTERCEPTOR: Patients go straight to dashboard screens and never get blocked
  if (role === "patient") {
    return <PatientDashboard />;
  }

  // INTERCEPT VIEW LAYER A: Profile Pending Clearance by Administrator (Doctors Only Now)
  if (accountStatus === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 antialiased">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl border border-amber-200 text-xl font-bold">
            ⏳
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Account Pending Verification</h2>
            <p className="text-slate-500 text-xs leading-relaxed px-2">
              Our administrative panel is currently reviewing your medical practitioner credentials and registration data request node. You can access the main system platform immediately following verification authorization.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => logout && logout()}
              className="w-full py-2.5 bg-blue-800 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow transition cursor-pointer"
            >
              Sign Out / Disconnect Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // INTERCEPT VIEW LAYER B: Profile Review Rejected (Doctors Only Now)
  if (accountStatus === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 antialiased">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl border border-rose-200 text-xl font-bold">
            ❌
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Registration Disapproved</h2>
            <p className="text-slate-500 text-xs leading-relaxed px-2">
              The credentials submitted during onboarding registration failed validation checks. Please update your data profile to clear systemic verification protocols.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => logout && logout()}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Log Out
            </button>
            <button
              onClick={() => navigate("/onboarding")}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow transition cursor-pointer"
            >
              Edit Setup Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  // APPROVED DOCTOR ROUTING FALLBACK
  switch (role) {
    case "doctor":
      return <DoctorDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} /> 
          <Route path="/dashboard" element={<DashboardSwitchboard />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}