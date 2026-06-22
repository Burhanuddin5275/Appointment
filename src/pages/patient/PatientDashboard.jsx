import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../config/firebase";
import { ref, get, set, update, onValue, remove } from "firebase/database";
import { deleteUser } from "firebase/auth";

// ✅ Time validation helper utility to determine slot expiry parameters
const checkSlotExpired = (dayName, timeStr) => {
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const targetDayIndex = daysOfWeek.indexOf(dayName);
  if (targetDayIndex === -1) return false;

  const now = new Date();
  const currentDayIndex = now.getDay();
  
  const targetDate = new Date(now);
  const dayDifference = targetDayIndex - currentDayIndex;
  targetDate.setDate(now.getDate() + dayDifference);

  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  
  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  targetDate.setHours(hours, minutes, 0, 0);
  return targetDate < now;
};

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, appointments, profile

  // Navigation & Form states
  const [profileName, setProfileName] = useState("");
  const [profileAge, setProfileAge] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  // State trackers to read patient CNIC and Gender from database profiles
  const [profileGender, setProfileGender] = useState("");
  const [profileCNIC, setProfileCNIC] = useState("");

  // Doctor directory & search states
  const [allDoctors, setAllDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");

  // Booking engine workspace states
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorAvailability, setDoctorAvailability] = useState({});
  const [chosenDay, setChosenDay] = useState("");
  const [chosenSlotId, setChosenSlotId] = useState("");
  const [symptoms, setSymptoms] = useState("");

  // Global core tracking lists
  const [myAppointments, setMyAppointments] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const specialties = ["General Practice", "Cardiology", "Pediatrics", "Neurology", "Dermatology"];

  // Sync Base Core User Information
  useEffect(() => {
    if (!user) return;
    const userRef = ref(db, `users/${user.uid}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setProfileName(data.name || "");
        setProfileAge(data.age || "");
        setProfilePhone(data.phone || "");
        // Store gender and cnic properties during user initialization
        setProfileGender(data.gender || "");
        setProfileCNIC(data.cnic || "");
      }
    });
  }, [user]);

  // Sync Active Medical Directory Listings & Filter out doctors with no valid slots or only expired slots
  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const doctorList = Object.keys(data)
          .filter((key) => {
            const userDoc = data[key];
            if (userDoc.role !== "doctor") return false;
            
            const totalSlots = Object.values(userDoc.availability || {});
            if (totalSlots.length === 0) return false;

            const hasUnexpiredSlots = totalSlots.some(slot => {
              const isPastDue = checkSlotExpired(slot.day, slot.time);
              return !isPastDue;
            });

            return hasUnexpiredSlots;
          })
          .map((key) => ({ id: key, ...data[key] }));

        setAllDoctors(doctorList);
        setFilteredDoctors(doctorList);

        if (selectedDoctor) {
          const currentDocUpdatedData = data[selectedDoctor.id];
          if (currentDocUpdatedData && currentDocUpdatedData.availability) {
            setDoctorAvailability(currentDocUpdatedData.availability);
          } else {
            setDoctorAvailability({});
          }
        }
      }
    });
    return () => unsubscribe();
  }, [selectedDoctor]);

  // Sync: Real-time Patient Appointment Logs
  useEffect(() => {
    if (!user || allDoctors.length === 0) return;

    const appointmentsRef = ref(db, "appointments");
    const unsubscribe = onValue(appointmentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();

        // 1. Get all appointments belonging to this patient
        const rawUserAppointments = Object.values(data).filter(
          (apt) => apt.patientId === user.uid
        );

        // 2. Map and crosscheck live statuses straight from the active doctor data maps
        const verifiedActiveAppointments = rawUserAppointments.map((apt) => {
          const matchingDoctor = allDoctors.find((d) => d.id === apt.doctorId);
          
          const slotKey = `${apt.day}-${apt.timeSlot.replace(/[: ]/g, "")}`;
          const matchingSlot = matchingDoctor?.availability?.[slotKey];

          // Grab direct status from the doctor's slot object mapping tree
          const liveStatus = matchingSlot?.status || apt.status || "pending";

          return {
            ...apt,
            liveStatus: liveStatus
          };
        }).filter(
          // Doctor logic applies same filtering constraints by status tokens 
          (apt) => apt.liveStatus === "booked" || apt.liveStatus === "approved"
        );

        setMyAppointments(verifiedActiveAppointments);
      } else {
        setMyAppointments([]);
      }
    });
    return () => unsubscribe();
  }, [user, allDoctors]);

  // Handle Directory Evaluation Filters & Auto-Close panel when selected doctor goes offline
  useEffect(() => {
    let output = allDoctors;
    if (searchQuery.trim() !== "") {
      output = output.filter((doc) =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedSpecialty !== "") {
      output = output.filter((doc) => doc.specialization === selectedSpecialty);
    }
    setFilteredDoctors(output);

    // Close the calendar panel grid if another person books the last slot and drops the doctor from the list
    if (selectedDoctor && !allDoctors.some(d => d.id === selectedDoctor.id)) {
      setSelectedDoctor(null);
      setChosenDay("");
      setChosenSlotId("");
    }
  }, [searchQuery, selectedSpecialty, allDoctors, selectedDoctor]);

  const handleSelectDoctor = (doctorProfile) => {
    setSelectedDoctor(doctorProfile);
    setChosenDay("");
    setChosenSlotId("");
    setDoctorAvailability(doctorProfile.availability || {});
  };

  // Patients will NEVER see expired slots because we drop them entirely from the roster object array
  const slotsByDay = Object.values(doctorAvailability).reduce((acc, slot) => {
    const isPastDue = checkSlotExpired(slot.day, slot.time);

    // Only let the patient see it if the slot time has NOT passed yet
    if (!isPastDue) {
      if (!acc[slot.day]) acc[slot.day] = [];
      acc[slot.day].push(slot);
    }
    return acc;
  }, {});

  // Update Limited Patient Attributes
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await update(ref(db, `users/${user.uid}`), {
        name: profileName,
        age: profileAge,
        phone: profilePhone,
        // Save gender and cnic options on profile modifications updates
        gender: profileGender,
        cnic: profileCNIC
      });
      setMessage("✅ Patient profile fields updated completely.");
    } catch (err) {
      setMessage("❌ Failed to synchronize profile updates.");
    } finally {
      setLoading(false);
    }
  };

  // Complete Cascading Patient Data Erasure Setup 
  const handleDeletePatientAccount = async () => {
    const confirmation = window.confirm(
      "⚠️ CRITICAL REMINDER: Deleting your account will completely erase all of your personal data inside the Realtime Database and delete your active appointments. Continue?"
    );
    if (!confirmation) return;

    setLoading(true);
    try {
      if (myAppointments && myAppointments.length > 0) {
        for (const apt of myAppointments) {
          const slotKey = `${apt.day}-${apt.timeSlot.replace(/[: ]/g, "")}`;
          await set(ref(db, `users/${apt.doctorId}/availability/${slotKey}`), {
            id: slotKey,
            day: apt.day,
            time: apt.timeSlot,
            status: "available",
            bookedBy: null,
            patientName: null,
            patientPhone: null,
            patientAge: null,
            patientGender: null,
            patientCNIC: null,
            appointmentRef: null,
            symptoms: null
          });
          await remove(ref(db, `appointments/${apt.id}`));
        }
      }

      await remove(ref(db, `users/${user.uid}`));
      await deleteUser(user);
      alert("Patient data parameters and system access keys cleared successfully.");
    } catch (err) {
      console.error(err);
      alert("🔒 Security Challenge: Action denied due to expired authorization session keys. Please log out, log back in, and click delete again.");
    } finally {
      setLoading(false);
    }
  };

  const getSlotStatusForUser = (slot) => {
    if (slot.status === "available") return "available";
    if (slot.bookedBy === user.uid) {
      return slot.status === "approved" ? "approved" : "pending";
    }
    return "taken";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-left flex flex-col antialiased font-sans">

      {/* NAVBAR */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex justify-between items-center z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg border border-indigo-100">🩹</div>
          <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">MedCare Portal</h2>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Patient Healthcare Workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800">{profileName || "Patient Session"}</p>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Patient</p>
          </div>
          <button onClick={logout} className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer border border-rose-100">Sign Out</button>
        </div>
      </nav>

      <div className="flex flex-1 flex-col md:flex-row max-w-7xl w-full mx-auto">

        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full md:w-64 bg-white border-r border-b md:border-b-0 border-slate-200 p-4 space-y-1 shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Management Console</p>
          <button onClick={() => { setActiveTab("dashboard"); setMessage(""); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === "dashboard" ? "bg-indigo-50 text-indigo-600 border border-indigo-100/50" : "text-slate-600 hover:bg-slate-50"}`}><span className="text-base">🔍</span> Find & Book Doctor</button>
          <button onClick={() => { setActiveTab("appointments"); setMessage(""); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === "appointments" ? "bg-indigo-50 text-indigo-600 border border-indigo-100/50" : "text-slate-600 hover:bg-slate-50"}`}>
            <span className="flex items-center gap-3"><span className="text-base">📋</span> My Appointments</span>
            {myAppointments.length > 0 && <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">{myAppointments.length}</span>}
          </button>
          <button onClick={() => { setActiveTab("profile"); setMessage(""); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === "profile" ? "bg-indigo-50 text-indigo-600 border border-indigo-100/50" : "text-slate-600 hover:bg-slate-50"}`}><span className="text-base">👤</span> Profile Settings</button>
        </aside>

        <main className="flex-1 p-6 overflow-y-auto">
          {message && (
            <div className="bg-slate-900 text-white text-xs px-4 py-3 rounded-xl mb-6 font-medium shadow-sm flex items-center justify-between animate-fadeIn">
              <span>{message}</span>
              <button onClick={() => setMessage("")} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {/* VIEWPORT AREA 1: FIND AND CHOOSE CLINICIANS */}
          {activeTab === "dashboard" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Search Consultant Name</label>
                    <input type="text" placeholder="🔍 Type name to filter..." className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Filter Specialty Core</label>
                    <select className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-indigo-500 font-medium cursor-pointer" value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)}>
                      <option value="">-- All Specialties --</option>
                      {specialties.map((spec) => <option key={spec} value={spec}>{spec}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider pl-1">Available Medical Consultants</h3>
                  {filteredDoctors.length === 0 ? (
                    <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm mt-2"><span className="text-3xl">🏜️</span><p className="text-xs text-slate-400 font-bold mt-3">No specialists matched your parameters.</p></div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      {filteredDoctors.map((doc) => (
                        <div key={doc.id} className={`p-4 bg-white border rounded-2xl shadow-sm flex flex-col justify-between transition ${selectedDoctor?.id === doc.id ? "border-indigo-500 ring-2 ring-indigo-500/10" : "border-slate-200"}`}>
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="text-sm font-black text-slate-800 tracking-tight">{doc.name}</h4>
                              <span className="bg-indigo-50 border border-indigo-100/80 text-indigo-600 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0">{doc.specialization || "General"}</span>
                            </div>
                            <div className="mt-2 space-y-1 text-[11px] font-medium text-slate-500">
                              <p>🪙 Consult Fee: <span className="text-slate-800 font-bold">Rs. {doc.appointmentFees || "N/A"}</span></p>
                              <p className="truncate">📍 Location: <span className="text-slate-400 font-normal">{doc.address || "Main Clinic Desk"}</span></p>
                            </div>
                          </div>
                          <button onClick={() => handleSelectDoctor(doc)} className="mt-4 w-full bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer shadow-sm">Select & Open Schedule</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION SCHEDULER WORKSPACE */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-fit">
                <h3 className="text-sm font-black text-slate-800 mb-0.5">Appointment Request</h3>
                <p className="text-[11px] text-slate-400 mb-4">Select a doctor to request an appointment</p>
                {selectedDoctor ? (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!selectedDoctor || !chosenSlotId) return;
                    const targetSlot = doctorAvailability[chosenSlotId];
                    setLoading(true);
                    try {
                      const appointmentId = `APT-${Date.now()}`;
                      
                      // Added patientGender and patientCNIC nodes into global historic appointments tree path
                      await set(ref(db, `appointments/${appointmentId}`), {
                        id: appointmentId, 
                        patientId: user.uid, 
                        patientName: profileName || "Patient", 
                        patientPhone: profilePhone || "N/A", 
                        patientAge: profileAge || "N/A", 
                        patientGender: profileGender || "Unspecified",
                        patientCNIC: profileCNIC || "N/A",
                        patientEmail: user.email, 
                        doctorId: selectedDoctor.id, 
                        doctorName: selectedDoctor.name, 
                        specialization: selectedDoctor.specialization, 
                        address: selectedDoctor.address || "Main Clinic Desk", 
                        appointmentFees: selectedDoctor.appointmentFees || 0, 
                        day: targetSlot.day, 
                        timeSlot: targetSlot.time, 
                        symptoms: symptoms, 
                        createdAt: new Date().toISOString()
                      });

                      // Added patientGender and patientCNIC allocations into doctor availability subnode tree path
                      await update(ref(db, `users/${selectedDoctor.id}/availability/${chosenSlotId}`), {
                        status: "booked", 
                        bookedBy: user.uid, 
                        patientName: profileName || "Patient", 
                        patientPhone: profilePhone || "N/A", 
                        patientAge: profileAge || "N/A", 
                        patientGender: profileGender || "Unspecified",
                        patientCNIC: profileCNIC || "N/A",
                        appointmentRef: appointmentId, 
                        symptoms: symptoms
                      });

                      setMessage(`🎉 Request published! Awaiting verification for ${targetSlot.day} at ${targetSlot.time}.`);
                      setSymptoms(""); setSelectedDoctor(null); setChosenDay(""); setChosenSlotId("");
                    } catch (err) { console.error(err); setMessage("❌ Core booking process faulted."); } finally { setLoading(false); }
                  }} className="space-y-4">
                    <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl text-xs">
                      <span className="text-[9px] uppercase font-black tracking-wider text-indigo-500 block leading-none mb-1">Target Specialist</span>
                      <span className="font-bold text-indigo-900">{selectedDoctor.name}</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">1. Choose Appointment Day</label>
                      <select required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium cursor-pointer" value={chosenDay} onChange={(e) => { setChosenDay(e.target.value); setChosenSlotId(""); }}>
                        <option value="">-- Choose Day --</option>
                        {Object.keys(slotsByDay).map((day) => <option key={day} value={day}>{day}</option>)}
                      </select>
                    </div>
                    {chosenDay && (
                      <div className="space-y-2 animate-fadeIn">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">2. Select Time Slot</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {slotsByDay[chosenDay]?.map((slot) => {
                            const status = getSlotStatusForUser(slot);
                            const isSelected = chosenSlotId === slot.id;
                            let btnStyle = "border-slate-200 bg-white text-slate-700 hover:border-indigo-400 cursor-pointer";
                            let disabled = false;
                            let subtext = "AVAILABLE";
                            if (status === "pending") { btnStyle = "bg-amber-50 border-amber-200 text-amber-600 pointer-events-none"; disabled = true; subtext = "PENDING"; }
                            else if (status === "approved") { btnStyle = "bg-rose-50 border-rose-200 text-rose-500 pointer-events-none opacity-70"; disabled = true; subtext = "RESERVED"; }
                            else if (status === "taken") { btnStyle = "bg-slate-100 border-slate-200 text-slate-400 pointer-events-none opacity-50"; disabled = true; subtext = "OCCUPIED"; }
                            else if (isSelected) { btnStyle = "bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-sm ring-2 ring-indigo-600/10 cursor-pointer"; subtext = "SELECTED"; }
                            return (
                              <button key={slot.id} type="button" disabled={disabled} onClick={() => setChosenSlotId(slot.id)} className={`p-2 rounded-xl text-xs font-bold border text-center transition tracking-tight flex flex-col items-center justify-center min-h-[52px] ${btnStyle}`}>
                                <span>⏱️ {slot.time}</span><span className="text-[8px] font-black tracking-widest uppercase mt-0.5 opacity-80">{subtext}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {chosenSlotId && (
                      <div className="space-y-3 animate-fadeIn pt-2">
                        <textarea required rows="2" placeholder="Briefly state current symptoms..." className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-medium outline-none focus:border-indigo-500 resize-none" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
                        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white text-xs font-black py-2.5 rounded-xl tracking-wider uppercase transition shadow-md cursor-pointer disabled:opacity-50">Submit Request</button>
                      </div>
                    )}
                  </form>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl"><p className="text-xs text-slate-400 font-medium px-4">Click "Select & Open Schedule" on a doctor card to request an appointment</p></div>
                )}
              </div>
            </div>
          )}

          {/* VIEWPORT AREA 2: RESERVED APPOINTMENT LEDGER SECTIONS */}
          {activeTab === "appointments" && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-base font-black text-slate-800">Your Appointment</h3>
              {myAppointments.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm"><span className="text-3xl">📭</span><p className="text-xs text-slate-400 font-bold mt-3">No active appointments found.</p></div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {myAppointments.map((apt) => {
                    const docInfo = allDoctors.find((d) => d.id === apt.doctorId);
                    
                    // ✅ FIXED: Using direct structural slot state derived above
                    const isApproved = apt.liveStatus === "approved"; 

                    return (
                      <div key={apt.id} className={`p-5 bg-white border rounded-xl shadow-sm space-y-3.5 border-l-4 ${isApproved ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-slate-800">Dr. {apt.doctorName || docInfo?.name}</span>
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                              {apt.specialization || docInfo?.specialization}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 flex-wrap">
                            <span>📅 {apt.day}</span>
                            <span className="text-slate-300">|</span>
                            <span>⏱️ {apt.timeSlot}</span>
                            
                            {/* ✅ UPDATED: Matching badge mapping constraint (Pending/Approved) */}
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded ml-1 ${isApproved
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200/60"
                              : "bg-amber-100 text-amber-700 border border-amber-200/60 animate-pulse"
                              }`}>
                              {isApproved ? "Approved" : "Pending"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-[11px] text-slate-600 font-medium bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                          <div>
                            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Age / Gender</p>
                            <p className="text-slate-800 mt-0.5">
                              {docInfo?.age ? `${docInfo.age} Years` : "N/A"} / <span className="capitalize">{docInfo?.gender || "Unspecified"}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Contact Number</p>
                            <p className="text-slate-800 mt-0.5">{docInfo?.phone || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">City / State</p>
                            <p className="text-slate-800 mt-0.5">
                              {docInfo?.city || "N/A"}, {docInfo?.state || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Fee Billed</p>
                            <p className="text-indigo-600 font-black mt-0.5">Rs. {apt.appointmentFees || docInfo?.appointmentFees}</p>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-600 font-medium">
                          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Clinic Address</p>
                          <p className="text-slate-700 mt-0.5">{docInfo?.address || apt.address || "Main Clinic Desk"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEWPORT AREA 3: CLINICAL PATIENT PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6 max-w-xl animate-fadeIn">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div>
                  <h3 className="text-base font-black text-slate-800">Patient Profile</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Update your personal information here</p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name</label>
                    <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500" value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Age</label>
                      <input type="number" min="1" max="120" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500" value={profileAge} onChange={(e) => setProfileAge(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Contact Number</label>
                      <input type="tel" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} required />
                    </div>
                  </div>

                  {/* UI input fields inside the profile tab configuration layout matrix */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Gender</label>
                      <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium cursor-pointer outline-none focus:border-indigo-500" value={profileGender} onChange={(e) => setProfileGender(e.target.value)} required>
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">CNIC / ID Number</label>
                      <input type="text" placeholder="e.g., 37405-XXXXXXX-X" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500" value={profileCNIC} onChange={(e) => setProfileCNIC(e.target.value)} required />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:bg-indigo-700 transition cursor-pointer disabled:opacity-40">
                    {loading ? "Processing Sync..." : "Update Patient Profile"}
                  </button>
                </form>
              </div>

              {/* ACCOUNT DELETION BLOCK */}
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
                <div>
                  <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider">Danger: Delete Account</h4>
                  <p className="text-[11px] text-rose-600/90 font-medium mt-0.5">
                    Your account will be deleted with all data.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleDeletePatientAccount}
                  className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 text-white border border-rose-700 font-bold rounded-xl text-xs shadow-sm hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
                >
                  Delete Account Permanently
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}