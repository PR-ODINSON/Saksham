import { useState, useEffect } from "react";
import { post, postFile } from "../../services/api";
import { MapPin, X, CheckCircle2, UploadCloud } from "lucide-react";
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
    photoUrl: "", // Compulsory image upload
    repair_done: 1,
    contractor_delay_days: 0,
    sla_breach: 0,
    file: null,
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
    setError("");

    if (!form.photoUrl) {
      setError("Please upload a resolution proof photo before submitting the feedback.");
      return;
    }

    setSaving(true);

    const formData = new FormData();
    formData.append("workOrderId", workOrder._id);
    formData.append("beforeConditionScore", form.beforeConditionScore);
    formData.append("afterConditionScore", form.afterConditionScore);
    formData.append("notes", form.notes);
    if (form.lat) formData.append("lat", form.lat);
    if (form.lng) formData.append("lng", form.lng);
    formData.append("repair_done", form.repair_done);
    formData.append("contractor_delay_days", form.contractor_delay_days);
    formData.append("sla_breach", form.sla_breach);
    if (form.file) {
      formData.append("photo", form.file);
    }

    const res = await postFile("/api/tasks/complete", formData);
    setSaving(false);
    
    if (res.success) {
      onDone(res.workOrder);
      onClose();
    } else {
      setError(res.message || "Failed to complete task");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
      <Card 
        title="Feedback Form"
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
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest block">Operational Baseline</label>
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
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest block">Resolution Outcome</label>
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
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest block">Coordinates</label>
              <div className={`h-28 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
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
                    <span className="text-[13px] font-bold text-emerald-700 uppercase tracking-wider">Coordinates Secured</span>
                  </>
                ) : gpsStatus === 'denied' ? (
                  <>
                    <MapPin size={20} className="mb-1 text-red-600" />
                    <span className="text-[13px] font-bold text-red-700 uppercase tracking-wider">Access Required</span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-1" />
                    <span className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">Locating...</span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest block">
                Resolution Proof <span className="text-red-500">*</span>
              </label>
              <div className="h-28 rounded-lg bg-slate-50 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all overflow-hidden relative group">
                <input 
                  type="file" 
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setForm({ 
                        ...form, 
                        photoUrl: URL.createObjectURL(e.target.files[0]),
                        file: e.target.files[0]
                      });
                    }
                  }}
                />
                {form.photoUrl ? (
                  <>
                    <img src={form.photoUrl} alt="Preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-40 transition-opacity" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <UploadCloud size={24} className="text-white drop-shadow-md mb-1" />
                      <span className="text-[11px] font-bold text-white uppercase tracking-widest drop-shadow-md">
                        Change Photo
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                    <UploadCloud size={28} className="mb-2" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Upload Image</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest block">Operational Summary</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Technical summary of resolution actions implemented..."
              className="w-full bg-slate-50 border border-slate-200 rounded p-4 text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none font-medium"
            />
          {/* CSV Parameters */}
          <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Repair Done?</label>
              <select 
                value={form.repair_done} 
                onChange={e => setForm({...form, repair_done: Number(e.target.value)})}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold"
              >
                <option value={1}>Yes (1)</option>
                <option value={0}>No (0)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Delay (Days)</label>
              <input 
                type="number" 
                value={form.contractor_delay_days}
                onChange={e => setForm({...form, contractor_delay_days: Number(e.target.value)})}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">SLA Breach?</label>
              <select 
                value={form.sla_breach} 
                onChange={e => setForm({...form, sla_breach: Number(e.target.value)})}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold"
              >
                <option value={0}>No (0)</option>
                <option value={1}>Yes (1)</option>
              </select>
            </div>
          </div>
          </div>

          <div className="flex gap-4 pt-2">
            <Button variant="ghost" type="button" onClick={onClose} className="flex-1">Discard</Button>
            <Button type="submit" variant="primary" isLoading={saving} className="flex-[2]">Submit Feedback</Button>
          </div>
        </form>
      </Card>
    </div>
    
  );
}
