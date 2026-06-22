import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../config/firebase";
import { ref, onValue, update, remove } from "firebase/database";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard"); 
  const [systemUsers, setSystemUsers] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

  // State triggers for Submenu items and View Modals
  const [doctorFilter, setDoctorFilter] = useState("all"); // all, pending, rejected, suspended
  const [isDoctorMenuExpanded, setIsDoctorMenuExpanded] = useState(false);
  const [selectedUserModal, setSelectedUserModal] = useState(null);

  useEffect(() => {
    const usersTreeRef = ref(db, "users");
    const unsubscribeUsers = onValue(usersTreeRef, (snapshot) => {
      if (snapshot.exists()) {
        const rawData = snapshot.val();
        const structuralList = Object.keys(rawData).map((uid) => ({
          uid,
          ...rawData[uid],
          status: rawData[uid].status || "pending",
          cnic: rawData[uid].cnic || "Not Disclosed",
          licenseNo: rawData[uid].licenseNumber || rawData[uid].licenseNo || rawData[uid].license || "Pending Verification",
          state: rawData[uid].state || "N/A",
          city: rawData[uid].city || "N/A",
          address: rawData[uid].address || "No Registered Address Data",
          gender: rawData[uid].gender || "Unspecified",
          age: rawData[uid].age || "N/A"
        }));
        setSystemUsers(structuralList);
      } else {
        setSystemUsers([]);
      }
    });

    const appointmentsTreeRef = ref(db, "appointments");
    const unsubscribeApts = onValue(appointmentsTreeRef, (snapshot) => {
      if (snapshot.exists()) {
        const rawApts = snapshot.val();
        const mappedApts = Object.keys(rawApts).map(key => ({
          id: key,
          ...rawApts[key]
        }));
        setAllAppointments(mappedApts);
      } else {
        setAllAppointments([]);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeApts();
    };
  }, []);

  const doctorsList = systemUsers.filter((u) => u.role === "doctor");
  const patientsList = systemUsers.filter((u) => u.role === "patient");

  // Dynamic filter supporting a unified breakdown view
  const filteredDoctors = doctorsList.filter(d => doctorFilter === "all" ? true : d.status === doctorFilter);

  // Completed slots array compilation used inside profit calculations and grids
  const completedAppointments = allAppointments.filter(apt => apt.status === "completed");

  // Accrued flat 20% platform commission logic ledger iteration mapping
  const netCommissionProfit = completedAppointments.reduce((acc, currentApt) => {
    const targetDoctor = doctorsList.find(doc => doc.uid === currentApt.doctorId);
    const doctorConsultationFee = targetDoctor ? parseFloat(targetDoctor.appointmentFees) || 0 : parseFloat(currentApt.fees) || 0;
    return acc + (doctorConsultationFee * 0.20); 
  }, 0);

  const handleUpdateStatus = async (uid, newStatus) => {
    try {
      await update(ref(db, `users/${uid}`), { status: newStatus });
      if (selectedUserModal && selectedUserModal.uid === uid) {
        setSelectedUserModal(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error("Critical failure during status operation:", err);
    }
  };

  const handleProfilePurge = async (uid) => {
    if (window.confirm("⚠️ ATTENTION: Permanently delete this account profile log node? This operation cannot be undone.")) {
      try {
        await remove(ref(db, `users/${uid}`));
        setSelectedUserModal(null);
      } catch (err) {
        console.error("Critical failure executing data deletion routine:", err);
      }
    }
  };

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-blue-700/50 flex items-center justify-between bg-blue-700/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 border border-white/30 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-inner">🏥</div>
          <div>
            <h2 className="text-md font-bold text-white tracking-tight leading-none">MedCare Core</h2>
            <p className="text-xs text-white mt-1">Admin Operations</p>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-blue-100 hover:text-white text-lg p-1">✕</button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <p className="px-3 text-sm font-semibold text-white mb-2">Main Controls</p>
        
        <button 
          onClick={() => { setActiveTab("dashboard"); setIsSidebarOpen(false); }} 
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === "dashboard" ? "bg-white text-blue-600 shadow-md" : "text-white hover:bg-white/10"}`}
        >
          <span>📊</span> Console Dashboard
        </button>

        {/* COMPONENT ACCORDION INTERACTION CONTAINER TRIGGER */}
        <div>
          <button 
            onClick={() => setIsDoctorMenuExpanded(!isDoctorMenuExpanded)} 
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === "doctors" ? "bg-white/10 text-white" : "text-white hover:bg-white/10"}`}
          >
            <div className="flex items-center gap-3">
              <span>🩺</span> Doctors
              {doctorsList.filter(d => d.status === "pending").length > 0 && (
                <span className="bg-amber-400 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded-md">{doctorsList.filter(d => d.status === "pending").length}</span>
              )}
            </div>
            <span className="text-[10px] text-blue-200">{isDoctorMenuExpanded ? "▼" : "▶"}</span>
          </button>

          {/* DYNAMIC EXPANDABLE SUB-MENU DROPDOWN */}
          {isDoctorMenuExpanded && (
            <div className="mt-1 ml-4 pl-2 border-l border-blue-400/30 space-y-1">
              <button 
                onClick={() => { setDoctorFilter("all"); setActiveTab("doctors"); setIsSidebarOpen(false); }}
                className={`w-full text-left py-2 px-3 rounded-lg text-[11px] font-medium transition ${activeTab === "doctors" && doctorFilter === "all" ? "bg-white text-blue-600 font-bold shadow-sm" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}
              >
                • View All Doctors ({doctorsList.length})
              </button>
              <button 
                onClick={() => { setDoctorFilter("pending"); setActiveTab("doctors"); setIsSidebarOpen(false); }}
                className={`w-full text-left py-2 px-3 rounded-lg text-[11px] font-medium transition ${activeTab === "doctors" && doctorFilter === "pending" ? "bg-white text-blue-600 font-bold shadow-sm" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}
              >
                • Pending Review ({doctorsList.filter(d => d.status === "pending").length})
              </button>
              <button 
                onClick={() => { setDoctorFilter("rejected"); setActiveTab("doctors"); setIsSidebarOpen(false); }}
                className={`w-full text-left py-2 px-3 rounded-lg text-[11px] font-medium transition ${activeTab === "doctors" && doctorFilter === "rejected" ? "bg-white text-blue-600 font-bold shadow-sm" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}
              >
                • Registration Rejected
              </button>
              <button 
                onClick={() => { setDoctorFilter("suspended"); setActiveTab("doctors"); setIsSidebarOpen(false); }}
                className={`w-full text-left py-2 px-3 rounded-lg text-[11px] font-medium transition ${activeTab === "doctors" && doctorFilter === "suspended" ? "bg-white text-blue-600 font-bold shadow-sm" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}
              >
                • Suspended Doctors
              </button>
            </div>
          )}
        </div>

        <button 
          onClick={() => { setActiveTab("patients"); setIsSidebarOpen(false); }} 
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === "patients" ? "bg-white text-blue-600 shadow-md" : "text-white hover:bg-white/10"}`}
        >
          <span>🩹</span> Patient Directories
        </button>

        <p className="px-3 pt-4 text-[9px] font-black uppercase tracking-widest text-white mb-2">Financial Accounting</p>

        <button 
          onClick={() => { setActiveTab("profit"); setIsSidebarOpen(false); }} 
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === "profit" ? "bg-white text-blue-600 shadow-md" : "text-white hover:bg-white/10"}`}
        >
          <span>💰</span> Net 20% Profits
        </button>
      </nav>

      <div className="p-4 border-t border-blue-700/50 bg-blue-700/10">
        <button onClick={logout} className="w-full bg-white hover:bg-rose-600 text-blue-600 hover:text-white border border-blue-400/30 transition py-2.5 px-3 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-2">
          <span>🔌</span> Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased font-sans text-slate-600 text-left">
      <aside className="hidden md:flex w-64 bg-blue-600 text-white flex-col fixed inset-y-0 left-0 border-r border-blue-700 z-30 shadow-md">
        <SidebarContent />
      </aside>
      
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-blue-600 text-white flex flex-col z-50 transform transition-transform duration-200 md:hidden ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent />
      </aside>

      <main className="flex-1 md:pl-64 bg-slate-50 min-h-screen flex flex-col w-full overflow-hidden">
        <header className="bg-white h-16 border-b border-slate-200 px-4 md:px-8 flex justify-between items-center sticky top-0 z-20 w-full">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-600 hover:text-blue-600 text-xl">☰</button>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              {activeTab === "dashboard" && "Operational Console"}
              {activeTab === "doctors" && `Doctors Verification Deck - Filter: ${doctorFilter}`}
              {activeTab === "patients" && "Patients Deck"}
              {activeTab === "profit" && "Income Statement"}
            </h1>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-[11px] text-slate-400 font-bold animate-pulse">Syncing Structural Core System Matrices...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OPERATIONAL CONSOLE */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
                      <span className="text-xl">🩺</span>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-2">Registered Doctors</h4>
                      <p className="text-2xl font-black text-slate-800 mt-1">{doctorsList.length}</p>
                    </div>
                    <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
                      <span className="text-xl">🩹</span>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-2">Registered Patients</h4>
                      <p className="text-2xl font-black text-slate-800 mt-1">{patientsList.length}</p>
                    </div>
                    <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
                      <span className="text-xl">📅</span>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-2">Appointments</h4>
                      <p className="text-2xl font-black text-slate-800 mt-1">{allAppointments.length}</p>
                    </div>
                    <div className="bg-white border border-blue-200 bg-blue-50/30 p-5 rounded-2xl shadow-xs">
                      <span className="text-xl">💰</span>
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-wider mt-2">Net 20% Profits</h4>
                      <p className="text-2xl font-black text-blue-700 mt-1">Rs. {netCommissionProfit.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRACTITIONER LICENSURE ROSTER */}
              {activeTab === "doctors" && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Doctors Portal Setup</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Manage and verify doctor profiles, licenses, and specialties.</p>
                  </div>

                  {filteredDoctors.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-10 font-medium">No doctor profiles found under "{doctorFilter}" status.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider bg-slate-50/50">
                            <th className="py-3 px-4">Doctor Name</th>
                            <th className="py-3 px-4">Specialization</th>
                            <th className="py-3 px-4">License Number</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filteredDoctors.map((doc) => (
                            <tr key={doc.uid} className="hover:bg-slate-50/50 transition">
                              <td className="py-3 px-4 font-black text-slate-800">{doc.name || "N/A"}</td>
                              <td className="py-3 px-4">{doc.specialization || "N/A"}</td>
                              <td className="py-3 px-4"><code className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold font-mono border border-blue-100">{doc.licenseNo}</code></td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide border ${
                                  doc.status === "approved" ? "bg-blue-50 border-blue-200 text-blue-700" :
                                  doc.status === "pending" ? "bg-amber-50 border-amber-200 text-amber-700" :
                                  "bg-rose-50 border-rose-200 text-rose-700"
                                }`}>
                                  {doc.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button 
                                  onClick={() => setSelectedUserModal(doc)}
                                  className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 rounded-xl transition cursor-pointer font-bold inline-flex items-center gap-1.5 text-[11px]"
                                >
                                  <span>👁️</span> View Profile
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: VERIFIED PATIENT DIRECTORY */}
              {activeTab === "patients" && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                  <div className="border-b border-slate-100 pb-4 mb-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Active Patient</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">View and manage all active patient profiles</p>
                  </div>

                  {patientsList.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-10 font-medium">No user patient logs matching criteria configuration records stored inside real-time trees.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider bg-slate-50/50">
                            <th className="py-3 px-4">Patient Name</th>
                            <th className="py-3 px-4">Contact Number</th>
                            <th className="py-3 px-4">Location</th>
                            <th className="py-3 px-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {patientsList.map((pat) => (
                            <tr key={pat.uid} className="hover:bg-slate-50/50 transition">
                              <td className="py-3 px-4 font-black text-slate-800">{pat.name || "N/A"}</td>
                              <td className="py-3 px-4">{pat.phone || "N/A"}</td>
                              <td className="py-3 px-4">{pat.city} ({pat.state})</td>
                              <td className="py-3 px-4 text-center">
                                <button 
                                  onClick={() => setSelectedUserModal(pat)}
                                  className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-xl transition font-bold text-[11px]"
                                >
                                  🔍 Review Profile
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: TREASURY PROFITS REVENUE TALLY LEDGER */}
              {activeTab === "profit" && (
                <div className="space-y-6">
                  <div className="bg-blue-600 text-white p-6 rounded-2xl border border-blue-700 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight">Income Statement</h3>
                      <p className="text-xs text-blue-100 mt-0.5">Real-time 20% commission rate deducted from completed doctor appointments.</p>
                    </div>
                    <div className="text-right sm:border-l sm:border-blue-500 sm:pl-6">
                      <p className="text-[10px] font-black uppercase text-blue-200 tracking-wider">Total Revenue</p>
                      <p className="text-2xl font-black text-white mt-0.5">Rs. {netCommissionProfit.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                    <div className="border-b border-slate-100 pb-4 mb-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Transactional Settlement Audits</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Individual breakdown tracking commission revenue payouts.</p>
                    </div>

                    {completedAppointments.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-12 font-medium">No completed consultation logs available to generate revenue reports.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider bg-slate-50/50">
                              <th className="py-3 px-4">Appointment ID</th>
                              <th className="py-3 px-4">Doctor Profile</th>
                              <th className="py-3 px-4">Appointment Day</th>
                              <th className="py-3 px-4">Appointment Fees</th>
                              <th className="py-3 px-4 text-right">Platform Commission (20%)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {completedAppointments.map((apt) => {
                              const associatedDoctor = doctorsList.find(doc => doc.uid === apt.doctorId);
                              const totalBaseFee = associatedDoctor ? parseFloat(associatedDoctor.appointmentFees) || 0 : parseFloat(apt.fees) || 0;
                              const directCommission = totalBaseFee * 0.20;

                              return (
                                <tr key={apt.id} className="hover:bg-slate-50/50 transition">
                                  <td className="py-3 px-4 font-mono font-bold text-slate-500 truncate max-w-[120px]">{apt.id}</td>
                                  <td className="py-3 px-4">
                                    <div className="font-black text-slate-800">{associatedDoctor ? associatedDoctor.name : "Unknown Doctor Identity"}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">{associatedDoctor?.specialization || "N/A Specialty"}</div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-700">{apt.day || apt.date || "N/A"}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">{apt.timeSlot || "N/A Time Window"}</div>
                                  </td>
                                  <td className="py-3 px-4 font-semibold text-slate-600">Rs. {totalBaseFee.toLocaleString()}</td>
                                  <td className="py-3 px-4 text-right font-black text-blue-600 bg-blue-50/40">Rs. {directCommission.toLocaleString()}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* POPUP SYSTEM INTERCEPT MODAL GRID COMPONENT */}
      {selectedUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl p-6 text-xs text-left font-sans animate-fadeIn space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded font-black text-[9px] uppercase tracking-wider text-blue-600">{selectedUserModal.role} Profile</span>
                <h3 className="text-base font-black text-slate-800 mt-1">{selectedUserModal.name || "Unregistered Identity"}</h3>
              </div>
              <button onClick={() => setSelectedUserModal(null)} className="text-slate-400 hover:text-slate-700 font-bold p-1 text-sm">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/50 font-medium">
              <div><p className="text-slate-400 text-[10px] font-bold uppercase">Age</p><p className="text-slate-800 font-bold mt-0.5">{selectedUserModal.age} Years</p></div>
              <div><p className="text-slate-400 text-[10px] font-bold uppercase">Gender</p><p className="text-slate-800 font-bold mt-0.5 capitalize">{selectedUserModal.gender}</p></div>
              <div className="col-span-2"><p className="text-slate-400 text-[10px] font-bold uppercase">National CNIC</p><p className="text-slate-800 font-mono font-bold mt-0.5">{selectedUserModal.cnic}</p></div>
              <div className="col-span-2"><p className="text-slate-400 text-[10px] font-bold uppercase">Contact Number</p><p className="text-slate-800 font-bold mt-0.5">{selectedUserModal.phone || "No phone link available"}</p></div>
              
              {selectedUserModal.role === "doctor" && (
                <>
                  <div className="col-span-2"><p className="text-slate-400 text-[10px] font-bold uppercase">Licensure Number</p><p className="text-blue-700 font-mono font-bold mt-0.5">{selectedUserModal.licenseNo}</p></div>
                  <div><p className="text-slate-400 text-[10px] font-bold uppercase">Consultation Fees</p><p className="text-slate-800 font-bold mt-0.5">Rs. {Number(selectedUserModal.appointmentFees || 0).toLocaleString()}</p></div>
                  <div><p className="text-slate-400 text-[10px] font-bold uppercase">Specialization</p><p className="text-slate-800 font-bold mt-0.5">{selectedUserModal.specialization || "N/A"}</p></div>
                </>
              )}

              <div className="col-span-2"><p className="text-slate-400 text-[10px] font-bold uppercase">Address</p><p className="text-slate-800 mt-0.5 font-medium">{selectedUserModal.address}, {selectedUserModal.city}, {selectedUserModal.state}</p></div>
              <div><p className="text-slate-400 text-[10px] font-bold uppercase">Status</p><p className="text-slate-800 mt-0.5 uppercase font-black tracking-wide">{selectedUserModal.status}</p></div>
            </div>

            {/* ACTION FOOTER BUTTON WORKFLOW DECK */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-between items-center">
              <div>
                <button 
                  onClick={() => handleProfilePurge(selectedUserModal.uid)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl transition text-[11px]"
                >
                  Delete Record
                </button>
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                {selectedUserModal.role === "doctor" ? (
                  <>
                    {/* pending state workflow options */}
                    {selectedUserModal.status === "pending" && (
                      <>
                        <button onClick={() => handleUpdateStatus(selectedUserModal.uid, "rejected")} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition">Rejected</button>
                        <button onClick={() => handleUpdateStatus(selectedUserModal.uid, "approved")} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition">Approved</button>
                      </>
                    )}
                    
                    {/* approved state workflow options */}
                    {selectedUserModal.status === "approved" && (
                      <>
                        <button onClick={() => handleUpdateStatus(selectedUserModal.uid, "rejected")} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition">Disapprove (Reject)</button>
                        <button onClick={() => handleUpdateStatus(selectedUserModal.uid, "suspended")} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition">Suspend</button>
                      </>
                    )}
                    
                    {/* suspended state workflow options */}
                    {selectedUserModal.status === "suspended" && (
                      <button onClick={() => handleUpdateStatus(selectedUserModal.uid, "approved")} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition">Approve</button>
                    )}

                    {/* rejected state fallback validation option */}
                    {selectedUserModal.status === "rejected" && (
                      <button onClick={() => handleUpdateStatus(selectedUserModal.uid, "approved")} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition">Re-Approve Access</button>
                    )}
                  </>
                ) : (
                  <button onClick={() => setSelectedUserModal(null)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition w-full sm:w-auto text-center">Close Registry View</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}