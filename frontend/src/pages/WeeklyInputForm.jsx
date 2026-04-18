import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { get, post } from "../services/api";
import { Wrench, Zap, Building, CheckCircle2, AlertTriangle } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: "plumbing", label: "Plumbing", icon: <Wrench size={20} strokeWidth={2.5} />,
    flags: [
      { key: "waterLeak",            label: "Active water leak" },
      { key: "roofLeakFlag",         label: "Roof leak present" },
      { key: "issueFlag",            label: "General issue flagged" },
    ],
    numeric: [
      { key: "toiletFunctionalRatio", label: "Toilet functional ratio (0–1)", min: 0, max: 1, step: 0.05, placeholder: "e.g. 0.85" },
    ],
  },
  {
    id: "electrical", label: "Electrical", icon: <Zap size={20} strokeWidth={2.5} />,
    flags: [
      { key: "wiringExposed", label: "Wiring exposed / hazard" },
      { key: "issueFlag",     label: "General issue flagged" },
    ],
    numeric: [
      { key: "powerOutageHours", label: "Power outage hours this week", min: 0, max: 168, step: 1, placeholder: "e.g. 5" },
    ],
  },
  {
    id: "structural", label: "Structural", icon: <Building size={20} strokeWidth={2.5} />,
    flags: [
      { key: "roofLeakFlag", label: "Roof leak / ceiling damage" },
      { key: "issueFlag",    label: "General issue flagged" },
    ],
    numeric: [
      { key: "crackWidthMM", label: "Crack width (mm)", min: 0, max: 200, step: 0.5, placeholder: "e.g. 5.5" },
    ],
  },
];

// 1-5 condition score labels shown to users
const CONDITION_LEVELS = [
  { score: 1, label: "Excellent", color: "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-[2px_2px_0_#10b981]" },
  { score: 2, label: "Good",      color: "bg-teal-50 border-teal-500 text-teal-700 shadow-[2px_2px_0_#14b8a6]" },
  { score: 3, label: "Fair",      color: "bg-amber-50 border-amber-500 text-amber-700 shadow-[2px_2px_0_#f59e0b]" },
  { score: 4, label: "Poor",      color: "bg-orange-50 border-orange-500 text-orange-700 shadow-[2px_2px_0_#f97316]" },
  { score: 5, label: "Critical",  color: "bg-red-50 border-red-600 text-red-700 shadow-[2px_2px_0_#ef4444]" },
];

// Auto-compute ISO week number for today
function getISOWeek() {
  const now  = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
}

// ─── Default per-category state ───────────────────────────────────────────────
function defaultCategoryState() {
  const s = {};
  for (const cat of CATEGORIES) {
    s[cat.id] = {
      conditionScore: 2,
      issueFlag:            false,
      waterLeak:            false,
      wiringExposed:        false,
      roofLeakFlag:         false,
      crackWidthMM:         "",
      toiletFunctionalRatio: "",
      powerOutageHours:     "",
    };
  }
  return s;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeeklyInputForm() {
  const { user } = useAuth();

  const [school,      setSchool]      = useState(null);
  const [weekNumber,  setWeekNumber]  = useState(getISOWeek());
  const [catStates,   setCatStates]   = useState(defaultCategoryState());
  const [activeTab,   setActiveTab]   = useState("plumbing");
  const [submitting,  setSubmitting]  = useState(false);
  const [results,     setResults]     = useState(null); // [{category, success, message}]
  const [error,       setError]       = useState("");

  const isSchoolStaff = user?.role === "peon" || user?.role === "principal";
  const schoolId = typeof user?.schoolId === "object" ? user?.schoolId?._id : user?.schoolId;

  useEffect(() => {
    if (schoolId && isSchoolStaff) {
      get(`/api/schools/${schoolId}`).then(d => {
        if (d.success) setSchool(d.school);
      });
    }
  }, [schoolId, isSchoolStaff]);

  if (!isSchoolStaff) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white border-2 border-slate-200 rounded-[2rem] max-w-xl mx-auto mt-12 font-body">
        <p className="text-xl font-black text-[#0f172a]">Permission Denied</p>
        <p className="text-sm mt-2">Only School Peon/Watchman or Principal accounts can submit weekly reports.</p>
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white border-2 border-slate-200 rounded-[2rem] max-w-xl mx-auto mt-12 font-body">
        <p className="text-xl font-black text-[#0f172a]">No school linked to your account</p>
        <p className="text-sm mt-2">Contact an admin to assign a School ID to your account.</p>
      </div>
    );
  }

  const setField = (cat, key, value) =>
    setCatStates(prev => ({ ...prev, [cat]: { ...prev[cat], [key]: value } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const schoolMeta = {
      district:     school?.district      || "",
      block:        school?.block         || "",
      schoolType:   school?.schoolType    || "",
      isGirlsSchool: school?.isGirlsSchool ?? false,
      numStudents:  school?.numStudents   || 0,
      buildingAge:  school?.buildingAge   || 0,
      materialType: school?.materialType  || "",
      weatherZone:  school?.weatherZone   || "Dry",
    };

    const categoryResults = [];

    for (const cat of CATEGORIES) {
      const s = catStates[cat.id];
      const payload = {
        schoolId,
        ...schoolMeta,
        category:     cat.id,
        weekNumber:   Number(weekNumber),
        conditionScore: Number(s.conditionScore),
        issueFlag:    s.issueFlag,
        waterLeak:    s.waterLeak,
        wiringExposed: s.wiringExposed,
        roofLeakFlag:  s.roofLeakFlag,
        crackWidthMM:          s.crackWidthMM         !== "" ? Number(s.crackWidthMM)         : 0,
        toiletFunctionalRatio: s.toiletFunctionalRatio !== "" ? Number(s.toiletFunctionalRatio) : 0,
        powerOutageHours:      s.powerOutageHours      !== "" ? Number(s.powerOutageHours)      : 0,
      };

      const res = await post("/api/condition-report", payload);
      categoryResults.push({
        category: cat.id,
        label:    cat.label,
        icon:     cat.icon,
        success:  res.success,
        message:  res.message || (res.success ? "Recorded" : "Failed"),
      });
    }

    setSubmitting(false);
    setResults(categoryResults);
  };

  if (results) {
    const allOk = results.every(r => r.success);
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6 font-body text-[#0f172a]">
        <div className={`rounded-[2rem] border-2 p-8 text-center shadow-[6px_6px_0_#0f172a] ${allOk ? "bg-emerald-50 border-[#0f172a]" : "bg-amber-50 border-[#0f172a]"}`}>
          <div className="flex justify-center mb-4">
             {allOk ? <CheckCircle2 size={48} className="text-emerald-600" /> : <AlertTriangle size={48} className="text-amber-600" />}
          </div>
          <h2 className="text-3xl font-black text-[#0f172a] mb-2 tracking-tight">
            {allOk ? "Report Submitted!" : "Partially Submitted"}
          </h2>
          <p className="text-slate-500 font-bold text-sm">Week {weekNumber} report for {school?.district ?? `School #${schoolId}`}</p>
        </div>

        <div className="space-y-3">
          {results.map(r => (
            <div key={r.category} className={`flex items-center gap-4 p-5 rounded-2xl border-2 ${r.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 border-current shadow-sm ${r.success ? "text-emerald-600 bg-white" : "text-red-600 bg-white"}`}>
                {r.icon}
              </div>
              <span className="text-[#0f172a] font-black uppercase tracking-widest text-sm">{r.label}</span>
              <span className={`ml-auto text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-2 ${r.success ? "text-emerald-700 border-emerald-200 bg-emerald-100" : "text-red-700 border-red-200 bg-red-100"}`}>
                {r.success ? "✓ Saved" : `✗ ${r.message}`}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { setResults(null); setCatStates(defaultCategoryState()); setWeekNumber(getISOWeek()); }}
          className="w-full py-4 mt-6 rounded-2xl bg-[#0f172a] hover:bg-blue-600 text-white font-black text-sm transition-all border-2 border-[#0f172a] shadow-[4px_4px_0_#2563eb] active:translate-y-1 active:translate-x-1 active:shadow-none uppercase tracking-widest"
        >
          Submit Another Report
        </button>
      </div>
    );
  }

  const activeCat = CATEGORIES.find(c => c.id === activeTab);
  const activeState = catStates[activeTab];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 font-body text-[#0f172a]">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-[#0f172a] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Weekly Condition Report</h1>
        {school ? (
          <p className="text-slate-500 mt-2 text-sm font-bold bg-slate-50 border-2 border-slate-200 px-4 py-2 rounded-xl inline-block shadow-sm">
            {school.district}{school.block ? ` · ${school.block}` : ""} · Age {school.buildingAge}y · {school.numStudents} students · {school.weatherZone}
          </p>
        ) : (
          <p className="text-slate-500 mt-2 text-sm font-bold bg-slate-50 border-2 border-slate-200 px-4 py-2 rounded-xl inline-block">
            School #{schoolId}
          </p>
        )}
      </div>

      {/* Week number */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white border-2 border-[#0f172a] rounded-[1.5rem] p-5 shadow-[4px_4px_0_#0f172a]">
        <label className="text-[#0f172a] text-xs font-black uppercase tracking-widest whitespace-nowrap">Reporting Week</label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min={1}
            max={53}
            value={weekNumber}
            onChange={e => setWeekNumber(e.target.value)}
            className="w-24 px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-[#0f172a] text-sm focus:border-[#0f172a] focus:shadow-[2px_2px_0_#0f172a] outline-none text-center font-black transition-all"
          />
          <span className="text-slate-400 text-xs font-bold">(Auto-filled to current ISO week)</span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveTab(cat.id)}
            className={`flex-1 min-w-[120px] py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${
              activeTab === cat.id
                ? "bg-[#0f172a] border-[#0f172a] text-white shadow-[4px_4px_0_#2563eb]"
                : "bg-white border-slate-200 text-slate-500 hover:border-[#0f172a] hover:text-[#0f172a] hover:shadow-[2px_2px_0_#0f172a]"
            }`}
          >
            <span className={activeTab === cat.id ? "text-blue-400" : "text-slate-400"}>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Active category panel */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border-2 border-[#0f172a] rounded-[2rem] p-8 space-y-8 shadow-[6px_6px_0_#0f172a]">
          <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border-2 border-blue-200 text-blue-600 flex items-center justify-center">
              {activeCat.icon}
            </div>
            <h2 className="text-2xl font-black text-[#0f172a] uppercase tracking-tight">{activeCat.label} Inspection</h2>
          </div>

          {/* Condition Score */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Condition Score</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {CONDITION_LEVELS.map(({ score, label, color }) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setField(activeTab, "conditionScore", score)}
                  className={`py-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1.5 transition-all ${
                    activeState.conditionScore === score
                      ? color
                      : "bg-slate-50 border-slate-200 text-slate-400 hover:border-[#0f172a] hover:text-[#0f172a]"
                  }`}
                >
                  <span className="text-2xl font-black">{score}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Issue flags */}
          <div className="space-y-3 pt-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Critical Flags</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeCat.flags.map(({ key, label }) => (
                <label key={key} className={`flex items-center gap-4 cursor-pointer group p-4 rounded-2xl border-2 transition-all ${
                  activeState[key] ? "bg-red-50 border-red-500 shadow-[2px_2px_0_#ef4444]" : "bg-white border-slate-200 hover:border-[#0f172a]"
                }`}>
                  <div
                    onClick={() => setField(activeTab, key, !activeState[key])}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                      activeState[key]
                        ? "bg-red-500 border-red-600 text-white"
                        : "bg-slate-100 border-slate-300 group-hover:border-[#0f172a]"
                    }`}
                  >
                    {activeState[key] && <CheckCircle2 size={14} strokeWidth={4} />}
                  </div>
                  <span className={`text-xs font-black uppercase tracking-widest ${activeState[key] ? "text-red-700" : "text-slate-500 group-hover:text-[#0f172a]"}`}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Numeric fields */}
          {activeCat.numeric.map(({ key, label, min, max, step, placeholder }) => (
            <div key={key} className="space-y-2 pt-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">{label}</label>
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={activeState[key]}
                onChange={e => setField(activeTab, key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-[#0f172a] text-sm font-bold focus:border-[#0f172a] focus:shadow-[4px_4px_0_#0f172a] outline-none placeholder-slate-400 transition-all"
              />
            </div>
          ))}
        </div>

        {/* Per-category summary strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CATEGORIES.map(cat => {
            const cs = catStates[cat.id].conditionScore;
            return (
              <div
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 cursor-pointer transition-all text-[10px] font-black uppercase tracking-widest ${
                  activeTab === cat.id
                    ? "border-[#0f172a] bg-slate-50 text-[#0f172a] shadow-[2px_2px_0_#0f172a]"
                    : "border-slate-200 bg-white text-slate-400 hover:border-slate-400"
                }`}
              >
                <div className={activeTab === cat.id ? "text-blue-500" : "text-slate-300"}>
                  {cat.icon}
                </div>
                <span>{cat.label}</span>
                <span className={`ml-auto px-2 py-1 rounded-md text-[10px] border-2 bg-white ${
                   cs === 1 ? 'border-emerald-500 text-emerald-600' : 
                   cs <= 3 ? 'border-amber-500 text-amber-600' : 'border-red-500 text-red-600'
                }`}>
                  {cs}/5
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 font-bold text-sm shadow-[2px_2px_0_#ef4444]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !weekNumber}
          className="w-full py-5 rounded-2xl bg-[#0f172a] hover:bg-blue-600 disabled:opacity-50 text-white font-black text-xs transition-all border-2 border-[#0f172a] shadow-[6px_6px_0_#2563eb] active:translate-y-1 active:translate-x-1 active:shadow-none uppercase tracking-widest flex items-center justify-center gap-3"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting Report...
            </>
          ) : (
            <>Submit Week {weekNumber} Report — All Categories</>
          )}
        </button>
      </form>
    </div>
  );
}
