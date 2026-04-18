import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { get, post, postFile } from "../services/api";
import {
  Wrench, Zap, Building, CheckCircle2, AlertTriangle,
  Camera, X, ShieldAlert, Clock, TrendingDown, Minus,
} from "lucide-react";

// ─── Option lists — values mirror TS-PS3.csv column names ────────────────────

// toilet_functional_ratio : 0.0 – 1.0
const TOILET_OPTIONS = [
  { value: 1.0,  labelEn: "All Working",  desc: "100%",      color: "emerald" },
  { value: 0.75, labelEn: "Most Working", desc: "75%",       color: "teal"    },
  { value: 0.5,  labelEn: "Half Working", desc: "50%",       color: "amber"   },
  { value: 0.25, labelEn: "Few Working",  desc: "25%",       color: "orange"  },
  { value: 0,    labelEn: "None Working", desc: "0%",        color: "red"     },
];

// power_outage_hours_weekly
const POWER_OPTIONS = [
  { value: 0,  labelEn: "No Outage",   desc: "0 hrs/wk",  color: "emerald" },
  { value: 3,  labelEn: "Short",       desc: "1–5 hrs",   color: "teal"    },
  { value: 8,  labelEn: "Medium",      desc: "6–10 hrs",  color: "amber"   },
  { value: 15, labelEn: "Long",        desc: "11–20 hrs", color: "orange"  },
  { value: 25, labelEn: "Very Long",   desc: "20+ hrs",   color: "red"     },
];

// crack_width_mm
const CRACK_OPTIONS = [
  { value: 0,    labelEn: "No Cracks",  desc: "None",      color: "emerald" },
  { value: 0.5,  labelEn: "Hairline",   desc: "< 1 mm",    color: "teal"    },
  { value: 2,    labelEn: "Minor",      desc: "1–3 mm",    color: "amber"   },
  { value: 6,    labelEn: "Moderate",   desc: "3–10 mm",   color: "orange"  },
  { value: 15,   labelEn: "Major",      desc: "10–20 mm",  color: "red"     },
  { value: 25,   labelEn: "Severe",     desc: "> 20 mm",   color: "red"     },
];

// ─── Category definitions ─────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "plumbing",
    label: "Plumbing",
    emoji: "🔧",
    icon: <Wrench size={20} strokeWidth={2.5} />,
    flags: [
      { key: "waterLeak",   label: "Water Leak",   emoji: "💧", desc: "Tap or pipe is leaking" },
      { key: "roofLeakFlag",label: "Roof Drip",    emoji: "🌧️", desc: "Water dripping from roof" },
      { key: "issueFlag",   label: "Other Issue",  emoji: "⚠️", desc: "Something else is broken" },
    ],
    selectField: {
      key: "toiletFunctionalRatio",
      label: "How many toilets are working?",
      emoji: "🚽",
      options: TOILET_OPTIONS,
      defaultVal: 1.0,
    },
  },
  {
    id: "electrical",
    label: "Electrical",
    emoji: "⚡",
    icon: <Zap size={20} strokeWidth={2.5} />,
    flags: [
      { key: "wiringExposed", label: "Bare Wire",    emoji: "⚡", desc: "Wire without cover / exposed" },
      { key: "issueFlag",     label: "Other Issue",  emoji: "⚠️", desc: "Something else is broken" },
    ],
    selectField: {
      key: "powerOutageHours",
      label: "How long is power cut each week?",
      emoji: "🔦",
      options: POWER_OPTIONS,
      defaultVal: 0,
    },
  },
  {
    id: "structural",
    label: "Structural",
    emoji: "🏗️",
    icon: <Building size={20} strokeWidth={2.5} />,
    flags: [
      { key: "roofLeakFlag", label: "Roof Damage",  emoji: "🏚️", desc: "Ceiling or roof is damaged" },
      { key: "issueFlag",    label: "Other Issue",  emoji: "⚠️", desc: "Something else is broken" },
    ],
    selectField: {
      key: "crackWidthMM",
      label: "Wall / floor cracks?",
      emoji: "🧱",
      options: CRACK_OPTIONS,
      defaultVal: 0,
    },
  },
];

// condition_score 1–5 (1 = best, 5 = worst) — mirrors CSV labels
const CONDITION_LEVELS = [
  { score: 1, label: "Excellent", emoji: "😊", color: "emerald" },
  { score: 2, label: "Good",      emoji: "🙂", color: "teal"    },
  { score: 3, label: "Fair",      emoji: "😐", color: "amber"   },
  { score: 4, label: "Poor",      emoji: "😟", color: "orange"  },
  { score: 5, label: "Critical",  emoji: "😰", color: "red"     },
];

const COLOR_MAP = {
  emerald: { bg: "bg-emerald-50", border: "border-emerald-500", text: "text-emerald-700", shadow: "shadow-[2px_2px_0_#10b981]" },
  teal:    { bg: "bg-teal-50",    border: "border-teal-400",    text: "text-teal-700",    shadow: "shadow-[2px_2px_0_#2dd4bf]" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-500",   text: "text-amber-700",   shadow: "shadow-[2px_2px_0_#f59e0b]" },
  orange:  { bg: "bg-orange-50",  border: "border-orange-500",  text: "text-orange-700",  shadow: "shadow-[2px_2px_0_#f97316]" },
  red:     { bg: "bg-red-50",     border: "border-red-500",     text: "text-red-700",     shadow: "shadow-[2px_2px_0_#ef4444]"  },
};

const RISK_LEVEL_CONFIG = {
  low:    { bg: "bg-emerald-50", border: "border-emerald-500", text: "text-emerald-700", label: "LOW RISK" },
  medium: { bg: "bg-amber-50",   border: "border-amber-500",   text: "text-amber-700",   label: "MEDIUM"   },
  high:   { bg: "bg-red-50",     border: "border-red-500",     text: "text-red-700",     label: "HIGH RISK"},
};

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
      issueFlag:             false,
      waterLeak:             false,
      wiringExposed:         false,
      roofLeakFlag:          false,
      // select fields — pre-set to the "best" option
      crackWidthMM:          0,
      toiletFunctionalRatio: 1.0,
      powerOutageHours:      0,
    };
  }
  return s;
}

// ─── VisualSelectGrid — for crack / toilet / power options ────────────────────
function VisualSelectGrid({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {options.map((opt) => {
        const isSelected = value === opt.value;
        const c = COLOR_MAP[opt.color] || COLOR_MAP.emerald;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl border-2 text-center transition-all ${
              isSelected
                ? `${c.bg} ${c.border} ${c.text} ${c.shadow} scale-[1.02]`
                : "bg-white border-slate-200 text-slate-400 hover:border-[#0f172a] hover:text-[#0f172a]"
            }`}
          >
            <span className={`text-base font-black ${isSelected ? c.text : "text-slate-500"}`}>
              {opt.labelEn}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? c.text : "text-slate-400"}`}>
              {opt.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── PhotoUpload ──────────────────────────────────────────────────────────────
function PhotoUpload({ file, onChange }) {
  const inputRef = useRef(null);
  return (
    <div className="space-y-2 pt-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
        📷 Photo (optional)
      </label>
      {file ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border-2 border-emerald-500 shadow-[2px_2px_0_#10b981]">
          <img
            src={URL.createObjectURL(file)}
            alt="preview"
            className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-emerald-700 truncate">{file.name}</p>
            <p className="text-[10px] text-emerald-600 font-bold">Photo ready to upload</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="w-8 h-8 rounded-lg bg-red-100 border-2 border-red-300 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
          >
            <X size={14} strokeWidth={3} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-[#0f172a] hover:bg-white transition-all flex flex-col items-center gap-2 text-slate-400 hover:text-[#0f172a]"
        >
          <Camera size={28} strokeWidth={1.5} />
          <span className="text-xs font-black uppercase tracking-widest">Take or Upload Photo</span>
          <span className="text-[10px] text-slate-400 font-bold">Tap to select image</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WeeklyInputForm() {
  const { user } = useAuth();

  const [school,     setSchool]     = useState(null);
  const weekNumber = getISOWeek();  // auto-filled, not editable by peon
  const [catStates,  setCatStates]  = useState(defaultCategoryState());
  const [catPhotos,  setCatPhotos]  = useState({ plumbing: null, electrical: null, structural: null });
  const [activeTab,  setActiveTab]  = useState("plumbing");
  const [submitting, setSubmitting] = useState(false);
  const [results,    setResults]    = useState(null);
  const [error,      setError]      = useState("");

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

  const setField   = (cat, key, value) =>
    setCatStates(prev => ({ ...prev, [cat]: { ...prev[cat], [key]: value } }));
  const setPhoto   = (cat, file) =>
    setCatPhotos(prev => ({ ...prev, [cat]: file }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const schoolMeta = {
      district:      school?.district      || "",
      block:         school?.block         || "",
      schoolType:    school?.schoolType    || "",
      isGirlsSchool: school?.isGirlsSchool ?? false,
      numStudents:   school?.numStudents   || 0,
      buildingAge:   school?.buildingAge   || 0,
      materialType:  school?.materialType  || "",
      weatherZone:   school?.weatherZone   || "Dry",
    };

    const categoryResults = [];

    for (const cat of CATEGORIES) {
      const s     = catStates[cat.id];
      const photo = catPhotos[cat.id];

      const basePayload = {
        schoolId,
        ...schoolMeta,
        category:              cat.id,
        weekNumber:            Number(weekNumber),
        conditionScore:        Number(s.conditionScore),
        issueFlag:             s.issueFlag,
        waterLeak:             s.waterLeak,
        wiringExposed:         s.wiringExposed,
        roofLeakFlag:          s.roofLeakFlag,
        crackWidthMM:          Number(s.crackWidthMM)          || 0,
        toiletFunctionalRatio: Number(s.toiletFunctionalRatio) ?? 0,
        powerOutageHours:      Number(s.powerOutageHours)      || 0,
      };

      let res;
      if (photo) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(basePayload)) {
          fd.append(k, String(v));
        }
        fd.append("images", photo);
        res = await postFile("/api/condition-report", fd);
      } else {
        res = await post("/api/condition-report", basePayload);
      }

      categoryResults.push({
        category:   cat.id,
        label:      cat.label,
        icon:       cat.icon,
        emoji:      cat.emoji,
        success:    res.success,
        message:    res.message || (res.success ? "Recorded" : "Failed"),
        prediction: res.prediction || null,
      });
    }

    setSubmitting(false);
    setResults(categoryResults);
  };

  // ── Results / Prediction screen ─────────────────────────────────────────────
  if (results) {
    const allOk = results.every(r => r.success);
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6 font-body text-[#0f172a]">
        {/* Banner */}
        <div className={`rounded-[2rem] border-2 p-8 text-center ${allOk ? "bg-emerald-50 border-[#0f172a] shadow-[6px_6px_0_#10b981]" : "bg-amber-50 border-[#0f172a] shadow-[6px_6px_0_#f59e0b]"}`}>
          <div className="flex justify-center mb-4">
            {allOk
              ? <CheckCircle2 size={48} className="text-emerald-600" />
              : <AlertTriangle size={48} className="text-amber-600" />}
          </div>
          <h2 className="text-3xl font-black text-[#0f172a] mb-2 tracking-tight">
            {allOk ? "Report Submitted!" : "Partially Submitted"}
          </h2>
          <p className="text-slate-500 font-bold text-sm">
            Week {weekNumber} report for {school?.district ?? `School #${schoolId}`}
          </p>
        </div>

        {/* Per-category result + prediction */}
        <div className="space-y-4">
          {results.map(r => {
            const pred = r.prediction;
            const rlCfg = pred ? (RISK_LEVEL_CONFIG[pred.riskLevel] || RISK_LEVEL_CONFIG.low) : null;
            return (
              <div
                key={r.category}
                className={`rounded-2xl border-2 overflow-hidden ${r.success ? "border-slate-200" : "border-red-200"}`}
              >
                {/* Header row */}
                <div className={`flex items-center gap-4 p-5 ${r.success ? "bg-white" : "bg-red-50"}`}>
                  <div className="text-2xl">{r.emoji}</div>
                  <span className="text-[#0f172a] font-black uppercase tracking-widest text-sm flex-1">
                    {r.label}
                  </span>
                  <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-2 ${
                    r.success
                      ? "text-emerald-700 border-emerald-200 bg-emerald-100"
                      : "text-red-700 border-red-200 bg-red-100"
                  }`}>
                    {r.success ? "✓ Saved" : `✗ ${r.message}`}
                  </span>
                </div>

                {/* Prediction panel */}
                {pred && r.success && (
                  <div className={`px-5 pb-5 pt-3 border-t-2 border-slate-100 ${rlCfg?.bg || "bg-slate-50"} space-y-3`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      ML Prediction Result
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Risk Score */}
                      <div className={`p-3 rounded-xl border-2 ${rlCfg?.border} bg-white text-center`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Risk Score</p>
                        <p className={`text-2xl font-black ${rlCfg?.text}`}>
                          {pred.riskScore}
                          <span className="text-xs opacity-50">/100</span>
                        </p>
                      </div>
                      {/* Days to Failure */}
                      <div className={`p-3 rounded-xl border-2 ${pred.within_30_days ? "border-red-500 bg-red-50" : "border-slate-200 bg-white"} text-center`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Days Safe</p>
                        <p className={`text-2xl font-black ${pred.within_30_days ? "text-red-600" : pred.within_60_days ? "text-orange-600" : "text-emerald-600"}`}>
                          {pred.estimated_days_to_failure}
                          <span className="text-xs opacity-50">d</span>
                        </p>
                      </div>
                      {/* Risk Level */}
                      <div className={`p-3 rounded-xl border-2 ${rlCfg?.border} bg-white text-center`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Level</p>
                        <p className={`text-sm font-black uppercase ${rlCfg?.text}`}>
                          {rlCfg?.label || pred.riskLevel}
                        </p>
                      </div>
                    </div>

                    {/* Urgent alerts */}
                    {pred.within_30_days && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-100 border-2 border-red-500">
                        <AlertTriangle size={16} className="text-red-600 shrink-0" strokeWidth={3} />
                        <p className="text-xs font-black text-red-700 uppercase tracking-wide">
                          ⚠ Failure likely within 30 days — Principal has been notified
                        </p>
                      </div>
                    )}
                    {!pred.within_30_days && pred.within_60_days && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 border-2 border-orange-400">
                        <Clock size={16} className="text-orange-600 shrink-0" strokeWidth={3} />
                        <p className="text-xs font-black text-orange-700 uppercase tracking-wide">
                          Maintenance recommended within 60 days
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            setResults(null);
            setCatStates(defaultCategoryState());
            setCatPhotos({ plumbing: null, electrical: null, structural: null });
          }}
          className="w-full py-4 mt-2 rounded-2xl bg-[#0f172a] hover:bg-blue-600 text-white font-black text-sm transition-all border-2 border-[#0f172a] shadow-[4px_4px_0_#2563eb] active:translate-y-1 active:translate-x-1 active:shadow-none uppercase tracking-widest"
        >
          Submit Another Report
        </button>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  const activeCat   = CATEGORIES.find(c => c.id === activeTab);
  const activeState = catStates[activeTab];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 font-body text-[#0f172a]">
      {/* Header */}
      <div>
        <h1
          className="text-4xl font-black text-[#0f172a] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Weekly Condition Report
        </h1>

        <div className="flex flex-wrap gap-3 mt-3">
          {school ? (
            <span className="text-slate-500 text-sm font-bold bg-slate-50 border-2 border-slate-200 px-4 py-2 rounded-xl inline-block shadow-sm">
              {school.district}{school.block ? ` · ${school.block}` : ""}
              {" · "}Age {school.buildingAge}y · {school.numStudents} students · {school.weatherZone}
            </span>
          ) : (
            <span className="text-slate-500 text-sm font-bold bg-slate-50 border-2 border-slate-200 px-4 py-2 rounded-xl inline-block shadow-sm">
              School #{schoolId}
            </span>
          )}
          {/* Week badge — auto-filled, shown read-only for peon */}
          <span className="flex items-center gap-2 bg-blue-50 border-2 border-blue-200 px-4 py-2 rounded-xl text-sm font-black text-blue-700 shadow-sm">
            <Clock size={14} strokeWidth={3} />
            Week {weekNumber}
          </span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-3 overflow-x-auto pb-2">
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
            <span className="text-base">{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Active category panel */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border-2 border-[#0f172a] rounded-[2rem] p-8 space-y-8 shadow-[6px_6px_0_#0f172a]">
          {/* Category header */}
          <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border-2 border-blue-200 text-blue-600 flex items-center justify-center">
              {activeCat.icon}
            </div>
            <h2 className="text-2xl font-black text-[#0f172a] uppercase tracking-tight">
              {activeCat.label} Inspection
            </h2>
          </div>

          {/* ── Photo Upload ── */}
          <PhotoUpload
            file={catPhotos[activeTab]}
            onChange={(f) => setPhoto(activeTab, f)}
          />

          {/* ── Condition Score ── */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
              Overall Condition (1 = Best, 5 = Worst)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {CONDITION_LEVELS.map(({ score, label, emoji, color }) => {
                const c = COLOR_MAP[color];
                const isSelected = activeState.conditionScore === score;
                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setField(activeTab, "conditionScore", score)}
                    className={`py-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1.5 transition-all ${
                      isSelected
                        ? `${c.bg} ${c.border} ${c.text} ${c.shadow} scale-[1.04]`
                        : "bg-slate-50 border-slate-200 text-slate-400 hover:border-[#0f172a] hover:text-[#0f172a]"
                    }`}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="text-lg font-black">{score}</span>
                    <span className="text-[9px]">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Category-specific select field ── */}
          <div className="space-y-3 pt-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
              {activeCat.selectField.emoji} {activeCat.selectField.label}
            </label>
            <VisualSelectGrid
              options={activeCat.selectField.options}
              value={activeState[activeCat.selectField.key]}
              onChange={(v) => setField(activeTab, activeCat.selectField.key, v)}
            />
          </div>

          {/* ── Issue Flags ── */}
          <div className="space-y-3 pt-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
              Any of these problems? (tap to mark)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeCat.flags.map(({ key, label, emoji, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setField(activeTab, key, !activeState[key])}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                    activeState[key]
                      ? "bg-red-50 border-red-500 shadow-[2px_2px_0_#ef4444]"
                      : "bg-white border-slate-200 hover:border-[#0f172a]"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center text-lg transition-all shrink-0 ${
                      activeState[key]
                        ? "bg-red-500 border-red-600"
                        : "bg-slate-100 border-slate-300"
                    }`}
                  >
                    {activeState[key] ? <CheckCircle2 size={16} className="text-white" strokeWidth={3} /> : emoji}
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-widest ${activeState[key] ? "text-red-700" : "text-slate-600"}`}>
                      {label}
                    </p>
                    <p className={`text-[10px] font-bold mt-0.5 ${activeState[key] ? "text-red-500" : "text-slate-400"}`}>
                      {desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Per-category summary strip */}
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map(cat => {
            const cs    = catStates[cat.id].conditionScore;
            const c     = COLOR_MAP[CONDITION_LEVELS.find(l => l.score === cs)?.color || "emerald"];
            const photo = catPhotos[cat.id];
            return (
              <div
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex flex-col gap-2 px-4 py-3.5 rounded-2xl border-2 cursor-pointer transition-all text-[10px] font-black uppercase tracking-widest ${
                  activeTab === cat.id
                    ? "border-[#0f172a] bg-slate-50 text-[#0f172a] shadow-[2px_2px_0_#0f172a]"
                    : "border-slate-200 bg-white text-slate-400 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{cat.emoji}</span>
                  <span className="flex-1">{cat.label}</span>
                </div>
                {photo && (
                  <span className="text-[9px] font-bold text-blue-600 flex items-center gap-1">
                    <Camera size={10} /> Photo added
                  </span>
                )}
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
          disabled={submitting}
          className="w-full py-5 rounded-2xl bg-[#0f172a] hover:bg-blue-600 disabled:opacity-50 text-white font-black text-xs transition-all border-2 border-[#0f172a] shadow-[6px_6px_0_#2563eb] active:translate-y-1 active:translate-x-1 active:shadow-none uppercase tracking-widest flex items-center justify-center gap-3"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting Report...
            </>
          ) : (
            <>Submit Week {weekNumber} Report — All 3 Categories</>
          )}
        </button>
      </form>
    </div>
  );
}
