import { useState, useEffect } from "react";
import { get } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  AlertTriangle, FileText, Camera, Clock, Filter,
  Building2, Zap, Wrench, Droplet, ChevronDown, ChevronUp,
  Activity, CheckCircle2
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────
const CATEGORY_ICON = { 
  plumbing: <Wrench size={16} className="text-slate-500" />, 
  electrical: <Zap size={16} className="text-slate-500" />, 
  structural: <Building2 size={16} className="text-slate-500" /> 
};

function getRiskBadge(ps, r) {
  if (r.willFailWithin30Days || ps >= 80) return { label: "Critical", style: "bg-red-50 text-red-700 border-red-200" };
  if (r.willFailWithin60Days || ps >= 60) return { label: "High Risk", style: "bg-orange-50 text-orange-700 border-orange-200" };
  if (ps >= 40) return { label: "Moderate", style: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Low Risk", style: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

// ─── ReportCard ───────────────────────────────────────────────────────────────
function ReportCard({ r }) {
  const [expanded, setExpanded] = useState(false);
  const submittedAt = r.createdAt ? new Date(r.createdAt) : null;
  const badge = getRiskBadge(r.priorityScore || 0, r);

  const flags = [
    r.issueFlag    && { label: "Issue Flagged", icon: <AlertTriangle size={14} className="text-red-500" /> },
    r.waterLeak    && { label: "Water Leak",    icon: <Droplet size={14} className="text-blue-500" /> },
    r.wiringExposed&& { label: "Exposed Wiring",icon: <Zap size={14} className="text-orange-500" /> },
    r.roofLeakFlag && { label: "Roof Leak",     icon: <Building2 size={14} className="text-slate-500" /> },
  ].filter(Boolean);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Main row */}
      <div 
        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Left */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-slate-600">W{r.weekNumber}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              {CATEGORY_ICON[r.category] || <FileText size={16} className="text-slate-500" />}
              <span className="text-slate-900 font-semibold capitalize">
                {r.category} Inspection
              </span>
              {r.photoUploaded && (
                <span className="flex items-center gap-1 bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full border border-slate-200">
                  <Camera size={12} /> Photos
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500 font-medium">
                Condition Rating: {r.conditionScore}/5
              </span>
              {submittedAt && (
                <span className="text-xs text-slate-400">
                  • {submittedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-wrap items-center gap-3">
          {flags.map((f, i) => (
            <span key={i} className="text-xs font-medium px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700 flex items-center gap-1.5">
              {f.icon} {f.label}
            </span>
          ))}

          <div className="hidden md:block w-px h-6 bg-slate-200 mx-2" />

          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.style}`}>
            {badge.label}
          </span>

          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors ml-2"
          >
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50 rounded-b-lg">
          <p className="text-sm font-semibold text-slate-700 mb-3">Analysis Details</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Priority Score</p>
              <p className="text-lg font-semibold text-slate-800">
                {Math.round(r.priorityScore || 0)} <span className="text-xs text-slate-400 font-normal">/100</span>
              </p>
            </div>
            <div className="bg-white rounded border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Estimated Days to Issue</p>
              <p className={`text-lg font-semibold ${r.willFailWithin30Days ? "text-red-600" : "text-slate-800"}`}>
                {r.daysToFailure != null ? r.daysToFailure : "N/A"} <span className="text-xs font-normal">days</span>
              </p>
            </div>
            <div className="bg-white rounded border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Action Required (30 Days)</p>
              <p className={`text-sm font-semibold mt-1 ${r.willFailWithin30Days ? "text-red-600" : "text-emerald-600"}`}>
                {r.willFailWithin30Days ? "Yes" : "No"}
              </p>
            </div>
            <div className="bg-white rounded border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Action Required (60 Days)</p>
              <p className={`text-sm font-semibold mt-1 ${r.willFailWithin60Days ? "text-orange-600" : "text-emerald-600"}`}>
                {r.willFailWithin60Days ? "Yes" : "No"}
              </p>
            </div>
          </div>

          {/* Specific Data Points */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {(r.category === "plumbing" && r.toiletFunctionalRatio != null) && (
              <div className="flex items-center justify-between bg-white rounded border border-slate-200 px-4 py-2">
                <span className="text-sm text-slate-600">Functional Toilets</span>
                <span className="text-sm font-semibold text-slate-800">{Math.round(r.toiletFunctionalRatio * 100)}%</span>
              </div>
            )}
            {(r.category === "electrical" && r.powerOutageHours > 0) && (
              <div className="flex items-center justify-between bg-white rounded border border-slate-200 px-4 py-2">
                <span className="text-sm text-slate-600">Power Outages</span>
                <span className="text-sm font-semibold text-slate-800">{r.powerOutageHours} hrs/week</span>
              </div>
            )}
            {(r.category === "structural" && r.crackWidthMM > 0) && (
              <div className="flex items-center justify-between bg-white rounded border border-slate-200 px-4 py-2">
                <span className="text-sm text-slate-600">Crack Width Detected</span>
                <span className="text-sm font-semibold text-red-600">{r.crackWidthMM} mm</span>
              </div>
            )}
          </div>
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

  const schoolId = typeof user?.schoolId === "object" ? user?.schoolId?._id : user?.schoolId;

  useEffect(() => {
    const loadData = async () => {
      if (!schoolId) { setLoading(false); return; }
      const reportsRes = await get(`/api/condition-report?schoolId=${schoolId}&limit=100`);
      if (reportsRes.success) setReports(reportsRes.records || []);
      setLoading(false);
    };
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 font-body min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Loading reports...</p>
      </div>
    );
  }

  const isPrincipal = user?.role === "principal" || user?.role === "school";
  if (!user?.schoolId || !isPrincipal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="p-12 text-center text-slate-500 font-medium bg-white border border-slate-200 rounded-xl shadow-sm max-w-xl font-body">
          <p className="text-xl text-slate-800 font-semibold">Access Denied</p>
          <p className="text-sm mt-2 text-slate-500">Only Principal accounts can view reports for their school.</p>
        </div>
      </div>
    );
  }

  // ── Derived stats ────────────────────────────────────────────────────────────
  const criticalCount   = reports.filter(r => r.willFailWithin30Days).length;
  const warningCount    = reports.filter(r => !r.willFailWithin30Days && r.willFailWithin60Days).length;
  const photoCount      = reports.filter(r => r.photoUploaded).length;

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = reports.filter(r => {
    const catOk  = catFilter  === "all" || r.category === catFilter;
    let riskOk = true;
    if (riskFilter !== "all") {
      const badge = getRiskBadge(r.priorityScore || 0, r);
      riskOk = badge.label.toUpperCase() === riskFilter.replace('_', ' ');
    }
    return catOk && riskOk;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const ps = (b.priorityScore || 0) - (a.priorityScore || 0);
    if (ps !== 0) return ps;
    return b.weekNumber - a.weekNumber;
  });

  // Determine image
  const imgIndex = (String(schoolId).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 10;
  const images = [
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80',
    'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=1200&q=80',
    'https://images.unsplash.com/photo-1510531704581-5b2870972060?w=1200&q=80',
    'https://images.unsplash.com/photo-1498075702571-ecb018f3752d?w=1200&q=80',
    'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=1200&q=80',
    'https://images.unsplash.com/photo-1584697964149-14a9386d3b4d?w=1200&q=80',
    'https://images.unsplash.com/photo-1536337005238-94b997371b40?w=1200&q=80',
    'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&q=80',
    'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=1200&q=80'
  ];
  const imageUrl = images[imgIndex];

  return (
    <div className="min-h-screen bg-slate-50 font-body py-8 pb-12">
      <div className="max-w-5xl mx-auto px-6 space-y-6">
        
        {/* Image Title Card */}
        <div className="relative w-full h-40 md:h-48 bg-slate-900 rounded-2xl overflow-hidden shadow-md">
          <img src={imageUrl} alt="School Banner" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent" />
          
          <div className="absolute inset-0 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col justify-center h-full">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight drop-shadow-md">
                Inspection Registry
              </h1>
              <p className="mt-1.5 text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} /> Review weekly condition reports
              </p>
            </div>
            
            <div className="bg-white/10 border border-white/20 backdrop-blur-md px-6 py-3 rounded-xl shadow-xl text-center min-w-[140px] flex flex-col justify-center">
               <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-0.5">Total Records</span>
               <span className="text-2xl font-bold text-white">{reports.length}</span>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Critical Issues</p>
              <p className={`text-3xl font-semibold ${criticalCount > 0 ? "text-red-600" : "text-slate-800"}`}>{criticalCount}</p>
              {criticalCount > 0 && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertTriangle size={12} /> Requires immediate attention
                </p>
              )}
            </div>
            <div className={`p-3 rounded-full ${criticalCount > 0 ? "bg-red-50" : "bg-slate-50"}`}>
               <AlertTriangle size={24} className={criticalCount > 0 ? "text-red-500" : "text-slate-400"} />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Warnings</p>
              <p className="text-3xl font-semibold text-slate-800">{warningCount}</p>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <Clock size={12} /> Monitored assets
              </p>
            </div>
            <div className="p-3 rounded-full bg-slate-50">
               <Activity size={24} className="text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Photos Uploaded</p>
              <p className="text-3xl font-semibold text-slate-800">{photoCount}</p>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <Camera size={12} /> Supporting evidence
              </p>
            </div>
            <div className="p-3 rounded-full bg-slate-50">
               <Camera size={24} className="text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters and List */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          
          {/* Filters Bar */}
          <div className="border-b border-slate-200 p-4 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50 rounded-t-xl">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Filter size={16} /> Filters
              </div>

              {/* Category filter */}
              <div className="flex gap-2">
                {["all", "plumbing", "electrical", "structural"].map(c => (
                  <button
                    key={c}
                    onClick={() => setCatFilter(c)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                      catFilter === c
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="w-px h-6 bg-slate-300 hidden md:block" />

              {/* Risk filter */}
              <div className="flex gap-2">
                {["all", "CRITICAL", "HIGH_RISK", "MODERATE", "LOW_RISK"].map(r => (
                  <button
                    key={r}
                    onClick={() => setRiskFilter(r)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      riskFilter === r
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {r === "all" ? "All Levels" : r.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-sm font-medium text-slate-500">
              Showing {sorted.length} {sorted.length === 1 ? "report" : "reports"}
            </span>
          </div>

          {/* Report list */}
          <div className="p-4">
            {sorted.length === 0 ? (
              <div className="text-center py-16">
                <FileText size={40} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">
                  {reports.length === 0
                    ? "No inspection reports have been submitted yet."
                    : "No reports match your current filters."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sorted.map(r => (
                  <ReportCard key={r._id} r={r} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
