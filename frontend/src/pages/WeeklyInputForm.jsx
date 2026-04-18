import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { get, post } from "../services/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: "plumbing", label: "Plumbing", icon: "🔧",
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
    id: "electrical", label: "Electrical", icon: "⚡",
    flags: [
      { key: "wiringExposed", label: "Wiring exposed / electrical hazard" },
      { key: "issueFlag",     label: "General issue flagged" },
    ],
    numeric: [
      { key: "powerOutageHours", label: "Power outage hours this week", min: 0, max: 168, step: 1, placeholder: "e.g. 5" },
    ],
  },
  {
    id: "structural", label: "Structural", icon: "🏗️",
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
  { score: 1, label: "Excellent", color: "bg-emerald-500/20 border-emerald-500 text-emerald-300" },
  { score: 2, label: "Good",      color: "bg-teal-500/20 border-teal-500 text-teal-300" },
  { score: 3, label: "Fair",      color: "bg-amber-500/20 border-amber-500 text-amber-300" },
  { score: 4, label: "Poor",      color: "bg-orange-500/20 border-orange-500 text-orange-300" },
  { score: 5, label: "Critical",  color: "bg-red-500/20 border-red-500 text-red-300" },
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

  // Load school metadata to display context and prefill submission
  useEffect(() => {
    if (schoolId && isSchoolStaff) {
      get(`/api/schools/${schoolId}`).then(d => {
        if (d.success) setSchool(d.school);
      });
    }
  }, [schoolId, isSchoolStaff]);

  // Access guard
  if (!isSchoolStaff) {
    return (
      <div className="p-12 text-center text-slate-400">
        <p className="text-lg font-semibold">Permission Denied</p>
        <p className="text-sm mt-2">Only School Peon/Watchman or Principal accounts can submit weekly reports.</p>
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="p-12 text-center text-slate-400">
        <p className="text-lg font-semibold">No school linked to your account</p>
        <p className="text-sm mt-2">Contact an admin to assign a School ID to your account.</p>
      </div>
    );
  }

  // ── State helpers ────────────────────────────────────────────────────────────
  const setField = (cat, key, value) =>
    setCatStates(prev => ({ ...prev, [cat]: { ...prev[cat], [key]: value } }));

  // ── Submit ───────────────────────────────────────────────────────────────────
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

  // ── Success screen ────────────────────────────────────────────────────────────
  if (results) {
    const allOk = results.every(r => r.success);
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className={`rounded-2xl border p-6 text-center ${allOk ? "bg-emerald-500/10 border-emerald-500/40" : "bg-amber-500/10 border-amber-500/40"}`}>
          <div className="text-4xl mb-3">{allOk ? "✅" : "⚠️"}</div>
          <h2 className="text-xl font-bold text-white mb-1">
            {allOk ? "Report Submitted!" : "Partially Submitted"}
          </h2>
          <p className="text-slate-400 text-sm">Week {weekNumber} report for {school?.district ?? `School #${schoolId}`}</p>
        </div>

        <div className="space-y-2">
          {results.map(r => (
            <div key={r.category} className={`flex items-center gap-3 p-3 rounded-xl border ${r.success ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
              <span className="text-xl">{r.icon}</span>
              <span className="text-white font-medium capitalize">{r.label}</span>
              <span className={`ml-auto text-sm font-semibold ${r.success ? "text-emerald-400" : "text-red-400"}`}>
                {r.success ? "✓ Saved" : `✗ ${r.message}`}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { setResults(null); setCatStates(defaultCategoryState()); setWeekNumber(getISOWeek()); }}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
        >
          Submit Another Report
        </button>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────────
  const activeCat = CATEGORIES.find(c => c.id === activeTab);
  const activeState = catStates[activeTab];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Weekly Condition Report</h1>
        {school ? (
          <p className="text-slate-400 mt-1 text-sm">
            {school.district}{school.block ? ` · ${school.block}` : ""} · Age {school.buildingAge}y · {school.numStudents} students · {school.weatherZone}
          </p>
        ) : (
          <p className="text-slate-500 mt-1 text-sm">School #{schoolId}</p>
        )}
      </div>

      {/* Week number */}
      <div className="flex items-center gap-4 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <label className="text-slate-300 text-sm font-medium whitespace-nowrap">Reporting Week</label>
        <input
          type="number"
          min={1}
          max={53}
          value={weekNumber}
          onChange={e => setWeekNumber(e.target.value)}
          className="w-24 px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold"
        />
        <span className="text-slate-500 text-xs">(ISO week of year · auto-filled to current week)</span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveTab(cat.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all border ${
              activeTab === cat.id
                ? "bg-blue-600 border-blue-500 text-white shadow-lg"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
            }`}
          >
            <span>{cat.icon}</span>
            <span className="hidden sm:inline">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Active category panel */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{activeCat.icon}</span>
            <h2 className="text-lg font-bold text-white">{activeCat.label}</h2>
          </div>

          {/* Condition Score */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Condition Score</label>
            <div className="grid grid-cols-5 gap-2">
              {CONDITION_LEVELS.map(({ score, label, color }) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setField(activeTab, "conditionScore", score)}
                  className={`py-3 rounded-xl border-2 text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    activeState.conditionScore === score
                      ? color + " shadow-[2px_2px_0_#0f172a]"
                      : "bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500"
                  }`}
                >
                  <span className="text-base font-black">{score}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Issue flags */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Issue Flags</label>
            <div className="space-y-2">
              {activeCat.flags.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setField(activeTab, key, !activeState[key])}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                      activeState[key]
                        ? "bg-blue-600 border-blue-500"
                        : "bg-slate-800 border-slate-600 group-hover:border-slate-400"
                    }`}
                  >
                    {activeState[key] && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-slate-300 text-sm group-hover:text-white transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Numeric fields */}
          {activeCat.numeric.map(({ key, label, min, max, step, placeholder }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</label>
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={activeState[key]}
                onChange={e => setField(activeTab, key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-600"
              />
            </div>
          ))}
        </div>

        {/* Per-category summary strip */}
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(cat => {
            const cs = catStates[cat.id].conditionScore;
            const cl = CONDITION_LEVELS.find(l => l.score === cs);
            return (
              <div
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-xs font-semibold ${
                  activeTab === cat.id
                    ? "border-blue-500/60 bg-blue-500/10 text-blue-300"
                    : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-500"
                }`}
              >
                <span>{cat.icon}</span>
                <span className="hidden sm:inline">{cat.label}</span>
                <span className={`ml-auto font-black ${cl?.color.split(" ").pop() || "text-slate-400"}`}>{cs}/5</span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting || !weekNumber}
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-sm transition-colors shadow-lg flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting 3 categories…
            </>
          ) : (
            <>Submit Week {weekNumber} Report — All 3 Categories</>
          )}
        </button>
      </form>
    </div>
  );
}
