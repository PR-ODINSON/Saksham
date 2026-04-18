import { useState, useEffect } from "react";
import { get } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  AlertTriangle, FileText, Camera, Clock, Filter,
  TrendingDown, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────
const RISK_CONFIG = {
  critical: { color: "text-red-700",     bg: "bg-red-100",    border: "border-red-600",    shadow: "shadow-[2px_2px_0_#ef4444]", label: "CRITICAL" },
  high:     { color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-500", shadow: "shadow-[2px_2px_0_#f97316]", label: "HIGH"     },
  moderate: { color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-500",  shadow: "shadow-[2px_2px_0_#f59e0b]", label: "MODERATE" },
  low:      { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-500",shadow: "shadow-[2px_2px_0_#10b981]", label: "LOW"      },
};

const CATEGORY_EMOJI = { plumbing: "🔧", electrical: "⚡", structural: "🏗️" };

const CONDITION_LABELS = {
  1: { label: "Excellent", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-400" },
  2: { label: "Good",      color: "text-teal-700",    bg: "bg-teal-50",    border: "border-teal-400"    },
  3: { label: "Fair",      color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-400"   },
  4: { label: "Poor",      color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-500"  },
  5: { label: "Critical",  color: "text-red-700",     bg: "bg-red-100",    border: "border-red-600"     },
};

function scoreToRiskLevel(ps) {
  if (ps >= 80) return "critical";
  if (ps >= 60) return "high";
  if (ps >= 40) return "moderate";
  return "low";
}

// ─── ReportCard ───────────────────────────────────────────────────────────────
function ReportCard({ r }) {
  const [expanded, setExpanded] = useState(false);

  const riskLevel   = scoreToRiskLevel(r.priorityScore || 0);
  const rc          = RISK_CONFIG[riskLevel];
  const condCfg     = CONDITION_LABELS[r.conditionScore] || CONDITION_LABELS[3];
  const submittedAt = r.createdAt ? new Date(r.createdAt) : null;

  const flags = [
    r.issueFlag    && { label: "Issue Flagged",    color: "red",    icon: <AlertTriangle size={10} strokeWidth={3} /> },
    r.waterLeak    && { label: "Water Leak",        color: "blue",   icon: "💧" },
    r.wiringExposed&& { label: "Exposed Wiring",   color: "yellow", icon: "⚡" },
    r.roofLeakFlag && { label: "Roof Leak",         color: "orange", icon: "🏚️" },
  ].filter(Boolean);

  const flagColors = {
    red:    "bg-red-50 border-red-300 text-red-700",
    blue:   "bg-blue-50 border-blue-300 text-blue-700",
    yellow: "bg-yellow-50 border-yellow-300 text-yellow-700",
    orange: "bg-orange-50 border-orange-300 text-orange-700",
  };

  return (
    <div className={`rounded-2xl border-2 overflow-hidden hover:shadow-[4px_4px_0_#0f172a] transition-all group ${rc.border}`}>
      {/* Main row */}
      <div className="bg-white p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: week + category + condition */}
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-black text-slate-500 bg-slate-50 group-hover:border-[#0f172a] transition-colors shrink-0 ${rc.border}`}>
              <span className="text-sm">W{r.weekNumber}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">{CATEGORY_EMOJI[r.category] || "📋"}</span>
                <span className="text-[#0f172a] text-lg font-black uppercase tracking-tight">
                  {r.category}
                </span>
                {r.photoUploaded && (
                  <span className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                    <Camera size={9} /> Photo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${condCfg.color} ${condCfg.bg} ${condCfg.border}`}>
                  {condCfg.label} ({r.conditionScore}/5)
                </span>
                {submittedAt && (
                  <span className="text-[10px] text-slate-400 font-bold">
                    {submittedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: flags + priority */}
          <div className="flex flex-wrap items-center gap-2">
            {flags.map((f, i) => (
              <span
                key={i}
                className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border flex items-center gap-1 ${flagColors[f.color]}`}
              >
                {typeof f.icon === "string" ? f.icon : f.icon} {f.label}
              </span>
            ))}

            {r.willFailWithin30Days && (
              <span className="text-[9px] font-black uppercase tracking-widest bg-red-100 border-2 border-red-600 text-red-800 shadow-[2px_2px_0_#ef4444] rounded-lg px-2.5 py-1 flex items-center gap-1">
                <AlertTriangle size={10} strokeWidth={3} /> FAIL &lt;30d
              </span>
            )}

            <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block" />

            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-2 ${rc.bg} ${rc.border} ${rc.color}`}>
              {rc.label} · {Math.round(r.priorityScore || 0)}
            </span>

            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="w-8 h-8 rounded-lg border-2 border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:border-[#0f172a] hover:text-[#0f172a] transition-colors ml-1"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp size={14} strokeWidth={3} /> : <ChevronDown size={14} strokeWidth={3} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded prediction details */}
      {expanded && (
        <div className={`px-5 pb-5 pt-4 border-t-2 ${rc.border} ${rc.bg} space-y-4`}>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
            ML Prediction Details
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border-2 border-slate-200 p-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Priority Score</p>
              <p className={`text-xl font-black ${rc.color}`}>{Math.round(r.priorityScore || 0)}<span className="text-[10px] opacity-50">/100</span></p>
            </div>
            <div className="bg-white rounded-xl border-2 border-slate-200 p-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Days to Failure</p>
              <p className={`text-xl font-black ${r.willFailWithin30Days ? "text-red-600" : r.willFailWithin60Days ? "text-orange-600" : "text-emerald-600"}`}>
                {r.daysToFailure != null ? r.daysToFailure : "N/A"}
                <span className="text-[10px] opacity-50">d</span>
              </p>
            </div>
            <div className="bg-white rounded-xl border-2 border-slate-200 p-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">30-Day Risk</p>
              <p className={`text-sm font-black uppercase ${r.willFailWithin30Days ? "text-red-600" : "text-emerald-600"}`}>
                {r.willFailWithin30Days ? "⚠ YES" : "✓ Safe"}
              </p>
            </div>
            <div className="bg-white rounded-xl border-2 border-slate-200 p-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">60-Day Risk</p>
              <p className={`text-sm font-black uppercase ${r.willFailWithin60Days ? "text-orange-600" : "text-emerald-600"}`}>
                {r.willFailWithin60Days ? "⚠ YES" : "✓ Safe"}
              </p>
            </div>
          </div>

          {/* Numeric details */}
          {(r.category === "plumbing" && r.toiletFunctionalRatio != null) && (
            <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-slate-200 px-4 py-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-40">Toilet Functional</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-blue-500 rounded-r-full"
                  style={{ width: `${Math.round(r.toiletFunctionalRatio * 100)}%` }}
                />
              </div>
              <span className="text-xs font-black text-blue-700 w-10 text-right">{Math.round(r.toiletFunctionalRatio * 100)}%</span>
            </div>
          )}
          {(r.category === "electrical" && r.powerOutageHours > 0) && (
            <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-slate-200 px-4 py-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-40">Power Outage</span>
              <span className="text-sm font-black text-orange-700">{r.powerOutageHours} hrs / week</span>
            </div>
          )}
          {(r.category === "structural" && r.crackWidthMM > 0) && (
            <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-slate-200 px-4 py-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-40">Crack Width</span>
              <span className="text-sm font-black text-amber-700">{r.crackWidthMM} mm</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ConditionLogView() {
  const { user } = useAuth();
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [catFilter,  setCatFilter]  = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  useEffect(() => {
    const loadData = async () => {
      const schoolId = typeof user?.schoolId === "object" ? user?.schoolId?._id : user?.schoolId;
      if (!schoolId) { setLoading(false); return; }
      const reportsRes = await get(`/api/condition-report?schoolId=${schoolId}&limit=100`);
      if (reportsRes.success) setReports(reportsRes.records || []);
      setLoading(false);
    };
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 font-body">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0f172a] rounded-full animate-spin" />
        <p className="text-slate-400 font-black tracking-[0.2em] text-[10px] uppercase animate-pulse">Loading Reports...</p>
      </div>
    );
  }

  const isPrincipal = user?.role === "principal" || user?.role === "school";
  if (!user?.schoolId || !isPrincipal) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white border-2 border-slate-200 rounded-[2rem] max-w-xl mx-auto mt-12 font-body">
        <p className="text-xl text-[#0f172a] font-black">Access Denied.</p>
        <p className="text-sm mt-2">Only Principal accounts can view reports for their school.</p>
      </div>
    );
  }

  // ── Derived stats ────────────────────────────────────────────────────────────
  const criticalCount   = reports.filter(r => r.willFailWithin30Days).length;
  const warningCount    = reports.filter(r => !r.willFailWithin30Days && r.willFailWithin60Days).length;
  const photoCount      = reports.filter(r => r.photoUploaded).length;
  const latestWeek      = reports.length ? Math.max(...reports.map(r => r.weekNumber)) : 0;

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = reports.filter(r => {
    const catOk  = catFilter  === "all" || r.category === catFilter;
    const rl     = scoreToRiskLevel(r.priorityScore || 0);
    const riskOk = riskFilter === "all" || rl === riskFilter;
    return catOk && riskOk;
  });

  // Sort: most critical (highest priority score) first, then by latest week
  const sorted = [...filtered].sort((a, b) => {
    const ps = (b.priorityScore || 0) - (a.priorityScore || 0);
    if (ps !== 0) return ps;
    return b.weekNumber - a.weekNumber;
  });

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto font-body text-[#0f172a]">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center shadow-[2px_2px_0_#bfdbfe]">
          <FileText size={24} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-[#0f172a] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Inspection Reports
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Weekly peon submissions · ML analysis attached
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-[#0f172a] rounded-2xl p-5 shadow-[4px_4px_0_#0f172a]">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Reports</p>
          <p className="text-3xl font-black text-[#0f172a]">{reports.length}</p>
          {latestWeek > 0 && <p className="text-[10px] font-bold text-slate-400 mt-1">Latest: Week {latestWeek}</p>}
        </div>

        <div className={`rounded-2xl p-5 border-2 ${criticalCount > 0 ? "bg-red-50 border-red-600 shadow-[4px_4px_0_#ef4444]" : "bg-white border-slate-200 shadow-[4px_4px_0_#e2e8f0]"}`}>
          <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${criticalCount > 0 ? "text-red-500" : "text-slate-400"}`}>
            Critical (≤30 days)
          </p>
          <p className={`text-3xl font-black ${criticalCount > 0 ? "text-red-700" : "text-slate-400"}`}>{criticalCount}</p>
          {criticalCount > 0 && (
            <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
              <AlertTriangle size={10} strokeWidth={3} /> Needs immediate action
            </p>
          )}
        </div>

        <div className={`rounded-2xl p-5 border-2 ${warningCount > 0 ? "bg-amber-50 border-amber-500 shadow-[4px_4px_0_#f59e0b]" : "bg-white border-slate-200 shadow-[4px_4px_0_#e2e8f0]"}`}>
          <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${warningCount > 0 ? "text-amber-600" : "text-slate-400"}`}>
            Warning (≤60 days)
          </p>
          <p className={`text-3xl font-black ${warningCount > 0 ? "text-amber-700" : "text-slate-400"}`}>{warningCount}</p>
          {warningCount > 0 && (
            <p className="text-[10px] font-bold text-amber-500 mt-1 flex items-center gap-1">
              <Clock size={10} strokeWidth={3} /> Schedule maintenance
            </p>
          )}
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 shadow-[4px_4px_0_#bfdbfe]">
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">Photos Uploaded</p>
          <p className="text-3xl font-black text-blue-700">{photoCount}</p>
          <p className="text-[10px] font-bold text-blue-400 mt-1 flex items-center gap-1">
            <Camera size={10} /> of {reports.length} reports
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <Filter size={14} /> Filter:
        </div>

        {/* Category filter */}
        <div className="flex gap-2">
          {["all", "plumbing", "electrical", "structural"].map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                catFilter === c
                  ? "bg-[#0f172a] border-[#0f172a] text-white shadow-[2px_2px_0_#2563eb]"
                  : "bg-white border-slate-200 text-slate-500 hover:border-[#0f172a]"
              }`}
            >
              {c === "all" ? "All Categories" : `${CATEGORY_EMOJI[c]} ${c}`}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200 hidden md:block" />

        {/* Risk filter */}
        <div className="flex gap-2">
          {["all", "critical", "high", "moderate", "low"].map(r => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`px-3 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                riskFilter === r
                  ? "bg-[#0f172a] border-[#0f172a] text-white shadow-[2px_2px_0_#2563eb]"
                  : "bg-white border-slate-200 text-slate-500 hover:border-[#0f172a]"
              }`}
            >
              {r === "all" ? "All Risk" : RISK_CONFIG[r].label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {sorted.length} result{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Report list */}
      <div className="bg-white border-2 border-[#0f172a] rounded-[2rem] p-6 shadow-[6px_6px_0_#0f172a]">
        {sorted.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
            <FileText size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 font-bold">
              {reports.length === 0
                ? "No inspection records found. The peon hasn't submitted any reports yet."
                : "No reports match the selected filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map(r => (
              <ReportCard key={r._id} r={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
