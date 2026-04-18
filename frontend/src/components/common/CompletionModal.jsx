import { useState, useEffect } from "react";
import { post } from "../../services/api";
import { MapPin, X, CheckCircle2 } from "lucide-react";
import Card from "./Card";
import Button from "./Button";
import Badge from "./Badge";

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card 
        title="Directorial Resolution Verification"
        subtitle="Formal submission of operational resolution and geospatial validation"
        className="w-full max-w-xl"
        noPadding
      >
        <div className="absolute top-6 right-8">
          <Button variant="ghost" size="sm" onClick={onClose} className="w-8 h-8 p-0">
            <X size={16} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Operational Baseline</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, beforeConditionScore: s })}
                    className={`flex-1 h-10 rounded text-xs font-bold transition-all border ${
                      form.beforeConditionScore === s 
                        ? 'bg-slate-900 text-white border-slate-900' 
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Resolution Outcome</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, afterConditionScore: s })}
                    className={`flex-1 h-10 rounded text-xs font-bold transition-all border ${
                      form.afterConditionScore === s 
                        ? 'bg-blue-900 text-white border-blue-900' 
                        : 'bg-white text-slate-400 border-slate-200'
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
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Coordinates</label>
              <div className={`h-20 rounded border flex flex-col items-center justify-center transition-all ${
                gpsStatus === 'captured' ? 'bg-emerald-50 border-emerald-200' : 
                gpsStatus === 'denied' ? 'bg-red-50 border-red-200' : 
                'bg-slate-50 border-slate-200'
              }`}>
                {gpsStatus === 'captured' ? (
                  <>
                    <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center mb-1 shadow-sm">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Coordinates Secured</span>
                  </>
                ) : gpsStatus === 'denied' ? (
                  <>
                    <MapPin size={20} className="mb-1 text-red-600" />
                    <span className="text-[9px] font-bold text-red-700 uppercase tracking-wider">Access Required</span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-1" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Locating...</span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Resolution Proof</label>
              <div className="h-20 rounded bg-slate-100 border border-slate-200 overflow-hidden relative group cursor-pointer shadow-inner">
                <img src={form.photoUrl} alt="Preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-75 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] font-bold text-slate-900 uppercase bg-white/95 border border-slate-300 px-2 py-1 rounded shadow-sm">
                    Modify Photo
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Operational Summary</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Technical summary of resolution actions implemented..."
              className="w-full bg-slate-50 border border-slate-200 rounded p-4 text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none font-medium"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="ghost" onClick={onClose} className="flex-1">Discard</Button>
            <Button type="submit" variant="primary" isLoading={saving} className="flex-[2]">Authorize Resolution</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
