import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../config/firebase";
import { ref, set, remove, update, onValue } from "firebase/database";
import { deleteUser } from "firebase/auth";

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, appointments, availability, revenue, profile

  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState({});
  const [allAppointments, setAllAppointments] = useState({}); // Watching the global historic appointments tree
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [doctorProfile, setDoctorProfile] = useState({
    name: "",
    specialization: "",
    age: "",
    phone: "",
    state: "",
    city: "",
    address: "",
    appointmentFees: 0
  });

  const timeOptions = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", 
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
    "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", 
    "09:00 PM", "09:30 PM"
  ];

  const getAvailableDays = () => {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDayIndex = new Date().getDay();
    const remainingDays = [];
    for (let i = currentDayIndex + 1; i < 7; i++) {
      remainingDays.push(daysOfWeek[i]);
    }
    return remainingDays.length > 0 ? remainingDays : ["Sunday"];
  };

  const dynamicDays = getAvailableDays();

  useEffect(() => {
    if (!user?.uid) return;

    // 1. Listen to individual doctor availability and profile records
    const docRef = ref(db, `users/${user.uid}`);
    const unsubscribeDoc = onValue(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setDoctorProfile({
          name: data.name || "",
          specialization: data.specialization || "",
          age: data.age || "",
          phone: data.phone || "",
          state: data.state || "",
          city: data.city || "",
          address: data.address || "",
          appointmentFees: data.appointmentFees || 0
        });
        setSlots(data.availability || {});
      }
    });

    // 2. Listen to global historical appointments to aggregate periodic revenue streams 
    const appointmentsRef = ref(db, "appointments");
    const unsubscribeAppointments = onValue(appointmentsRef, (snapshot) => {
      if (snapshot.exists()) {
        setAllAppointments(snapshot.val());
      } else {
        setAllAppointments({});
      }
    });

    return () => {
      unsubscribeDoc();
      unsubscribeAppointments();
    };
  }, [user?.uid]);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!selectedDay || !selectedTime) {
      setMessage("⚠️ Please select both a valid day and time block segment.");
      return;
    }
    setLoading(true);
    setMessage("");

    try {
      const slotId = `${selectedDay}-${selectedTime.replace(/[: ]/g, "")}`;
      await set(ref(db, `users/${user.uid}/availability/${slotId}`), {
        id: slotId,
        day: selectedDay,
        time: selectedTime,
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

      setMessage(`✅ Target slot created for ${selectedDay} at ${selectedTime}!`);
      setSelectedTime(""); 
    } catch (err) {
      console.error(err);
      setMessage("❌ Database sync error. Failed to save window.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    try {
      const currentSlot = slots[slotId];
      if (!currentSlot) return;

      const updates = {};
      if (currentSlot.appointmentRef) {
        updates[`appointments/${currentSlot.appointmentRef}`] = null;
      }
      updates[`users/${user.uid}/availability/${slotId}`] = null;

      await update(ref(db), updates);
      setMessage("✅ Availability timeframe deleted completely.");
    } catch (err) {
      console.error("Error removing raw slot element:", err);
      setMessage("❌ Failed to cleanly purge slot tracking node.");
    }
  };

  const handleApproveAppointment = async (slotId) => {
    try {
      await update(ref(db, `users/${user.uid}/availability/${slotId}`), { status: "approved" });
    } catch (err) {
      console.error("Error processing approval:", err);
    }
  };

  const handleRejectAppointment = async (slotId) => {
    try {
      const currentSlot = slots[slotId];
      if (!currentSlot) {
        setMessage("⚠️ Target slot data could not be resolved locally.");
        return;
      }

      const updates = {};
      if (currentSlot.appointmentRef) {
        updates[`appointments/${currentSlot.appointmentRef}`] = null;
      }

      updates[`users/${user.uid}/availability/${slotId}`] = {
        id: slotId,
        day: currentSlot.day,
        time: currentSlot.time,
        status: "available",
        bookedBy: null,
        patientName: null,
        patientPhone: null,
        patientAge: null,
        patientGender: null,
        patientCNIC: null,
        appointmentRef: null,
        symptoms: null
      };

      await update(ref(db), updates);
      setMessage("⚠️ Appointment has been rejected and slot cleared back to available.");
    } catch (err) {
      console.error("Error processing rejection adjustment:", err);
      setMessage("❌ Failed to reject appointment properly.");
    }
  };

  const handleCompleteAppointment = async (slotId) => {
    try {
      const currentSlot = slots[slotId];
      if (!currentSlot) {
        setMessage("⚠️ Target slot data could not be resolved locally.");
        return;
      }

      const updates = {};

      if (currentSlot.appointmentRef) {
        updates[`appointments/${currentSlot.appointmentRef}/status`] = "completed";
        updates[`appointments/${currentSlot.appointmentRef}/completedAt`] = new Date().toISOString();
      }
      
      updates[`users/${user.uid}/availability/${slotId}`] = null;

      await update(ref(db), updates);
      setMessage("✅ Appointment finalized! Slot removed from roster and earnings historical ledger updated.");
    } catch (err) {
      console.error("Error tracking completed status execution:", err);
      setMessage("❌ Failed to process completion cleanup.");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await update(ref(db, `users/${user.uid}`), {
        name: doctorProfile.name,
        specialization: doctorProfile.specialization,
        age: doctorProfile.age,
        phone: doctorProfile.phone,
        state: doctorProfile.state,
        city: doctorProfile.city,
        address: doctorProfile.address,
        appointmentFees: Number(doctorProfile.appointmentFees)
      });
      setMessage("✅ Personal data records successfully synced down to database storage.");
    } catch (err) {
      setMessage("❌ Failed to update profile variables.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.confirm(
      "⚠️ CRITICAL WARNING: Deleting your account will completely erase all data inside the Realtime Database. Proceed?"
    );
    if (!confirmation) return;

    setLoading(true);
    try {
      if (slots && Object.keys(slots).length > 0) {
        for (const slotId in slots) {
          if (slots[slotId].appointmentRef) {
            await remove(ref(db, `appointments/${slots[slotId].appointmentRef}`));
          }
        }
      }
      await remove(ref(db, `users/${user.uid}`));
      await deleteUser(user);
      alert("Account completely removed.");
    } catch (err) {
      console.error(err);
      alert("🔒 Security Timeout: Please sign out, log back in to refresh security tokens, and try again.");
    } finally {
      setLoading(false);
    }
  };

  const slotList = Object.values(slots);

  const groupedSlots = slotList.reduce((acc, slot) => {
    const day = slot.day || "Unscheduled";
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {});

  const appointmentSlots = slotList.filter(s => s.status === "booked" || s.status === "approved");
  
  // 🟢 FIXED CALCULATION LAYER: Matches the standard 80% take-home pay factor
  const payoutFactor = (Number(doctorProfile.appointmentFees) || 0) * 0.80; 

  // 🟢 FIXED FILTER REFERENCE KEY: Swapped 'doctorUid' to 'doctorId' to correctly catch the node properties
  const verifiedDoctorAppointments = Object.values(allAppointments).filter(
    (app) => app.doctorId === user?.uid && app.status === "completed" && app.completedAt
  );

  // Time Window Instantiations 
  const currentTimestamp = new Date();
  const midnightToday = new Date(new Date().setHours(0, 0, 0, 0));
  
  const currentDayOfWeek = currentTimestamp.getDay();
  const startOfThisWeek = new Date(midnightToday);
  startOfThisWeek.setDate(midnightToday.getDate() - currentDayOfWeek); 

  const startOfThisMonth = new Date(currentTimestamp.getFullYear(), currentTimestamp.getMonth(), 1);
  const startOfThisYear = new Date(currentTimestamp.getFullYear(), 0, 1);

  // Profit calculation metrics maps
  const dailyProfit = verifiedDoctorAppointments.filter(a => new Date(a.completedAt) >= midnightToday).length * payoutFactor;
  const weeklyProfit = verifiedDoctorAppointments.filter(a => new Date(a.completedAt) >= startOfThisWeek).length * payoutFactor;
  const monthlyProfit = verifiedDoctorAppointments.filter(a => new Date(a.completedAt) >= startOfThisMonth).length * payoutFactor;
  const yearlyProfit = verifiedDoctorAppointments.filter(a => new Date(a.completedAt) >= startOfThisYear).length * payoutFactor;
  const grandTotalProfit = verifiedDoctorAppointments.length * payoutFactor;

  return (
    <div className="min-h-screen bg-slate-50 text-left flex flex-col antialiased font-sans">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex justify-between items-center z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg border border-indigo-100">🩺</div>
          <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">MedCare Core</h2>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Medical Practitioner Control Deck</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800">{doctorProfile.name || "Practitioner"}</p>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{doctorProfile.specialization || "General Medicine"}</p>
          </div>
          <button onClick={logout} className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer border border-rose-100">Sign Out</button>
        </div>
      </nav>

      <div className="flex flex-1 flex-col md:flex-row max-w-7xl w-full mx-auto">
        <aside className="w-full md:w-64 bg-white border-r border-b md:border-b-0 border-slate-200 p-4 space-y-1 shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Management Framework</p>
          <button onClick={() => { setActiveTab("dashboard"); setMessage(""); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === "dashboard" ? "bg-indigo-50 text-indigo-600 border border-indigo-100/50" : "text-slate-600 hover:bg-slate-50"}`}><span>📊</span> Overview Dashboard</button>
          <button onClick={() => { setActiveTab("appointments"); setMessage(""); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === "appointments" ? "bg-indigo-50 text-indigo-600 border border-indigo-100/50" : "text-slate-600 hover:bg-slate-50"}`}>
            <span className="flex items-center gap-3"><span>📅</span> Patient Appointments</span>
            {appointmentSlots.filter(s => s.status === "booked").length > 0 && (
              <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">{appointmentSlots.filter(s => s.status === "booked").length}</span>
            )}
          </button>
          <button onClick={() => { setActiveTab("availability"); setMessage(""); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === "availability" ? "bg-indigo-50 text-indigo-600 border border-indigo-100/50" : "text-slate-600 hover:bg-slate-50"}`}><span>⏱️</span> Availability Roster</button>
          <button onClick={() => { setActiveTab("revenue"); setMessage(""); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === "revenue" ? "bg-indigo-50 text-indigo-600 border border-indigo-100/50" : "text-slate-600 hover:bg-slate-50"}`}><span>💸</span> Revenue Analytics</button>
          <button onClick={() => { setActiveTab("profile"); setMessage(""); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === "profile" ? "bg-indigo-50 text-indigo-600 border border-indigo-100/50" : "text-slate-600 hover:bg-slate-50"}`}><span>👤</span> Practitioner Profile</button>
        </aside>

        <main className="flex-1 p-6 overflow-y-auto">
          {message && (
            <div className="bg-slate-900 text-white text-xs px-4 py-3 rounded-xl mb-6 font-medium flex items-center justify-between">
              <span>{message}</span>
              <button onClick={() => setMessage("")} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Slots Allocation</p>
                  <p className="text-2xl font-black text-slate-800 mt-2">{slotList.length} Nodes</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Orders</p>
                  <p className="text-2xl font-black text-indigo-600 mt-2">{appointmentSlots.filter(s => s.status === "booked").length} Awaiting</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Realized Income (All-Time)</p>
                  <p className="text-2xl font-black text-emerald-600 mt-2">Rs. {grandTotalProfit.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Quick Allocation Ledger Overview</h3>
                {slotList.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium py-2">No active timeframes registered inside availability structures.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-2">
                    {slotList.map((slot) => (
                      <div key={slot.id} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-700">{slot.day}</span>
                          <span className="mx-2 text-slate-300">|</span>
                          <span className="text-slate-500 font-medium">{slot.time}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider ${
                          slot.status === "available" ? "bg-slate-100 text-slate-600" :
                          slot.status === "booked" ? "bg-amber-100 text-amber-700 animate-pulse" :
                          slot.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                        }`}>{slot.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "appointments" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1">Patient Appointments Verification Roster</h3>
                <p className="text-xs text-slate-400 mb-6 font-medium">Verify incoming practitioner allocation slot bindings and process final status.</p>

                {appointmentSlots.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                    <p className="text-slate-400 text-xs font-medium">No assigned consultations or scheduling sequences found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointmentSlots.map((slot) => (
                      <div key={slot.id} className="border border-slate-200 rounded-xl p-5 flex flex-col space-y-4 bg-slate-50/50">
                        <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <span className="px-2 py-0.5 bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-[9px] uppercase rounded">
                              {slot.day} - {slot.time}
                            </span>
                            <h4 className="text-sm font-black text-slate-800 mt-1.5">{slot.patientName || "Anonymous Patient"}</h4>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded ${
                            slot.status === "booked" ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"
                          }`}>{slot.status === "booked" ? "Awaiting Response" : "Approved Consultation"}</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium">
                          <div><p className="text-slate-400 text-[10px] font-bold uppercase">Age Profile</p><p className="text-slate-700 mt-0.5">{slot.patientAge || "N/A"} Years</p></div>
                          <div><p className="text-slate-400 text-[10px] font-bold uppercase">Gender Class</p><p className="text-slate-700 mt-0.5 capitalize">{slot.patientGender || "Unspecified"}</p></div>
                          <div><p className="text-slate-400 text-[10px] font-bold uppercase">Contact Phone</p><p className="text-slate-700 mt-0.5">{slot.patientPhone || "N/A"}</p></div>
                          <div><p className="text-slate-400 text-[10px] font-bold uppercase">National CNIC ID</p><p className="text-slate-700 mt-0.5">{slot.patientCNIC || "N/A"}</p></div>
                        </div>

                        <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs">
                          <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wide">Symptoms / Directives Note Log</p>
                          <p className="text-slate-600 mt-1 font-medium italic">"{slot.symptoms || "No notes submitted by the patient."}"</p>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-2">
                          {slot.status === "booked" ? (
                            <>
                              <button onClick={() => handleRejectAppointment(slot.id)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl transition">Reject</button>
                              <button onClick={() => handleApproveAppointment(slot.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition">Approve</button>
                            </>
                          ) : (
                            <button onClick={() => handleCompleteAppointment(slot.id)} className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition">Mark as Completed</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "availability" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Provision New Availability Slot</h3>
                <form onSubmit={handleAddSlot} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase">Day Selection</label>
                    <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} required>
                      <option value="">Select Target Day</option>
                      {dynamicDays.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase">Time Window</label>
                    <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} required>
                      <option value="">Select Time Slot</option>
                      {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={loading} className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm">Generate Window Entry</button>
                </form>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Active Calendars Mapping Matrix</h3>
                {Object.keys(groupedSlots).length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium py-4">No active rosters managed.</p>
                ) : (
                  <div className="space-y-6">
                    {Object.keys(groupedSlots).map((day) => (
                      <div key={day} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                        <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-100 pb-2 mb-3 tracking-wide">{day} Roster Grid</h4>
                        <div className="flex flex-wrap gap-2">
                          {groupedSlots[day].map((slot) => (
                            <div key={slot.id} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs text-xs">
                              <span className="font-medium text-slate-700">{slot.time}</span>
                              <span className={`w-1.5 h-1.5 rounded-full ${slot.status === "available" ? "bg-slate-300" : slot.status === "completed" ? "bg-emerald-500" : "bg-amber-500"}`} />
                              {slot.status === "available" && (
                                <button onClick={() => handleDeleteSlot(slot.id)} className="text-slate-300 hover:text-rose-600 ml-1 text-[10px]">✕</button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "revenue" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1">
                  Micro-Period Profit Ledger
                </h3>
                <p className="text-xs text-slate-400 mb-6 font-medium">
                  Realtime periodic overview of historical payouts after processing the flat 20% system commission deduction.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Daily Profit (Today)</p>
                    <p className="text-xl font-black text-emerald-600 mt-1">Rs. {dailyProfit.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Weekly Earnings</p>
                    <p className="text-xl font-black text-indigo-600 mt-1">Rs. {weeklyProfit.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Monthly Yield</p>
                    <p className="text-xl font-black text-indigo-600 mt-1">Rs. {monthlyProfit.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Yearly Summary</p>
                    <p className="text-xl font-black text-slate-900 mt-1">Rs. {yearlyProfit.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-indigo-900 rounded-xl text-white flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Gross Lifetime Intake (Net 80%)</p>
                    <p className="text-xs text-indigo-100/80 mt-0.5">Calculated across {verifiedDoctorAppointments.length} overall completed diagnostic records.</p>
                  </div>
                  <p className="text-2xl font-black text-teal-300">Rs. {grandTotalProfit.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="max-w-xl space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-5">Clinical Parameters Calibration</h3>
                <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs font-bold text-slate-600">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5 uppercase">Full Practitioner Name</label>
                      <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none" value={doctorProfile.name} onChange={(e) => setDoctorProfile({...doctorProfile, name: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block mb-1.5 uppercase">Specialization Branch</label>
                      <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none" value={doctorProfile.specialization} onChange={(e) => setDoctorProfile({...doctorProfile, specialization: e.target.value})} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block mb-1.5 uppercase">Age (Years)</label>
                      <input type="number" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none" value={doctorProfile.age} onChange={(e) => setDoctorProfile({...doctorProfile, age: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block mb-1.5 uppercase">Phone Number</label>
                      <input type="tel" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none" value={doctorProfile.phone} onChange={(e) => setDoctorProfile({...doctorProfile, phone: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block mb-1.5 uppercase">Consultation Fees (PKR)</label>
                      <input type="number" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none" value={doctorProfile.appointmentFees} onChange={(e) => setDoctorProfile({...doctorProfile, appointmentFees: e.target.value})} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5 uppercase">State / Province</label>
                      <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none" value={doctorProfile.state} onChange={(e) => setDoctorProfile({...doctorProfile, state: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block mb-1.5 uppercase">City Node</label>
                      <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none" value={doctorProfile.city} onChange={(e) => setDoctorProfile({...doctorProfile, city: e.target.value})} required />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1.5 uppercase">Clinical Clinic Address</label>
                    <textarea rows="3" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none resize-none" value={doctorProfile.address} onChange={(e) => setDoctorProfile({...doctorProfile, address: e.target.value})} required />
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:bg-indigo-700 transition">
                    {loading ? "Updating Node..." : "Update Clinical Profile Data"}
                  </button>
                </form>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
                <div>
                  <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider">Danger Zone: Purge System Core Account</h4>
                  <p className="text-[11px] text-rose-600/90 font-medium mt-0.5">Your account will be deleted with all data in real-time storage ledger nodes.</p>
                </div>
                <button type="button" disabled={loading} onClick={handleDeleteAccount} className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition">Delete Account Link Permanently</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}