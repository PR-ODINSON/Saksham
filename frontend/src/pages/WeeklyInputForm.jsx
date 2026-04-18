import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { get, postFile } from "../services/api";

const CATEGORIES = [
  { id: "structural", label: "Structural", icon: "🏗️", subs: ["Roof", "Wall cracks", "Floor", "Ceiling", "Doors & windows"] },
  { id: "electrical", label: "Electrical", icon: "⚡", subs: ["Main wiring", "Switchboard", "Lights & fans", "Earthing", "Circuit breaker"] },
  { id: "plumbing", label: "Plumbing", icon: "🔧", subs: ["Water supply", "Drainage", "Taps & faucets", "Overhead tank", "Leakage"] },
  { id: "sanitation", label: "Sanitation", icon: "🚿", subs: ["Boys toilet", "Girls toilet", "Washroom floor", "Water in toilets", "Hygiene"] },
  { id: "furniture", label: "Furniture", icon: "🪑", subs: ["Student desks", "Chairs", "Blackboard", "Teacher desk", "Storage"] },
];

const CONDITIONS = [
  { id: "good", label: "Good", color: "bg-emerald-500/20 border-emerald-500 text-emerald-300", dot: "bg-emerald-400" },
  { id: "moderate", label: "Moderate", color: "bg-amber-500/20 border-amber-500 text-amber-300", dot: "bg-amber-400" },
  { id: "poor", label: "Poor", color: "bg-red-500/20 border-red-500 text-red-300", dot: "bg-red-400" },
];

function defaultItem(category) {
  return { category, subCategory: CATEGORIES.find(c => c.id === category).subs[0], condition: "good", notes: "", imageUrl: "" };
}

export default function WeeklyInputForm() {
  const { user } = useAuth();
  const [school, setSchool] = useState(null);
  const [items, setItems] = useState(CATEGORIES.slice(0, 3).map(c => defaultItem(c.id)));
  const [overallNotes, setOverallNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const isSchoolStaff = user?.role === 'peon' || user?.role === 'principal' || user?.role === 'school';

  useEffect(() => {
    if (user?.schoolId && isSchoolStaff) {
      get(`/api/schools/${typeof user.schoolId === "object" ? user.schoolId._id : user.schoolId}`)
        .then(d => d.success && setSchool(d.school));
    }
  }, [user, isSchoolStaff]);

  if (!isSchoolStaff) {
    return (
      <div className="p-12 text-center text-slate-400">
        <p className="text-lg">Permission Denied.</p>
        <p className="text-sm mt-2">Only School Peon/Watchman or Principal accounts can submit weekly reports.</p>
      </div>
    );
  }

  const addCategory = (catId) => {
    if (!items.find(i => i.category === catId)) {
      setItems([...items, defaultItem(catId)]);
    }
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx, field, value) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!school && !user?.schoolId) {
      return setError("No school linked to your account. Contact admin.");
    }
    setSubmitting(true);
    setError("");

    const fd = new FormData();
    const schoolId = school?._id || (typeof user.schoolId === "object" ? user.schoolId._id : user.schoolId);
    fd.append("schoolId", schoolId);
    fd.append("items", JSON.stringify(items));
    fd.append("overallNotes", overallNotes);

    const res = await postFile("/api/condition-report", fd);
    setSubmitting(false);

    if (res.success) {
      setSubmitted(true);
    } else {
      setError(res.message || "Submission failed");
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-center gap-4 p-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Report Submitted!</h2>
        <p className="text-slate-400">Your weekly condition report has been recorded and the risk engine has updated scores.</p>
        <button onClick={() => { setSubmitted(false); setItems(CATEGORIES.slice(0, 3).map(c => defaultItem(c.id))); }} className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500">
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Weekly Condition Report</h1>
        {school && (
          <p className="text-slate-400 mt-1">
            {school.name} · {school.district} · Building age: {school.buildingAge}y · {school.studentCount} students
          </p>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {items.map((item, idx) => {
          const cat = CATEGORIES.find(c => c.id === item.category);
          return (
            <div key={idx} className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cat.icon}</span>
                  <span className="font-semibold text-white">{cat.label}</span>
                </div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="text-slate-500 hover:text-red-400 text-sm">Remove</button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Sub-category</label>
                  <select
                    value={item.subCategory}
                    onChange={e => updateItem(idx, "subCategory", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {cat.subs.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Condition</label>
                  <div className="flex gap-2">
                    {CONDITIONS.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => updateItem(idx, "condition", c.id)}
                        className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${item.condition === c.id ? c.color : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Notes (optional)</label>
                <input
                  type="text"
                  value={item.notes}
                  onChange={e => updateItem(idx, "notes", e.target.value)}
                  placeholder="Describe the issue briefly..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          );
        })}

        {/* Add more categories */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.filter(c => !items.find(i => i.category === c.id)).map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => addCategory(cat.id)}
              className="px-3 py-1.5 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-400 text-sm flex items-center gap-1.5 transition-colors"
            >
              <span>{cat.icon}</span> Add {cat.label}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Overall Notes / Additional Observations</label>
          <textarea
            value={overallNotes}
            onChange={e => setOverallNotes(e.target.value)}
            rows={3}
            placeholder="Any general observations about the school building this week..."
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition-colors shadow-lg"
        >
          {submitting ? "Submitting…" : "Submit Weekly Report"}
        </button>
      </form>
    </div>
  );
}
