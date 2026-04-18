import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { get, post, postFile } from "../../services/api";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import PageHeader from "../../components/common/PageHeader";
import Input from "../../components/common/Input";
import {
  Wrench, Zap, Building, CheckCircle2, AlertTriangle,
  Camera, X, ShieldAlert, Clock, TrendingDown, Minus,
} from "lucide-react";

// ─── Option lists — values mirror TS-PS3.csv column names ────────────────────

// toilet_functional_ratio : 0.0 – 1.0
const TOILET_OPTIONS = [
  { value: 1.0,  labelEn: "All Functional",   desc: "100%",      color: "blue" },
  { value: 0.75, labelEn: "Mostly Functional",desc: "75%",       color: "blue" },
  { value: 0.5,  labelEn: "Partially Functional", desc: "50%",   color: "amber"   },
  { value: 0.25, labelEn: "Few Functional",   desc: "25%",       color: "orange"  },
  { value: 0,    labelEn: "None Functional",  desc: "0%",        color: "red"     },
];

// power_outage_hours_weekly
const POWER_OPTIONS = [
  { value: 0,  labelEn: "No Outage",   desc: "0 hrs/wk",  color: "blue" },
  { value: 3,  labelEn: "Minimal",     desc: "1–5 hrs",   color: "blue"    },
  { value: 8,  labelEn: "Notable",     desc: "6–10 hrs",  color: "amber"   },
  { value: 15, labelEn: "Significant", desc: "11–20 hrs", color: "orange"  },
  { value: 25, labelEn: "Critical",    desc: "20+ hrs",   color: "red"     },
];

// crack_width_mm
const CRACK_OPTIONS = [
  { value: 0,    labelEn: "No Cracks",  desc: "None",      color: "blue" },
  { value: 0.5,  labelEn: "Hairline",   desc: "< 1 mm",    color: "blue"    },
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
    icon: <Wrench size={20} strokeWidth={2} />,
    flags: [
      { key: "waterLeak",   label: "Water Leak",   desc: "Tap or pipe is leaking" },
      { key: "roofLeakFlag",label: "Roof Drip",    desc: "Water dripping from roof" },
      { key: "issueFlag",   label: "Other Issue",  desc: "Something else is broken" },
    ],
    selectField: {
      key: "toiletFunctionalRatio",
      label: "Toilet Functional Ratio",
      options: TOILET_OPTIONS,
      defaultVal: 1.0,
    },
  },
  {
    id: "electrical",
    label: "Electrical",
    icon: <Zap size={20} strokeWidth={2} />,
    flags: [
      { key: "wiringExposed", label: "Exposed Wiring", desc: "Wire without cover / exposed" },
      { key: "issueFlag",     label: "Other Issue",   desc: "Something else is broken" },
    ],
    selectField: {
      key: "powerOutageHours",
      label: "Weekly Power Outage",
      options: POWER_OPTIONS,
      defaultVal: 0,
    },
  },
  {
    id: "structural",
    label: "Structural",
    icon: <Building size={20} strokeWidth={2} />,
    flags: [
      { key: "roofLeakFlag", label: "Roof Damage",  desc: "Ceiling or roof is damaged" },
      { key: "issueFlag",    label: "Other Issue",  desc: "Something else is broken" },
    ],
    selectField: {
      key: "crackWidthMM",
      label: "Crack Width Analysis",
      options: CRACK_OPTIONS,
      defaultVal: 0,
    },
  },
];

// condition_score 1–5 (1 = best, 5 = worst) — mirrors CSV labels
const CONDITION_LEVELS = [
  { score: 1, label: "Excellent", color: "blue" },
  { score: 2, label: "Good",      color: "blue"    },
  { score: 3, label: "Fair",      color: "amber"   },
  { score: 4, label: "Poor",      color: "orange"  },
  { score: 5, label: "Critical",  color: "red"     },
];

const COLOR_MAP = {
  blue:    { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    shadow: "shadow-sm" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   shadow: "shadow-sm" },
  orange:  { bg: "bg-orange-50",  border: "border-orange-200",  text: "text-orange-700",  shadow: "shadow-sm" },
  red:     { bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700",     shadow: "shadow-sm"  },
};

const RISK_LEVEL_CONFIG = {
  low:    { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    label: "NORMAL" },
  medium: { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   label: "CAUTION"   },
  high:   { bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700",     label: "CRITICAL"},
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
        const c = COLOR_MAP[opt.color] || COLOR_MAP.blue;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-1.5 py-3 px-3 rounded-md border transition-all ${
              isSelected
                ? `${c.bg} ${c.border} ${c.text} ring-1 ring-offset-1 ring-blue-500`
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            <span className={`text-sm font-bold ${isSelected ? c.text : "text-slate-700"}`}>
              {opt.labelEn}
            </span>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isSelected ? c.text : "text-slate-500"}`}>
              {opt.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── PhotoUpload ──────────────────────────────────────────────────────────────
function PhotoUpload({ file, onChange, required = false, showError = false }) {
  const inputRef = useRef(null);
  const missing  = required && !file;

  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wide">
        Evidence Photography
        {required && (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
            missing && showError
              ? "bg-red-100 border-red-400 text-red-700 animate-pulse"
              : missing
              ? "bg-amber-50 border-amber-300 text-amber-700"
              : "bg-emerald-50 border-emerald-300 text-emerald-700"
          }`}>
            {missing ? "REQUIRED" : "✓ ATTACHED"}
          </span>
        )}
      </label>

      {file ? (
        <div className={`flex items-center gap-4 p-3 rounded-lg border shadow-sm ${
          required ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
        }`}>
          <img
            src={URL.createObjectURL(file)}
            alt="preview"
            className="w-16 h-16 rounded border border-slate-200 object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
            <p className="text-xs text-emerald-700 font-semibold">Photo attached — ready to submit</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-2 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors border border-transparent hover:border-red-100"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full py-8 rounded-lg border-2 border-dashed transition-all flex flex-col items-center gap-3 group ${
            missing && showError
              ? "border-red-400 bg-red-50 hover:bg-red-50/80"
              : missing && required
              ? "border-amber-300 bg-amber-50/40 hover:border-blue-500 hover:bg-blue-50/30"
              : "border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50/30"
          }`}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            missing && showError
              ? "bg-red-100 text-red-500"
              : missing && required
              ? "bg-amber-50 text-amber-500 group-hover:bg-blue-100 group-hover:text-blue-600"
              : "bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
          }`}>
            <Camera size={24} />
          </div>
          <div className="text-center">
            <span className={`text-sm font-bold block ${
              missing && showError ? "text-red-700" : "text-slate-700"
            }`}>
              {missing && showError ? "Photo Required — Tap to Add" : "Select Inspection Photo"}
            </span>
            <span className="text-xs text-slate-500">JPG, PNG · Max 5 MB · Must be taken on-site</span>
          </div>
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
  const [submitting,    setSubmitting]    = useState(false);
  const [results,       setResults]       = useState(null);
  const [error,         setError]         = useState("");
  const [showPhotoError, setShowPhotoError] = useState(false);

  const isSchoolStaff = user?.role === "peon" || user?.role === "principal";
  const isPeon        = user?.role === "peon";
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
      <div className="p-12 text-center text-slate-600 bg-white border border-slate-200 rounded-lg max-w-xl mx-auto mt-12 shadow-sm">
        <p className="text-xl font-bold text-slate-900">Access Restricted</p>
        <p className="text-sm mt-2">Authenticated personnel (School Staff or Principals) only.</p>
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="p-12 text-center text-slate-600 bg-white border border-slate-200 rounded-lg max-w-xl mx-auto mt-12 shadow-sm">
        <p className="text-xl font-bold text-slate-900">Account Unlinked</p>
        <p className="text-sm mt-2">Your account is not associated with a specific school ID.</p>
      </div>
    );
  }

  const setField   = (cat, key, value) =>
    setCatStates(prev => ({ ...prev, [cat]: { ...prev[cat], [key]: value } }));
  const setPhoto   = (cat, file) =>
    setCatPhotos(prev => ({ ...prev, [cat]: file }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Peons must attach a photo for every category before submitting
    if (isPeon) {
      const missingPhotos = CATEGORIES.filter(cat => !catPhotos[cat.id]).map(c => c.label);
      if (missingPhotos.length > 0) {
        setShowPhotoError(true);
        setError(`Photo required for: ${missingPhotos.join(", ")}. Please attach a photo for each category.`);
        // Scroll to the first missing-photo tab
        const firstMissing = CATEGORIES.find(cat => !catPhotos[cat.id]);
        if (firstMissing) setActiveTab(firstMissing.id);
        return;
      }
    }

    setShowPhotoError(false);
    setSubmitting(true);

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
        <div className={`rounded-xl border p-8 text-center ${allOk ? "bg-white border-blue-200 shadow-sm" : "bg-white border-amber-200 shadow-sm"}`}>
          <div className="flex justify-center mb-6">
            {allOk
              ? <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><CheckCircle2 size={32} /></div>
              : <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><AlertTriangle size={32} /></div>}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {allOk ? "Report Logged Successfully" : "Submission Partial"}
          </h2>
          <p className="text-slate-500 font-medium text-sm">
            Record ID: W-{weekNumber}-{schoolId} · {school?.district ?? "District Region"}
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
                <div className={`flex items-center gap-4 p-5 ${r.success ? "bg-white" : "bg-red-50"}`}>
                  <div className="text-blue-600">{r.icon}</div>
                  <span className="text-slate-900 font-bold tracking-tight text-sm flex-1">
                    {r.label} Assessment
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded border ${
                    r.success
                      ? "text-blue-700 border-blue-200 bg-blue-50"
                      : "text-red-700 border-red-200 bg-red-50"
                  }`}>
                    {r.success ? "Saved" : "Retry Required"}
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
          className="w-full py-3.5 mt-2 rounded-lg bg-blue-900 border border-blue-900 text-white font-bold text-sm transition-all shadow-sm hover:bg-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 uppercase tracking-wide"
        >
          Submit Another Assessment
        </button>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  const activeCat   = CATEGORIES.find(c => c.id === activeTab);
  const activeState = catStates[activeTab];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <PageHeader 
        title="Infrastructure Condition Audit"
        subtitle={`Period: Week ${weekNumber}, 2026 · ${school?.name || "Generic Node"}`}
        icon={Wrench}
      />

      <div className="flex flex-wrap gap-2 -mt-4">
        {school ? (
          <>
            <Badge variant="info" size="lg"><Building size={12} className="mr-1.5" /> {school.district} {school.block ? `/ ${school.block}` : ""}</Badge>
            <Badge variant="default" size="lg">Building Age: {school.buildingAge}Y</Badge>
            <Badge variant="default" size="lg">Registry Size: {school.numStudents}</Badge>
          </>
        ) : (
          <Badge variant="default" size="lg">School ID: {schoolId}</Badge>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-slate-200">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveTab(cat.id)}
            className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === cat.id
                ? "border-blue-900 text-blue-900 bg-blue-50/30"
                : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title={`${activeCat.label} Assessment Unit`} noPadding className="overflow-hidden">
          <div className="p-8 space-y-10">

          {/* ── Photo Upload ── */}
          <PhotoUpload
            file={catPhotos[activeTab]}
            onChange={(f) => { setPhoto(activeTab, f); if (f) setShowPhotoError(false); }}
            required={isPeon}
            showError={showPhotoError && !catPhotos[activeTab]}
          />

          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
              Resource Condition Level (1-5)
            </label>
            <div className="grid grid-cols-5 gap-3">
              {CONDITION_LEVELS.map(({ score, label, color }) => {
                const c = COLOR_MAP[color];
                const isSelected = activeState.conditionScore === score;
                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setField(activeTab, "conditionScore", score)}
                    className={`py-3 rounded-md border transition-all text-center flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? `${c.bg} ${c.border} ${c.text} ring-1 ring-blue-500`
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-400"
                    }`}
                  >
                    <span className="text-lg font-bold">{score}</span>
                    <span className="text-[10px] font-semibold uppercase">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
              {activeCat.selectField.label}
            </label>
            <VisualSelectGrid
              options={activeCat.selectField.options}
              value={activeState[activeCat.selectField.key]}
              onChange={(v) => setField(activeTab, activeCat.selectField.key, v)}
            />
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
              Critical Damage Indicators
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeCat.flags.map(({ key, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setField(activeTab, key, !activeState[key])}
                  className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-all ${
                    activeState[key]
                      ? "bg-red-50 border-red-200 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded border flex items-center justify-center transition-all shrink-0 ${
                      activeState[key]
                        ? "bg-red-600 border-red-700"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    {activeState[key] && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${activeState[key] ? "text-red-800" : "text-slate-800"}`}>
                      {label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          </div>
        </Card>

        {/* Per-category summary indicators */}
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map(cat => {
            const cs    = catStates[cat.id].conditionScore;
            const c     = COLOR_MAP[CONDITION_LEVELS.find(l => l.score === cs)?.color || "blue"];
            const photo = catPhotos[cat.id];
            return (
              <div
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                  activeTab === cat.id
                    ? "border-blue-600 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className={`w-8 h-8 rounded flex items-center justify-center ${activeTab === cat.id ? "text-blue-700" : "text-slate-400"}`}>
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${activeTab === cat.id ? "text-blue-900" : "text-slate-600"}`}>{cat.label}</p>
                  {photo
                    ? <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1"><Camera size={10} /> Photo Attached</p>
                    : isPeon
                    ? <p className={`text-[10px] font-semibold flex items-center gap-1 ${showPhotoError ? "text-red-600 animate-pulse" : "text-amber-600"}`}><Camera size={10} /> Required</p>
                    : null
                  }
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 font-bold text-sm shadow-[2px_2px_0_#ef4444]">
            {error}
          </div>
        )}

        <Button 
          type="submit" 
          variant="primary" 
          size="lg" 
          disabled={submitting}
          isLoading={submitting}
          className="w-full"
        >
          Finalize Week {weekNumber} Audit
        </Button>
      </form>
    </div>
  );
}
