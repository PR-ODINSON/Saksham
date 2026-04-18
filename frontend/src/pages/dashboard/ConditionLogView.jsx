import { useState, useEffect } from "react";
import { get } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import PageHeader from "../../components/common/PageHeader";
import MetricCard from "../../components/common/MetricCard";
import {
  AlertTriangle, FileText, Camera, Clock, Filter,
  TrendingDown, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp,
  Droplet, Zap, Home, Wrench, Building
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────
const RISK_CONFIG = {
  critical: { color: "text-red-700",     bg: "bg-red-50",    border: "border-red-200",    shadow: "shadow-sm", label: "CRITICAL" },
  high:     { color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200", shadow: "shadow-sm", label: "HIGH"     },
  moderate: { color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",  shadow: "shadow-sm", label: "MODERATE" },
  low:      { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200",shadow: "shadow-sm", label: "LOW"      },
};

// CATEGORY_EMOJI removed

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
    r.waterLeak    && { label: "Water Leak",        color: "blue",   icon: <Droplet size={10} strokeWidth={3} /> },
    r.wiringExposed&& { label: "Exposed Wiring",   color: "yellow", icon: <Zap size={10} strokeWidth={3} /> },
    r.roofLeakFlag && { label: "Roof Leak",         color: "orange", icon: <Home size={10} strokeWidth={3} /> },
  ].filter(Boolean);

  const flagColors = {
    red:    "bg-red-50 border-red-300 text-red-700",
    blue:   "bg-blue-50 border-blue-300 text-blue-700",
    yellow: "bg-yellow-50 border-yellow-300 text-yellow-700",
    orange: "bg-orange-50 border-orange-300 text-orange-700",
  };

  return (
    <div className={`rounded-lg border overflow-hidden transition-all group ${rc.border} shadow-sm bg-white`}>
      {/* Main row */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className={`w-12 h-12 rounded bg-slate-50 border-2 border-slate-100 flex items-center justify-center font-bold text-slate-600 shadow-inner group-hover:border-blue-100 transition-colors`}>
              <span className="text-xs uppercase tracking-tighter">W{r.weekNumber}</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-slate-900 text-lg font-bold uppercase tracking-tight">
                  {r.category}
                </span>
                {r.photoUploaded && (
                  <Badge variant="info" size="sm" className="bg-blue-50/50">
                    <Camera size={10} className="mr-1" /> Imagery Secured
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                <Badge variant={riskLevel} size="sm">
                  {condCfg.label} ({r.conditionScore}/5)
                </Badge>
                {submittedAt && (
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {submittedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {flags.map((f, i) => (
              <Badge key={i} variant="default" size="sm" className="opacity-80">
                {f.label}
              </Badge>
            ))}

            <div className="w-px h-6 bg-slate-100 mx-2 hidden md:block" />

            <Badge variant={riskLevel} size="lg">
              {riskLevel} · {Math.round(r.priorityScore || 0)}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-8 h-8 p-0"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded prediction details */}
      {expanded && (
        <div className={`px-5 pb-5 pt-4 border-t ${rc.border} bg-slate-50 space-y-4`}>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            ML Prognostics
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded border border-slate-100 p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Priority Index</p>
              <p className={`text-xl font-bold ${rc.color}`}>{Math.round(r.priorityScore || 0)}<span className="text-[10px] opacity-50">/100</span></p>
            </div>
            <div className="bg-white rounded border border-slate-100 p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">MTTF</p>
              <p className={`text-xl font-bold ${r.willFailWithin30Days ? "text-red-600" : r.willFailWithin60Days ? "text-orange-600" : "text-emerald-600"}`}>
                {r.daysToFailure != null ? r.daysToFailure : "N/A"}
                <span className="text-[10px] opacity-50">d</span>
              </p>
            </div>
            <div className="bg-white rounded border border-slate-100 p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">30D Risk</p>
              <p className={`text-xs font-bold uppercase ${r.willFailWithin30Days ? "text-red-700" : "text-emerald-700"}`}>
                {r.willFailWithin30Days ? "High" : "Minimal"}
              </p>
            </div>
            <div className="bg-white rounded border border-slate-100 p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">60D Risk</p>
              <p className={`text-xs font-bold uppercase ${r.willFailWithin60Days ? "text-orange-700" : "text-emerald-700"}`}>
                {r.willFailWithin60Days ? "High" : "Minimal"}
              </p>
            </div>
          </div>

          {/* Numeric details */}
          {(r.category === "plumbing" && r.toiletFunctionalRatio != null) && (
            <div className="flex items-center gap-3 bg-white rounded border border-slate-100 px-4 py-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-40">Functionality Baseline</span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${Math.round(r.toiletFunctionalRatio * 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-blue-900 w-10 text-right">{Math.round(r.toiletFunctionalRatio * 100)}%</span>
            </div>
          )}
          {(r.category === "electrical" && r.powerOutageHours > 0) && (
            <div className="flex items-center gap-3 bg-white rounded border border-slate-100 px-4 py-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-40">Grid Downtime</span>
              <span className="text-sm font-bold text-slate-700">{r.powerOutageHours} hrs / week</span>
            </div>
          )}
          {(r.category === "structural" && r.crackWidthMM > 0) && (
            <div className="flex items-center gap-3 bg-white rounded border border-slate-100 px-4 py-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-40">Crack Aperture</span>
              <span className="text-sm font-bold text-slate-700">{r.crackWidthMM} mm</span>
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
      <div className="p-12 text-center text-slate-500 font-bold bg-white border border-slate-200 rounded-lg max-w-xl mx-auto mt-12 shadow-sm">
        <p className="text-xl text-slate-900 font-bold">Access Restricted</p>
        <p className="text-sm mt-2">School-level administrative authorization is required for this view.</p>
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
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <PageHeader 
        title="Technical Inspection Registry"
        subtitle="Historical audit log compiled from field infrastructure node submissions"
        icon={FileText}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <MetricCard label="Audit Volume" value={reports.length} icon={FileText} variant="info" trendValue={`Cycle: W${latestWeek}`} />
        <MetricCard 
          label="Critical Path" 
          value={criticalCount} 
          icon={AlertTriangle} 
          variant={criticalCount > 0 ? "critical" : "success"}
          trendValue={criticalCount > 0 ? "Urgent attention required" : "Registry optimal"}
        />
        <MetricCard 
          label="Elevated Risk" 
          value={warningCount} 
          icon={Clock} 
          variant={warningCount > 0 ? "high" : "success"}
          trendValue={warningCount > 0 ? "Monitor conditions closely" : "Stable baseline"}
        />
        <MetricCard label="Visual Evidence" value={photoCount} icon={Camera} variant="info" trendValue="Captured media total" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="text-[10px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
          <Filter size={14} /> Refine View:
        </div>

        <div className="flex gap-1.5">
          {["all", "plumbing", "electrical", "structural"].map(c => (
            <Button
              key={c}
              variant={catFilter === c ? "primary" : "ghost"}
              size="sm"
              onClick={() => setCatFilter(c)}
            >
              {c === "all" ? "All Domains" : c}
            </Button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-100" />

        <div className="flex gap-1.5">
          {["all", "critical", "high", "moderate", "low"].map(r => (
            <Button
              key={r}
              variant={riskFilter === r ? "primary" : "ghost"}
              size="sm"
              onClick={() => setRiskFilter(r)}
            >
              {r === "all" ? "Priority Levels" : RISK_CONFIG[r].label}
            </Button>
          ))}
        </div>

        <div className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {sorted.length} Entries Identified
        </div>
      </div>

      {/* Report list */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        {sorted.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded border border-dashed border-slate-200">
            <FileText size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">
              {reports.length === 0
                ? "Historical registry is currently empty."
                : "Search yielded no matches for current criteria."}
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
