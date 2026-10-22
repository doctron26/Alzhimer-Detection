"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, ClipboardList, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function PatientInfo() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    medicalHistory: "",
    onset: "",
    progression: "",
    familyHistory: "",
    confusion: "",
    moodChanges: ""
  });

  // redirect to login if not logged in
  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      }
    };
    checkUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Fallback/Local storage of patient data
    const patientData = {
      id: crypto.randomUUID(),
      ...formData,
      timestamp: Date.now()
    };
    sessionStorage.setItem("currentPatient", JSON.stringify(patientData));
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
         // Attempt to insert into a 'patients' table if it exists
         await supabase.from("patients").insert([{
           id: patientData.id,
           admin_id: user.id,
           name: formData.name,
           age: parseInt(formData.age),
           gender: formData.gender,
           medical_history: formData.medicalHistory,
           onset: formData.onset,
           progression: formData.progression,
           family_history: formData.familyHistory,
           confusion: formData.confusion,
           mood_changes: formData.moodChanges
         }]);
      }
    } catch (err) {
      console.warn("Could not save to Supabase (patients table may not exist yet). Data saved locally.", err);
    }

    router.push("/assessment");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-slate-900 selection:bg-primary-200">
      <div className="max-w-xl w-full bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary-200/30 blur-[80px] rounded-full mix-blend-multiply pointer-events-none" />
        <div className="absolute bottom-0 right-0 p-8 opacity-5 pointer-events-none">
           <ClipboardList className="w-64 h-64" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl shadow-sm border border-primary-100">
              <UserCircle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">Patient Details</h1>
              <p className="text-slate-500 font-medium text-sm mt-1">Please enter the patient information before starting.</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Patient Name</label>
              <input 
                type="text" 
                required 
                className="w-full p-4 rounded-xl bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none transition-all shadow-sm text-slate-800 font-medium"
                placeholder="Full Name"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Age</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  max="120"
                  className="w-full p-4 rounded-xl bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none transition-all shadow-sm text-slate-800 font-medium"
                  placeholder="e.g. 72"
                  value={formData.age}
                  onChange={e => setFormData({...formData, age: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Gender</label>
                <select 
                  required
                  className="w-full p-4 rounded-xl bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none transition-all shadow-sm text-slate-800 font-medium appearance-none"
                  value={formData.gender}
                  onChange={e => setFormData({...formData, gender: e.target.value})}
                >
                  <option value="" disabled>Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-800 mb-3">1. When did you first notice memory or communication changes?</label>
              <div className="space-y-3">
                {['Less than 6 months ago', '6–12 months ago', 'More than 1 year ago', 'Not sure'].map(option => (
                  <label key={option} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${formData.onset === option ? 'border-primary-600 border-[6px]' : 'border-slate-300 group-hover:border-primary-400'}`} />
                    <input 
                      type="radio" 
                      name="onset" 
                      value={option}
                      checked={formData.onset === option}
                      onChange={e => setFormData({...formData, onset: e.target.value})}
                      className="hidden"
                    />
                    <span className="text-slate-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-800 mb-3">2. How have these changes progressed?</label>
              <div className="space-y-3">
                {['No noticeable change', 'Gradually worsening', 'Changes from day to day', 'Started suddenly'].map(option => (
                  <label key={option} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${formData.progression === option ? 'border-primary-600 border-[6px]' : 'border-slate-300 group-hover:border-primary-400'}`} />
                    <input 
                      type="radio" 
                      name="progression" 
                      value={option}
                      checked={formData.progression === option}
                      onChange={e => setFormData({...formData, progression: e.target.value})}
                      className="hidden"
                    />
                    <span className="text-slate-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-800 mb-3">3. Does the patient have a family history of Alzheimer's or dementia?</label>
              <div className="space-y-3">
                {['Yes, immediate family', 'Yes, extended family', 'No known history', 'Not sure'].map(option => (
                  <label key={option} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${formData.familyHistory === option ? 'border-primary-600 border-[6px]' : 'border-slate-300 group-hover:border-primary-400'}`} />
                    <input 
                      type="radio" 
                      name="familyHistory" 
                      value={option}
                      checked={formData.familyHistory === option}
                      onChange={e => setFormData({...formData, familyHistory: e.target.value})}
                      className="hidden"
                    />
                    <span className="text-slate-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-800 mb-3">4. Has the patient experienced confusion with time or place recently?</label>
              <div className="space-y-3">
                {['Never', 'Rarely', 'Sometimes', 'Frequently'].map(option => (
                  <label key={option} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${formData.confusion === option ? 'border-primary-600 border-[6px]' : 'border-slate-300 group-hover:border-primary-400'}`} />
                    <input 
                      type="radio" 
                      name="confusion" 
                      value={option}
                      checked={formData.confusion === option}
                      onChange={e => setFormData({...formData, confusion: e.target.value})}
                      className="hidden"
                    />
                    <span className="text-slate-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-800 mb-3">5. Have there been any recent changes in mood or personality?</label>
              <div className="space-y-3">
                {['No changes', 'Mild irritability or anxiety', 'Significant mood swings', 'Withdrawal from social activities'].map(option => (
                  <label key={option} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${formData.moodChanges === option ? 'border-primary-600 border-[6px]' : 'border-slate-300 group-hover:border-primary-400'}`} />
                    <input 
                      type="radio" 
                      name="moodChanges" 
                      value={option}
                      checked={formData.moodChanges === option}
                      onChange={e => setFormData({...formData, moodChanges: e.target.value})}
                      className="hidden"
                    />
                    <span className="text-slate-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Medical History / Notes</label>
              <textarea 
                className="w-full p-4 rounded-xl bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none transition-all shadow-sm text-slate-800 font-medium min-h-[120px] resize-y custom-scrollbar"
                placeholder="Any previous diagnosis, symptoms, or relevant history..."
                value={formData.medicalHistory}
                onChange={e => setFormData({...formData, medicalHistory: e.target.value})}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 mt-2 rounded-full font-bold text-white bg-primary-600 hover:bg-primary-500 focus:ring-4 focus:ring-primary-200 transition-all shadow-[0_8px_30px_rgba(79,70,229,0.25)] hover:shadow-[0_8px_30px_rgba(79,70,229,0.35)] hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="animate-spin w-5 h-5"/> Preparing Assessment...</> : "Start Assessment"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
