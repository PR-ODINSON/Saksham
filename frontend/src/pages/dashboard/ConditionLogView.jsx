import { useState, useEffect } from "react";
import { get, patch, post } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import PageHeader from "../../components/common/PageHeader";
import MetricCard from "../../components/common/MetricCard";
import useSocket from "../../hooks/useSocket";
import { API_BASE } from "../../services/api";
import {
  AlertTriangle, FileText, Camera, Clock, Filter,
  CheckCircle2, ChevronDown, ChevronUp,
  Zap, Wrench, Building, Send, Download, CheckSquare,
  Droplet, Home, X, ShieldAlert,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────
const RISK_CONFIG = {
  critical: { color: "text-red-700",     bg: "bg-red-50",     border: "border-red-200",    label: "CRITICAL" },
  high:     { color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200", label: "HIGH"     },
  moderate: { color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",  label: "MODERATE" },
  low:      { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200",label: "LOW"      },
};

const CONDITION_LABELS = {
  1: { label: "Excellent", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-400" },
  2: { label: "Good",      color: "text-teal-700",    bg: "bg-teal-50",    border: "border-teal-400"    },
  3: { label: "Fair",      color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-400"   },
  4: { label: "Poor",      color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-500"  },
  5: { label: "Critical",  color: "text-red-700",     bg: "bg-red-100",    border: "border-red-600"     },
};

const CAT_ICON = {
  structural: <Building  size={14} className="shrink-0" />,
  electrical: <Zap       size={14} className="shrink-0" />,
  plumbing:   <Wrench    size={14} className="shrink-0" />,
};

function scoreToRiskLevel(ps) {
  if (ps >= 80) return "critical";
  if (ps >= 60) return "high";
  if (ps >= 40) return "moderate";
  return "low";
}

function priorityToLevel(ps) {
  if (ps >= 80) return "critical";
  if (ps >= 60) return "high";
  if (ps >= 40) return "moderate";
  return "low";
}

// ─── Group records by weekNumber ──────────────────────────────────────────────
function groupByWeek(records) {
  const map = {};
  for (const r of records) {
    const wk = r.weekNumber;
    if (!map[wk]) map[wk] = [];
    map[wk].push(r);
  }
  return Object.entries(map)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([weekNumber, recs]) => ({ weekNumber: Number(weekNumber), records: recs }));
}

// ─── Image gallery with lightbox ─────────────────────────────────────────────
function ImageGallery({ images }) {
  const [lightbox, setLightbox] = useState(null);
  if (!images?.length) return null;
  return (
    <>
      <div className="mt-2 ml-10 flex items-center gap-2 flex-wrap">
        {images.map((src, i) => {
          const url = src.startsWith("http") ? src : `${API_BASE}${src}`;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(url)}
              className="w-16 h-16 rounded-lg border-2 border-slate-200 overflow-hidden hover:border-blue-400 transition-all shadow-sm group relative"
            >
              <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                <Camera size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          );
        })}
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/40 rounded-full p-2"
            onClick={() => setLightbox(null)}
          >
            <X size={20} />
          </button>
          <img
            src={lightbox}
            alt="Evidence full size"
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ─── Inline review panel ──────────────────────────────────────────────────────
function ReviewPanel({ recordId, onReviewed, onClose }) {
  const [note, setNote]     = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const res = await patch(`/api/reports/${recordId}/review`, { note });
    setSaving(false);
    if (res.success) onReviewed(res.record);
    onClose();
  };

  return (
    <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
      <label className="text-[10px] font-bold text-blue-700 uppercase tracking-widest block">Review Note</label>
      <textarea
        rows={3}
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Add review notes for this weekly submission..."
        className="w-full text-sm border border-blue-200 rounded p-2 outline-none focus:ring-1 focus:ring-blue-400 resize-none"
        autoFocus
      />
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" isLoading={saving} onClick={submit}>Submit Review</Button>
      </div>
    </div>
  );
}

// ─── Forward confirm panel ────────────────────────────────────────────────────
function ForwardConfirm({ weekNumber, recordIds, onForwarded, onClose }) {
  const [saving,   setSaving]   = useState(false);
  const [progress, setProgress] = useState("");

  const confirm = async () => {
    setSaving(true);
    setProgress("Forwarding…");
    const forwarded = [];
    for (const id of recordIds) {
      const res = await post(`/api/reports/${id}/forward`);
      if (res.success) forwarded.push(id);
    }
    setSaving(false);
    if (forwarded.length) onForwarded(forwarded);
    onClose();
  };

  return (
    <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
      <p className="text-sm font-medium text-amber-800">
        Forward <span className="font-bold">Week {weekNumber}</span> report ({recordIds.length} categor{recordIds.length === 1 ? "y" : "ies"}) to DEO for action?
      </p>
      {progress && <p className="text-xs text-amber-600 font-medium">{progress}</p>}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" size="sm" isLoading={saving} onClick={confirm}>Confirm Forward</Button>
      </div>
    </div>
  );
}

// ─── Week group card ──────────────────────────────────────────────────────────
function WeekCard({ group, isPrincipal, catFilter, riskFilter, onRecordUpdated, onRecordsForwarded }) {
  const [expanded,    setExpanded]    = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [showForward, setShowForward] = useState(false);

  const { weekNumber, records } = group;

  // Apply category and risk filters within the group
  const visible = records.filter(r => {
    const catOk  = catFilter  === "all" || r.category === catFilter;
    const rl     = scoreToRiskLevel(r.priorityScore || 0);
    const riskOk = riskFilter === "all" || rl === riskFilter;
    return catOk && riskOk;
  });

  if (visible.length === 0) return null;

  const repRecord       = records.reduce((a, b) => (b.priorityScore ?? 0) > (a.priorityScore ?? 0) ? b : a);
  const allForwarded    = records.every(r => !!r.forwardedAt);
  const anyForwarded    = records.some(r => !!r.forwardedAt);
  const unforwardedIds  = records.filter(r => !r.forwardedAt).map(r => r._id);
  const overallScore    = Math.max(...records.map(r => r.priorityScore ?? 0));
  const level           = priorityToLevel(overallScore);
  const rc              = RISK_CONFIG[level];

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
      {/* Week header */}
      <div
        className="flex items-center justify-between px-5 py-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">
            W{weekNumber}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Week {weekNumber} Submission</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
              {records.length} categor{records.length === 1 ? "y" : "ies"} · {new Date(records[0].createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {allForwarded && (
            <Badge variant="success" size="sm"><Send size={10} className="mr-1" /> Forwarded to DEO</Badge>
          )}
          {!allForwarded && anyForwarded && (
            <Badge variant="info" size="sm">Partially Forwarded</Badge>
          )}
          <Badge variant={level} size="sm">Score {Math.round(overallScore)}</Badge>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-slate-100">
          {/* Category rows */}
          {visible.map(record => {
            const rl      = scoreToRiskLevel(record.priorityScore || 0);
            const condCfg = CONDITION_LABELS[record.conditionScore] || CONDITION_LABELS[3];
            const flags   = [
              record.issueFlag     && { label: "Issue",         icon: <AlertTriangle size={9} /> },
              record.waterLeak     && { label: "Water Leak",    icon: <Droplet       size={9} /> },
              record.wiringExposed && { label: "Exposed Wiring",icon: <Zap           size={9} /> },
              record.roofLeakFlag  && { label: "Roof Leak",     icon: <Home          size={9} /> },
            ].filter(Boolean);

            return (
              <div key={record._id} className="px-5 py-4">
                {/* Category row header */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      {CAT_ICON[record.category] || <FileText size={14} />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">{record.category}</span>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-bold ${condCfg.color}`}>
                          {condCfg.label} · {record.conditionScore}/5
                        </span>
                        {record.priorityScore != null && (
                          <span className={`text-[10px] font-semibold ${RISK_CONFIG[rl]?.color}`}>
                            Risk {Math.round(record.priorityScore)}
                          </span>
                        )}
                        {record.daysToFailure != null && (
                          <span className={`text-[10px] font-semibold ${record.willFailWithin30Days ? "text-red-600" : record.willFailWithin60Days ? "text-orange-600" : "text-slate-400"}`}>
                            {record.daysToFailure < 0 ? "Overdue" : `${Math.abs(Math.round(record.daysToFailure))}d to failure`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {flags.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded border bg-red-50 border-red-200 text-red-700">
                        {f.icon}{f.label}
                      </span>
                    ))}
                    {record.forwardedAt && (
                      <Badge variant="success" size="sm"><Send size={9} className="mr-1" /> Forwarded</Badge>
                    )}
                    {record.images?.length > 0 && (
                      <Badge variant="info" size="sm"><Camera size={9} className="mr-1" /> {record.images.length} Photo{record.images.length > 1 ? "s" : ""}</Badge>
                    )}
                  </div>
                </div>

                {/* Expanded ML stats */}
                <div className="mt-3 ml-10 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-center">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Priority</p>
                    <p className={`text-base font-bold ${RISK_CONFIG[rl]?.color}`}>{Math.round(record.priorityScore || 0)}<span className="text-[9px] opacity-50">/100</span></p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-center">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Days Safe</p>
                    <p className={`text-base font-bold ${record.willFailWithin30Days ? "text-red-600" : record.willFailWithin60Days ? "text-orange-600" : "text-emerald-600"}`}>
                      {record.daysToFailure != null ? Math.round(record.daysToFailure) : "N/A"}
                      <span className="text-[9px] opacity-50">d</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-center">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">30-Day Risk</p>
                    <p className={`text-xs font-bold uppercase ${record.willFailWithin30Days ? "text-red-700" : "text-emerald-700"}`}>
                      {record.willFailWithin30Days ? "Critical" : "Minimal"}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-center">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">60-Day Risk</p>
                    <p className={`text-xs font-bold uppercase ${record.willFailWithin60Days ? "text-orange-700" : "text-emerald-700"}`}>
                      {record.willFailWithin60Days ? "Elevated" : "Minimal"}
                    </p>
                  </div>
                </div>

                {/* Category-specific metrics */}
                {record.category === "plumbing" && record.toiletFunctionalRatio != null && (
                  <div className="mt-2 ml-10 flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 w-36">Toilet Functionality</span>
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${Math.round(record.toiletFunctionalRatio * 100)}%` }} />
                    </div>
                    <span className="text-xs font-bold text-blue-900 w-8 text-right">{Math.round(record.toiletFunctionalRatio * 100)}%</span>
                  </div>
                )}
                {record.category === "electrical" && record.powerOutageHours > 0 && (
                  <div className="mt-2 ml-10 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Grid Downtime: </span>
                    <span className="text-xs font-bold text-slate-700">{record.powerOutageHours} hrs/week</span>
                  </div>
                )}
                {record.category === "structural" && record.crackWidthMM > 0 && (
                  <div className="mt-2 ml-10 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Crack Width: </span>
                    <span className="text-xs font-bold text-slate-700">{record.crackWidthMM} mm</span>
                  </div>
                )}

                {/* Photos */}
                <ImageGallery images={record.images} />

                {/* Review note */}
                {record.reviewNote && (
                  <div className="mt-2 ml-10 text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <span className="font-bold">Review note: </span>{record.reviewNote}
                  </div>
                )}

                {/* Per-category inline review */}
                {reviewingId === record._id && (
                  <div className="ml-10">
                    <ReviewPanel
                      recordId={record._id}
                      onReviewed={(updated) => {
                        onRecordUpdated(updated);
                        setReviewingId(null);
                      }}
                      onClose={() => setReviewingId(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Principal action bar */}
          {isPrincipal && (
            <div className="px-5 py-4 bg-slate-50/70 border-t border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewingId(reviewingId ? null : repRecord._id)}
                >
                  <CheckSquare size={12} className="mr-1.5" />
                  {reviewingId ? "Close Review" : "Add Review"}
                </Button>

                <Button
                  variant={allForwarded ? "ghost" : "outline"}
                  size="sm"
                  disabled={allForwarded}
                  onClick={() => setShowForward(v => !v)}
                >
                  <Send size={12} className="mr-1.5" />
                  {allForwarded ? "Already Forwarded" : showForward ? "Cancel" : "Send to DEO"}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`${API_BASE}/api/reports/${repRecord._id}/pdf`, "_blank")}
                >
                  <Download size={12} className="mr-1.5" /> Download PDF
                </Button>
              </div>

              {showForward && !allForwarded && (
                <ForwardConfirm
                  weekNumber={weekNumber}
                  recordIds={unforwardedIds}
                  onForwarded={(ids) => {
                    onRecordsForwarded(ids);
                    setShowForward(false);
                  }}
                  onClose={() => setShowForward(false)}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ConditionLogView() {
  const { user }   = useAuth();
  const socket     = useSocket();
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [catFilter,  setCatFilter]  = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  const schoolId = typeof user?.schoolId === "object" ? user?.schoolId?._id : user?.schoolId;
  const isPrincipal = user?.role === "principal" || user?.role === "school";
  const canView     = isPrincipal || user?.role === "peon";

  useEffect(() => {
    const loadData = async () => {
      if (!schoolId) { setLoading(false); return; }
      const res = await get(`/api/condition-report?schoolId=${schoolId}&limit=200`);
      if (res.success) setReports(res.records || []);
      setLoading(false);
    };
    loadData();
  }, [schoolId]);

  // Socket: live updates
  useEffect(() => {
    if (!socket) return;
    socket.on("report:reviewed", ({ reportId, principalNote }) => {
      setReports(prev => prev.map(r => r._id === reportId ? { ...r, reviewNote: principalNote } : r));
    });
    socket.on("report:forwarded", ({ reportId }) => {
      setReports(prev => prev.map(r => r._id === reportId ? { ...r, forwardedAt: new Date().toISOString() } : r));
    });
    return () => {
      socket.off("report:reviewed");
      socket.off("report:forwarded");
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0f172a] rounded-full animate-spin" />
        <p className="text-slate-400 font-black tracking-[0.2em] text-[10px] uppercase animate-pulse">Loading Reports…</p>
      </div>
    );
  }

  if (!schoolId || !canView) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white border border-slate-200 rounded-lg max-w-xl mx-auto mt-12 shadow-sm">
        <p className="text-xl text-slate-900 font-bold">Access Restricted</p>
        <p className="text-sm mt-2">This view is for school-level staff (Principal / Peon) only.</p>
      </div>
    );
  }

  // ── Derived stats from live data ─────────────────────────────────────────────
  const criticalCount = reports.filter(r => r.willFailWithin30Days).length;
  const warningCount  = reports.filter(r => !r.willFailWithin30Days && r.willFailWithin60Days).length;
  const photoCount    = reports.reduce((s, r) => s + (r.images?.length || (r.photoUploaded ? 1 : 0)), 0);
  const latestWeek    = reports.length ? Math.max(...reports.map(r => r.weekNumber)) : 0;
  const weekCount     = new Set(reports.map(r => r.weekNumber)).size;
  const forwardedCount = reports.filter(r => r.forwardedAt).length;

  // ── Week-grouped view ────────────────────────────────────────────────────────
  const weekGroups = groupByWeek(reports);

  // Callbacks
  const handleRecordUpdated = (updated) => {
    setReports(prev => prev.map(r => r._id === updated._id ? updated : r));
  };
  const handleRecordsForwarded = (ids) => {
    const now = new Date().toISOString();
    setReports(prev => prev.map(r => ids.includes(r._id) ? { ...r, forwardedAt: now } : r));
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title="Technical Inspection Registry"
        subtitle={isPrincipal
          ? "Weekly submissions grouped by session — review, forward to DEO, and download PDF"
          : "Historical audit log of field infrastructure submissions"}
        icon={FileText}
      />

      {/* Summary stats — all from live DB data */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Submissions"
          value={reports.length}
          icon={FileText}
          variant="info"
          trendValue={`${weekCount} week${weekCount !== 1 ? "s" : ""} · latest W${latestWeek}`}
        />
        <MetricCard
          label="Critical Path"
          value={criticalCount}
          icon={AlertTriangle}
          variant={criticalCount > 0 ? "critical" : "success"}
          trendValue={criticalCount > 0 ? "Failure within 30 days" : "No immediate failures"}
        />
        <MetricCard
          label="Elevated Risk"
          value={warningCount}
          icon={Clock}
          variant={warningCount > 0 ? "high" : "success"}
          trendValue={warningCount > 0 ? "Monitor closely" : "Stable baseline"}
        />
        <MetricCard
          label="Photos Captured"
          value={photoCount}
          icon={Camera}
          variant="info"
          trendValue={`${forwardedCount} record${forwardedCount !== 1 ? "s" : ""} forwarded to DEO`}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
          <Filter size={13} /> Filter:
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {["all", "plumbing", "electrical", "structural"].map(c => (
            <Button key={c} variant={catFilter === c ? "primary" : "ghost"} size="sm" onClick={() => setCatFilter(c)}>
              {c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}
            </Button>
          ))}
        </div>
        <div className="w-px h-5 bg-slate-200 hidden md:block" />
        <div className="flex gap-1.5 flex-wrap">
          {["all", "critical", "high", "moderate", "low"].map(r => (
            <Button key={r} variant={riskFilter === r ? "primary" : "ghost"} size="sm" onClick={() => setRiskFilter(r)}>
              {r === "all" ? "All Risk Levels" : RISK_CONFIG[r].label}
            </Button>
          ))}
        </div>
        <div className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {weekGroups.length} Week{weekGroups.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Week-grouped report list */}
      <div className="space-y-4">
        {weekGroups.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
            <ShieldAlert size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 font-medium text-sm">
              {reports.length === 0
                ? "No condition reports submitted yet. Peon submissions will appear here."
                : "No records match the current filters."}
            </p>
          </div>
        ) : (
          weekGroups.map(group => (
            <WeekCard
              key={group.weekNumber}
              group={group}
              isPrincipal={isPrincipal}
              catFilter={catFilter}
              riskFilter={riskFilter}
              onRecordUpdated={handleRecordUpdated}
              onRecordsForwarded={handleRecordsForwarded}
            />
          ))
        )}
      </div>
    </div>
  );
}
