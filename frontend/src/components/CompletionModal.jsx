import { useState, useEffect } from "react";
import { post } from "../services/api";

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Complete Work Order</h2>
            <p className="text-slate-400 text-xs mt-1">Submit proof of work and capture location</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Condition Scores */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pre-Repair Score</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, beforeConditionScore: s })}
                    className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all ${form.beforeConditionScore === s ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Post-Repair Score</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, afterConditionScore: s })}
                    className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all ${form.afterConditionScore === s ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
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
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">GPS Validation</label>
              <div className={`h-24 rounded-2xl border flex flex-col items-center justify-center transition-all ${gpsStatus === 'captured' ? 'bg-emerald-500/10 border-emerald-500/30' : gpsStatus === 'denied' ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/50 border-slate-700 border-dashed animate-pulse'}`}>
                {gpsStatus === 'captured' ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center mb-1 shadow-lg shadow-emerald-900/40">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">Location Locked</span>
                  </>
                ) : gpsStatus === 'denied' ? (
                  <>
                    <span className="text-xl mb-1">📍</span>
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">GPS Access Denied</span>
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mb-2" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Detecting...</span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Evidence Photo</label>
              <div className="h-24 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden relative group cursor-pointer">
                <img src={form.photoUrl} alt="Preview" className="w-full h-full object-cover opacity-60 transition-opacity group-hover:opacity-40" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-black text-white uppercase bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">Change Photo</span>
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Completion Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Detail the work performed..."
              className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl border border-slate-700 text-slate-400 text-sm font-bold hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-black shadow-xl shadow-emerald-900/20 active:translate-y-0.5 disabled:opacity-50 transition-all uppercase tracking-widest"
            >
              {saving ? "Processing..." : "Complete Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
