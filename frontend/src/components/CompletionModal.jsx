import { useState, useEffect } from "react";
import { post } from "../services/api";
import { MapPin } from "lucide-react";

export default function CompletionModal({ workOrder, onDone, onClose }) {
  const [form, setForm] = useState({
    beforeConditionScore: 5,
    afterConditionScore: 1,
    notes: "",
    lat: null,
    lng: null,
    photoUrl: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=400", // Default mockup photo
  });
  
  const [gpsStatus, setGpsStatus] = useState("detecting"); // detecting, captured, denied
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }));
          setGpsStatus("captured");
        },
        (err) => {
          console.error("GPS Error:", err);
          setGpsStatus("denied");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setGpsStatus("denied");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      workOrderId: workOrder._id,
      ...form
    };

    const res = await post("/api/tasks/complete", payload);
    setSaving(false);
    
    if (res.success) {
      onDone(res.workOrder);
      onClose();
    } else {
      setError(res.message || "Failed to complete task");
    }
  };

  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white border-2 border-[#0f172a] rounded-[24px] w-full max-w-xl shadow-[12px_12px_0_#0f172a] overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="px-8 py-6 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#0f172a] tracking-tight">Complete Work Order</h2>
            <p className="text-slate-500 font-bold text-xs mt-1">Submit proof of work and capture location</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white border-2 border-slate-200 text-[#0f172a] flex items-center justify-center hover:border-[#0f172a] transition-all shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 text-sm font-bold shadow-[2px_2px_0_#ef4444]">
              {error}
            </div>
          )}

          {/* Condition Scores */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Pre-Repair Score</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, beforeConditionScore: s })}
                    className={`flex-1 h-12 rounded-xl text-sm font-black transition-all border-2 ${
                      form.beforeConditionScore === s 
                        ? 'bg-orange-500 text-white border-orange-600 shadow-[2px_2px_0_#c2410c]' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Post-Repair Score</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, afterConditionScore: s })}
                    className={`flex-1 h-12 rounded-xl text-sm font-black transition-all border-2 ${
                      form.afterConditionScore === s 
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-[2px_2px_0_#047857]' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Location & Photo */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">GPS Validation</label>
              <div className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                gpsStatus === 'captured' ? 'bg-emerald-50 border-emerald-500' : 
                gpsStatus === 'denied' ? 'bg-red-50 border-red-500' : 
                'bg-slate-50 border-slate-300 border-dashed animate-pulse'
              }`}>
                {gpsStatus === 'captured' ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center mb-2 shadow-[2px_2px_0_#047857]">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Location Locked</span>
                  </>
                ) : gpsStatus === 'denied' ? (
                  <>
                    <MapPin size={24} className="mb-1 text-red-500" strokeWidth={2.5} />
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Access Denied</span>
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-2" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Detecting...</span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Evidence Photo</label>
              <div className="h-24 rounded-2xl bg-slate-100 border-2 border-slate-300 overflow-hidden relative group cursor-pointer shadow-inner">
                <img src={form.photoUrl} alt="Preview" className="w-full h-full object-cover opacity-80 transition-opacity group-hover:opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-black text-[#0f172a] uppercase bg-white/90 border-2 border-[#0f172a] px-3 py-1.5 rounded-xl shadow-[2px_2px_0_#0f172a]">
                    Change Photo
                  </span>
                </div>
                <div className="absolute top-2 right-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shadow-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Completion Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Detail the work performed..."
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-[#0f172a] font-bold text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#0f172a] focus:shadow-[4px_4px_0_#0f172a] transition-all resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-black hover:border-[#0f172a] hover:text-[#0f172a] transition-all bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] py-4 rounded-xl bg-[#0f172a] hover:bg-emerald-600 text-white text-sm font-black border-2 border-[#0f172a] shadow-[6px_6px_0_#047857] active:translate-y-1 active:translate-x-1 active:shadow-none disabled:opacity-50 transition-all uppercase tracking-widest"
            >
              {saving ? "Processing..." : "Complete Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
