import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { get, post, postFile } from "../../services/api";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import PageHeader from "../../components/common/PageHeader";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import MultiSelect from "../../components/common/MultiSelect";
import {
  Wrench, Zap, Building, CheckCircle2, AlertTriangle,
  Camera, X, ShieldAlert, Clock, TrendingDown, Minus,
  ChevronDown,
} from "lucide-react";

// ─── Option lists — values mirror TS-PS3.csv column names ────────────────────

// toilet_functional_ratio : 0.0 – 1.0
const TOILET_OPTIONS = [
  { value: 1.0,  labelKey: "peon.toilet_1_0",   desc: "100%",      color: "blue" },
  { value: 0.75, labelKey: "peon.toilet_0_75",  desc: "75%",       color: "blue" },
  { value: 0.5,  labelKey: "peon.toilet_0_5",   desc: "50%",       color: "amber"   },
  { value: 0.25, labelKey: "peon.toilet_0_25",  desc: "25%",       color: "orange"  },
  { value: 0,    labelKey: "peon.toilet_0_0",   desc: "0%",        color: "red"     },
];

// power_outage_hours_weekly
const POWER_OPTIONS = [
  { value: 0,  labelKey: "peon.power_0",   desc: "0 hrs/wk",  color: "blue" },
  { value: 3,  labelKey: "peon.power_3",   desc: "1–5 hrs",   color: "blue"    },
  { value: 8,  labelKey: "peon.power_8",   desc: "6–10 hrs",  color: "amber"   },
  { value: 15, labelKey: "peon.power_15",  desc: "11–20 hrs", color: "orange"  },
  { value: 25, labelKey: "peon.power_25",  desc: "20+ hrs",   color: "red"     },
];

// crack_width_mm
const CRACK_OPTIONS = [
  { value: 0,    labelKey: "peon.crack_0",  desc: "None",      color: "blue" },
  { value: 0.5,  labelKey: "peon.crack_0_5",desc: "< 1 mm",    color: "blue"    },
  { value: 2,    labelKey: "peon.crack_2",  desc: "1–3 mm",    color: "amber"   },
  { value: 6,    labelKey: "peon.crack_6",  desc: "3–10 mm",   color: "orange"  },
  { value: 15,   labelKey: "peon.crack_15", desc: "10–20 mm",  color: "red"     },
  { value: 25,   labelKey: "peon.crack_25", desc: "> 20 mm",   color: "red"     },
];

// ─── Category definitions ─────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "plumbing",
    label: "Plumbing",
    icon: <Wrench size={20} strokeWidth={2} />,
    flags: [
      { key: "waterLeak",        labelKey: "peon.flag_waterLeak" },
      { key: "brokenTap",        labelKey: "peon.flag_brokenTap" },
      { key: "cloggedDrain",     labelKey: "peon.flag_cloggedDrain" },
      { key: "tankOverflow",     labelKey: "peon.flag_tankOverflow" },
      { key: "lowWaterPressure", labelKey: "peon.flag_lowWaterPressure" },
      { key: "wallSeepage",      labelKey: "peon.flag_wallSeepage" },
      { key: "roofLeakFlag",     labelKey: "peon.flag_roofLeakFlag" },
      { key: "brokenDoor",       labelKey: "peon.flag_brokenDoor" },
      { key: "pestInfestation",  labelKey: "peon.flag_pestInfestation" },
      { key: "issueFlag",        labelKey: "peon.flag_issueFlag" },
    ],
    selectField: {
      key: "toiletFunctionalRatio",
      label: "Toilet Functional Ratio",
      rawOptions: TOILET_OPTIONS,
      defaultVal: "",
    },
  },
  {
    id: "electrical",
    label: "Electrical",
    icon: <Zap size={20} strokeWidth={2} />,
    flags: [
      { key: "wiringExposed",    labelKey: "peon.flag_wiringExposed" },
      { key: "brokenSwitch",     labelKey: "peon.flag_brokenSwitch" },
      { key: "burntSocket",      labelKey: "peon.flag_burntSocket" },
      { key: "flickeringLights", labelKey: "peon.flag_flickeringLights" },
      { key: "panelDamage",      labelKey: "peon.flag_panelDamage" },
      { key: "highVoltage",      labelKey: "peon.flag_highVoltage" },
      { key: "issueFlag",        labelKey: "peon.flag_issueFlag" },
    ],
    selectField: {
      key: "powerOutageHours",
      label: "Weekly Power Outage",
      rawOptions: POWER_OPTIONS,
      defaultVal: "",
    },
  },
  {
    id: "structural",
    label: "Structural",
    icon: <Building size={20} strokeWidth={2} />,
    flags: [
      { key: "roofLeakFlag",     labelKey: "peon.flag_roofLeakFlag" },
      { key: "wallSeepage",      labelKey: "peon.flag_wallSeepage" },
      { key: "brokenWindow",     labelKey: "peon.flag_brokenWindow" },
      { key: "brokenDoor",       labelKey: "peon.flag_brokenDoor" },
      { key: "pestInfestation",  labelKey: "peon.flag_pestInfestation" },
      { key: "paintPeeling",     labelKey: "peon.flag_paintPeeling" },
      { key: "floorDamage",      labelKey: "peon.flag_floorDamage" },
      { key: "ceilingHole",      labelKey: "peon.flag_ceilingHole" },
      { key: "issueFlag",        labelKey: "peon.flag_issueFlag" },
    ],
    selectField: {
      key: "crackWidthMM",
      label: "Crack Width Analysis",
      rawOptions: CRACK_OPTIONS,
      defaultVal: "",
    },
  },
];

// condition_score 1–5 (1 = best, 5 = worst) — mirrors CSV labels
const CONDITION_LEVELS = [
  { score: 1, labelKey: "peon.score_1", color: "blue" },
  { score: 2, labelKey: "peon.score_2", color: "blue" },
  { score: 3, labelKey: "peon.score_3", color: "amber" },
  { score: 4, labelKey: "peon.score_4", color: "orange" },
  { score: 5, labelKey: "peon.score_5", color: "red" },
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

const ROLE_LABELS = { 
  peon: 'Peon/Watchman', 
  principal: 'Principal', 
  deo: 'DEO COMMAND', 
  contractor: 'Contractor', 
  admin: 'System Admin' 
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
      conditionScore: "",
      issueFlag:             false,
      waterLeak:             false,
      wiringExposed:         false,
      roofLeakFlag:          false,
      brokenTap:             false,
      cloggedDrain:          false,
      tankOverflow:          false,
      lowWaterPressure:      false,
      wallSeepage:           false,
      brokenDoor:            false,
      brokenWindow:          false,
      pestInfestation:       false,
      paintPeeling:          false,
      floorDamage:           false,
      ceilingHole:           false,
      flickeringLights:      false,
      brokenSwitch:          false,
      burntSocket:           false,
      panelDamage:           false,
      highVoltage:           false,
      // select fields — pre-set to empty for manual selection
      crackWidthMM:          "",
      toiletFunctionalRatio: "",
      powerOutageHours:      "",
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
            <span className={`text-[12px] font-semibold uppercase tracking-wider ${isSelected ? c.text : "text-slate-500"}`}>
              {opt.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── PhotoUpload ──────────────────────────────────────────────────────────────
function PhotoUpload({ file, onChange, t }) {
  const inputRef = useRef(null);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <label className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
        {t('peon.photo_evidence')}
      </label>
      {file ? (
        <div className="flex-1 flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 shadow-sm">
          <img
            src={URL.createObjectURL(file)}
            alt="preview"
            className="w-20 h-20 rounded border border-slate-200 object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
            <p className="text-xs text-slate-500 font-medium">{t('peon.photo_success')}</p>
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
          className="flex-1 w-full py-6 rounded-lg border border-dashed border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-2 text-slate-500 group"
        >
          <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
            <Camera size={28} />
          </div>
          <div className="text-center">
            <span className="text-sm font-bold text-slate-700 block transition-colors group-hover:text-blue-700">{t('peon.photo_select')}</span>
            <span className="text-xs text-slate-500">{t('peon.photo_format')}</span>
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
  const { t } = useLanguage();

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

    // ── Client-side validation ────────────────────────────────────────────────
    // Every category needs a condition score
    const missingScore = CATEGORIES.filter(c => !catStates[c.id].conditionScore);
    if (missingScore.length) {
      setError(`Please rate Condition Score for: ${missingScore.map(c => c.label).join(", ")}`);
      return;
    }
    // Peon: every category MUST have a photo attached
    if (user?.role === "peon") {
      const missingPhoto = CATEGORIES.filter(c => !catPhotos[c.id]);
      if (missingPhoto.length) {
        setError(`Photo is mandatory. Missing for: ${missingPhoto.map(c => c.label).join(", ")}`);
        return;
      }
    }

    setSubmitting(true);

    // ── Build single bundled multipart submission ─────────────────────────────
    const fd = new FormData();
    fd.append("schoolId",      String(schoolId));
    fd.append("weekNumber",    String(Number(weekNumber)));
    fd.append("district",      school?.district      || "");
    fd.append("block",         school?.block         || "");
    fd.append("schoolType",    school?.schoolType    || "");
    fd.append("isGirlsSchool", String(school?.isGirlsSchool ?? false));
    fd.append("numStudents",   String(school?.numStudents   || 0));
    fd.append("buildingAge",   String(school?.infrastructure?.buildingAge || 0));
    fd.append("materialType",  school?.infrastructure?.materialType  || "");
    fd.append("weatherZone",   school?.infrastructure?.weatherZone   || "Dry");

    const categoriesPayload = CATEGORIES.map(cat => {
      const s = catStates[cat.id];
      return {
        category:              cat.id,
        conditionScore:        Number(s.conditionScore),
        issueFlag:             s.issueFlag,
        waterLeak:             s.waterLeak,
        wiringExposed:         s.wiringExposed,
        roofLeakFlag:          s.roofLeakFlag,
        brokenTap:             s.brokenTap,
        cloggedDrain:          s.cloggedDrain,
        tankOverflow:          s.tankOverflow,
        lowWaterPressure:      s.lowWaterPressure,
        wallSeepage:           s.wallSeepage,
        brokenDoor:            s.brokenDoor,
        brokenWindow:          s.brokenWindow,
        pestInfestation:       s.pestInfestation,
        crackWidthMM:          Number(s.crackWidthMM)          || 0,
        toiletFunctionalRatio: Number(s.toiletFunctionalRatio) || 0,
        powerOutageHours:      Number(s.powerOutageHours)      || 0,
      };
    });
    fd.append("categories", JSON.stringify(categoriesPayload));

    // Attach one photo per category as a named field (image_<category>)
    for (const cat of CATEGORIES) {
      const p = catPhotos[cat.id];
      if (p) fd.append(`image_${cat.id}`, p);
    }

    const res = await postFile("/api/reports/weekly", fd);
    setSubmitting(false);

    if (!res.success && !res.results) {
      setError(res.message || "Submission failed. Please try again.");
      return;
    }

    // Normalise results into the shape used by the acknowledgement screen
    const categoryResults = CATEGORIES.map(cat => {
      const r = (res.results || []).find(x => x.category === cat.id) || {};
      return {
        category:   cat.id,
        label:      cat.label,
        icon:       cat.icon,
        success:    r.success ?? false,
        message:    r.message || (r.success ? "Recorded" : "Failed"),
        prediction: r.prediction || null,
      };
    });

    setResults(categoryResults);
  };

  // ── Results / Prediction screen ─────────────────────────────────────────────
  if (results) {
    const allOk = results.every(r => r.success);
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-8 font-body text-[#0f172a]">
        {/* Official Acknowledgement Header */}
        <div className="bg-white border-2 border-[#003366] p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Building size={120} />
          </div>
          
          <div className="flex justify-between items-start mb-8 border-b-2 border-slate-100 pb-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-800 mb-1">Government of Gujarat</p>
              <h1 className="text-2xl font-bold text-[#003366] tracking-tighter">Acknowledgement Receipt</h1>
              <p className="text-sm font-bold text-slate-500 uppercase mt-1">Infrastructure Condition Audit · Saksham Portal</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase text-slate-400">Reference Number</p>
              <p className="text-sm font-bold text-[#003366]">SAK-{weekNumber}-{String(schoolId).slice(-6).toUpperCase()}</p>
              <p className="text-xs font-bold text-slate-500 mt-1">{new Date().toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Entity Information</p>
              <p className="text-sm font-bold text-slate-900">{school?.name}</p>
              <p className="text-xs font-medium text-slate-600">{school?.district}, {school?.block}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Reported By</p>
              <p className="text-sm font-bold text-slate-900">{user?.name}</p>
              <p className="text-xs font-medium text-slate-600">{ROLE_LABELS[user?.role]}</p>
            </div>
          </div>

          {/* Per-category summary table */}
          <div className="border border-slate-200 rounded-md overflow-hidden mb-8">
             <table className="w-full text-left text-xs">
               <thead>
                 <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-600">Category</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-600 text-center">Status</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-600 text-right">Risk Assessment</th>
                 </tr>
               </thead>
               <tbody>
                 {results.map(r => (
                   <tr key={r.category} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                     <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-blue-700">{r.icon}</span>
                          <span className="font-bold text-slate-800">{r.label}</span>
                        </div>
                     </td>
                     <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.success ? "text-emerald-700 bg-emerald-50 border border-emerald-100" : "text-red-700 bg-red-50 border border-red-100"}`}>
                          {r.success ? "Recorded" : "Failed"}
                        </span>
                     </td>
                     <td className="px-4 py-3 text-right">
                        {r.prediction ? (
                          <span className={`font-bold ${RISK_LEVEL_CONFIG[r.prediction.riskLevel]?.text || "text-slate-600"}`}>
                            {r.prediction.riskLevel.toUpperCase()} ({r.prediction.riskScore})
                          </span>
                        ) : "N/A"}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-md">
            <p className="text-xs font-bold text-blue-800 leading-relaxed">
              <span className="font-bold uppercase mr-2 text-blue-900">Official Note:</span>
              This is a computer-generated acknowledgement. All data submitted is subject to verification by the District Education Office (DEO). Please maintain a digital copy for your records.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => window.print()}
            className="flex-1 py-3 rounded-md bg-white border border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            Download/Print Receipt
          </button>
          <button
            onClick={() => {
              setResults(null);
              setCatStates(defaultCategoryState());
              setCatPhotos({ plumbing: null, electrical: null, structural: null });
            }}
            className="flex-1 py-3 rounded-md bg-[#003366] text-white font-bold text-xs uppercase tracking-widest hover:bg-blue-900 transition-all shadow-md focus:ring-2 focus:ring-blue-500"
          >
            Submit Another Entry
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  const activeCat   = CATEGORIES.find(c => c.id === activeTab);
  const activeState = catStates[activeTab];

  return (
    <div className="max-w-5xl mx-auto pt-10 sm:pt-16 px-4 sm:px-6 space-y-4 sm:space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="bg-[#003366] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-t-lg">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
              <Wrench size={20} className="text-blue-300" />
              {t('peon.title')}
            </h1>
            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mt-0.5">
              {t('peon.ref')}: {school?.district} / {school?.block} / {t('peon.week')} {weekNumber}
            </p>
          </div>


        </div>

        <div className="p-6 md:p-8">
          <div className="mb-8 flex items-start gap-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-md">
            <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase mb-0.5">{t('peon.instruction_title')}</p>
              <p className="text-xs font-medium text-amber-800 leading-relaxed">
                {t('peon.instruction_desc')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Navigation (Horizontal Pill List) */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveTab(cat.id)}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${
                    activeTab === cat.id
                      ? "bg-white text-[#003366] shadow-md border border-slate-200"
                      : "text-slate-500 hover:bg-slate-200/50"
                  }`}
                >
                  {cat.icon}
                  <span className="hidden sm:inline">{t(`peon.cat_${cat.id}`)}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Left Column: inputs */}
              <div className="lg:col-span-12 space-y-8">
                
                <section className="space-y-4">
                  <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-2">
                    <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-[#003366]">
                       {activeCat.icon}
                    </div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800">
                      I. {t(`peon.cat_${activeCat.id}`)} {t('peon.unit_assessment')}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                       {/* 1. Condition Score */}
                       <div className="space-y-4">
                          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <span>{t('peon.condition_state')}</span>
                            <span className="text-[10px] font-bold text-white bg-slate-400 px-2 py-0.5 rounded">{t('peon.required')}</span>
                          </label>
                          <div className="grid grid-cols-5 gap-2">
                            {CONDITION_LEVELS.map(({ score, labelKey, color }) => {
                              const c = COLOR_MAP[color];
                              const isSelected = activeState.conditionScore === score;
                              return (
                                <button
                                  key={score}
                                  type="button"
                                  onClick={() => setField(activeTab, "conditionScore", score)}
                                  className={`py-4 rounded border transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
                                    isSelected
                                      ? `bg-[#003366] border-[#003366] text-white shadow-lg scale-105`
                                      : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-slate-50"
                                  }`}
                                >
                                  <span className="text-xl font-bold">{score}</span>
                                  <span className="text-xs font-bold uppercase tracking-tight">{t(labelKey)}</span>
                                </button>
                              );
                            })}
                          </div>
                      </div>

                      {/* 2. Primary Ratio/Outage Select */}
                      <Select
                        label={activeCat.selectField.label}
                        options={activeCat.selectField.rawOptions.map(o => ({
                          value: o.value,
                          label: `${t(o.labelKey)} (${o.desc})`,
                        }))}
                        value={activeState[activeCat.selectField.key]}
                        onChange={(e) => setField(activeTab, activeCat.selectField.key, e.target.value)}
                      />

                      {/* 3. Deficiency Check-list (Shifted from Right Side) */}
                      <MultiSelect
                        label={t('peon.deficiency_list')}
                        placeholder={t('peon.observe')}
                        options={activeCat.flags.map(f => ({ value: f.key, label: t(f.labelKey) }))}
                        selectedValues={activeCat.flags.filter(f => activeState[f.key]).map(f => f.key)}
                        onChange={(newKeys) => {
                          const updatedCatState = { ...activeState };
                          activeCat.flags.forEach(f => { updatedCatState[f.key] = newKeys.includes(f.key); });
                          setCatStates(prev => ({ ...prev, [activeTab]: updatedCatState }));
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* 4. Photo Upload Section */}
                      <div className="flex-1">
                        <PhotoUpload
                          file={catPhotos[activeTab]}
                          onChange={(f) => setPhoto(activeTab, f)}
                          t={t}
                        />
                      </div>

                      {/* 5. Compact Submit Button (Shifted here) */}
                      <Button 
                        type="submit" 
                        variant="primary" 
                        size="lg" 
                        disabled={submitting}
                        isLoading={submitting}
                        className="w-full bg-[#003366] hover:bg-blue-900 text-white font-bold uppercase tracking-widest text-[10px] h-12 shadow-sm"
                      >
                        {t('peon.submit_report')}
                      </Button>
                    </div>
                  </div>
                </section>
                
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 font-bold text-xs uppercase flex items-center gap-3">
                <AlertTriangle size={16} /> {error}
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}
