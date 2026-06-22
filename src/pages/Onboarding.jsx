import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import { ref, set, get } from "firebase/database";

// Complete Pakistan Regional Data Dictionary
const pakistanRegions = {
  "Punjab": ["Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala", "Sialkot", "Bahawalpur", "Sargodha", "Sahiwal", "Sheikhupura", "Rahim Yar Khan", "Jhang", "Gujrat"],
  "Sindh": ["Karachi", "Hyderabad", "Sukkur", "Larkana", "Mirpur Khas", "Nawabshah", "Jacobabad", "Shikarpur", "Khairpur"],
  "Khyber Pakhtunkhwa": ["Peshawar", "Mardan", "Mingora", "Abbottabad", "Kohat", "Dera Ismail Khan", "Swat", "Nowshera"],
  "Balochistan": ["Quetta", "Khuzdar", "Turbat", "Chaman", "Sibi", "Gwadar", "Hub", "Dera Murad Jamali"],
  "Islamabad Capital Territory": ["Islamabad"],
  "Gilgit-Baltistan": ["Gilgit", "Skardu", "Hunza", "Chilas"],
  "Azad Jammu & Kashmir": ["Muzaffarabad", "Mirpur", "Rawalakot", "Kotli"]
};

export default function Onboarding() {
  const { user, refreshRole } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("patient");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  // Doctor Specific States
  const [specialization, setSpecialization] = useState("General Medicine");
  const [experienceYears, setExperienceYears] = useState("");
  const [appointmentFees, setAppointmentFees] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState("");

  // Pre-populate data properties if returning from a "rejected" profile state configuration
  useEffect(() => {
    if (!user?.uid) return;
    get(ref(db, `users/${user.uid}`)).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.role && data.role !== "new_user") setRole(data.role);
        setName(data.name || "");
        setAge(data.age || "");
        setGender(data.gender || "Male");

        // Handle loading formatted fields safely
        if (data.phone) {
          setPhone(data.phone.startsWith("+92") ? data.phone.replace("+92", "") : data.phone);
        }
        setCnic(data.cnic || "");
        setState(data.state || "");
        setCity(data.city || "");
        setAddress(data.address || "");
        setSpecialization(data.specialization || "General Medicine");
        setExperienceYears(data.experienceYears || "");
        setAppointmentFees(data.appointmentFees || "");
        setLicenseNumber(data.licenseNumber || "");
      }
      setFetchLoading(false);
    }).catch(() => setFetchLoading(false));
  }, [user]);

  // Handle auto-formatting for Pakistan CNIC (XXXXX-XXXXXXX-X)
  const handleCnicChange = (e) => {
    let input = e.target.value.replace(/\D/g, ""); // Remove non-digits
    if (input.length > 13) input = input.substr(0, 13); // Max 13 digits

    let formatted = "";
    if (input.length > 0) {
      formatted += input.substr(0, 5);
      if (input.length > 5) {
        formatted += "-" + input.substr(5, 7);
        if (input.length > 12) {
          formatted += "-" + input.substr(12, 1);
        }
      }
    }
    setCnic(formatted);
  };

  // Handle clean digits entry for Phone Number (without country code)
  const handlePhoneChange = (e) => {
    let input = e.target.value.replace(/\D/g, ""); // Remove non-digits
    if (input.startsWith("92")) input = input.substring(2); // Strip leading 92
    if (input.startsWith("0")) input = input.substring(1); // Strip leading zero
    if (input.length > 10) input = input.substr(0, 10); // Max 10 digits remaining
    setPhone(input);
  };

  const handleFormSubmission = async (e) => {
    e.preventDefault();
    if (!user) return;
    setError("");

    // Validate CNIC Formatting
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicRegex.test(cnic)) {
      setError("Please input a valid Pakistani CNIC format (e.g., 42101-1234567-1).");
      return;
    }

    // Validate Phone Number Length (must be exactly 10 digits after +92)
    if (phone.length !== 10) {
      setError("Please input a valid 10-digit mobile number (e.g., 3001234567).");
      return;
    }

    setLoading(true);
    const fullyQualifiedPhoneNumber = `+92${phone}`;

    // CRITICAL UPDATE: Patients are immediately approved, Doctors remain pending for administrative validation
    const accountStatus = role === "patient" ? "approved" : "pending";

    const commonBasePayload = {
      uid: user.uid,
      email: user.email,
      name,
      age: parseInt(age),
      gender,
      phone: fullyQualifiedPhoneNumber,
      cnic,
      state,
      city,
      address,
      role,
      status: accountStatus
    };

    const tailoredPayload = role === "doctor" ? {
      ...commonBasePayload,
      specialization,
      experienceYears: parseInt(experienceYears),
      appointmentFees: parseFloat(appointmentFees),
      licenseNumber
    } : commonBasePayload;

    try {
      await set(ref(db, `users/${user.uid}`), tailoredPayload);
      await refreshRole(user.uid);
      navigate("/dashboard");
    } catch (err) {
      console.error("Critical failure during configuration save lifecycle operations:", err);
      setError("Failed to sync profile configuration to database. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8 antialiased text-left">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <h2 className="text-lg font-black tracking-tight uppercase">Account Onboarding Profile</h2>
          <p className="text-white/80 text-xs mt-1">Please fill in your details to complete your account setup</p>
        </div>

        <form onSubmit={handleFormSubmission} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Select Account Role Profile Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole("patient")} className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${role === "patient" ? "bg-indigo-50 border-indigo-500 text-indigo-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                🩹 Medical Patient
              </button>
              <button type="button" onClick={() => setRole("doctor")} className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${role === "doctor" ? "bg-indigo-50 border-indigo-500 text-indigo-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                🩺 Certified Doctor
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
              <input type="text" required placeholder="Full Name" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">National CNIC (xxxxx-xxxxxxx-x)</label>
              <input type="text" required placeholder="42201-1234567-1" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-indigo-500" value={cnic} onChange={handleCnicChange} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Age</label>
              <input type="number" required placeholder="Age" min="18" max="100" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Gender</label>
              <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Mobile Contact No</label>
              <div className="relative flex items-center w-full">
                <span className="absolute left-0 top-0 bottom-0 flex items-center justify-center px-3 bg-slate-200/80 border-r border-slate-300 rounded-l-xl text-xs font-bold text-slate-600 font-mono select-none">
                  +92
                </span>
                <input type="tel" required placeholder="3001234567" className="w-full p-2.5 pl-14 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-indigo-500" value={phone} onChange={handlePhoneChange} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">State / Province</label>
              <select required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500" value={state} onChange={(e) => { setState(e.target.value); setCity(""); }}>
                <option value="">Select State / Province</option>
                {Object.keys(pakistanRegions).map((prov) => <option key={prov} value={prov}>{prov}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">City</label>
              <select required disabled={!state} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 disabled:opacity-50" value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">Select City</option>
                {state && pakistanRegions[state].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Address</label>
            <input type="text" required placeholder="Enter your full address" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          {role === "doctor" && (
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-4 animate-fadeIn">
              <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider">Clinical Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1">Specialization</label>
                  <select
                    required
                    className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-700 cursor-pointer appearance-none"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                  >
                    <option value="" disabled hidden>Select your medical specialization</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Endocrinology">Endocrinology</option>
                    <option value="Gastroenterology">Gastroenterology</option>
                    <option value="General Physician">General Physician</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Gynecology">Gynecology / Obstetrics</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics (Child Specialist)</option>
                    <option value="Psychiatry">Psychiatry</option>
                    <option value="Ophthalmology">Ophthalmology (Eye Specialist)</option>
                    <option value="Urology">Urology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1">Medical License Number</label>
                  <input type="text" required placeholder="License Number (e.g., 74291-P)" maxLength="7" className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs outline-none focus:border-indigo-500" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1">Consultation Fee (PKR)</label>
                  <input type="number" placeholder="Consultation fee" required min="0" className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs outline-none focus:border-indigo-500" value={appointmentFees} onChange={(e) => setAppointmentFees(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1">Experience (Years)</label>
                  <input type="number" placeholder="Years of experience" required min="1" className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs outline-none focus:border-indigo-500" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 px-4 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition-all duration-200 shadow-md shadow-indigo-200/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving Configuration...
              </span>
            ) : (
              "Complete Profile Setup"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}