import { useState, useEffect } from "react";
import { get, patch, post } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import MetricCard from "../../components/common/MetricCard";
import PageHeader from "../../components/common/PageHeader";
import useSocket from "../../hooks/useSocket";
import { API_BASE } from "../../services/api";
import {
  FileText, AlertTriangle, TrendingUp, TrendingDown,
  Building, MapPin, Users, Calendar, CheckCircle2, Clock,
  Shield, Download, Send, CheckSquare, ChevronDown, ChevronUp,
  Zap, Wrench, Droplets, Camera, X,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const RISK_LEVEL = (ps) => {
  if (ps >= 80) return "critical";
  if (ps >= 60) return "high";
  if (ps >= 40) return "moderate";
  return "low";
};

const CAT_ICON = {
  structural: <Building  size={14} className="shrink-0" />,
  electrical: <Zap       size={14} className="shrink-0" />,
  plumbing:   <Wrench    size={14} className="shrink-0" />,
  sanitation: <Droplets  size={14} className="shrink-0" />,
};

const SCORE_COLOR = (s) => {
  if (s >= 4) return "text-red-600";
  if (s >= 3) return "text-amber-600";
  return "text-emerald-600";
};

function getISOWeek() {
  const now  = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
}

function priorityToLevel(ps) {
  if (ps >= 80) return "critical";
  if (ps >= 60) return "high";
  if (ps >= 40) return "moderate";
  return "low";
}

function buildAnalysis(predictions) {
  if (!predictions || predictions.length === 0) return null;
  const scoreOf  = (p) => p.riskScore ?? p.storedPriorityScore ?? 0;
  const dtfOf    = (p) => p.estimated_days_to_failure ?? p.storedDaysToFailure ?? null;
  const fail30Of = (p) => p.within_30_days ?? p.storedWithin30Days ?? false;
  const fail60Of = (p) => p.within_60_days ?? p.storedWithin60Days ?? false;

  const overallScore   = Math.round(Math.max(...predictions.map(scoreOf)));
  const level          = priorityToLevel(overallScore);
  const worst          = predictions.reduce((a, b) => (scoreOf(b) > scoreOf(a) ? b : a));
  const dtfValues      = predictions.map(dtfOf).filter(d => d != null && !isNaN(d) && d > 0);
  const timeToFailureDays = dtfValues.length ? Math.round(Math.min(...dtfValues)) : null;
  const hasFail30      = predictions.some(fail30Of);
  const hasFail60      = predictions.some(fail60Of);
  const trend          = hasFail30 ? "deteriorating" : overallScore >= 60 ? "deteriorating" : "stable";

  const breakdown = {};
  for (const p of predictions) {
    const ps = Math.round(scoreOf(p));
    breakdown[p.category] = {
      score: ps, level: priorityToLevel(ps),
      conditionScore: p.storedConditionScore ?? p.conditionScore,
      willFailWithin30Days: fail30Of(p),
      deteriorationRate: p.deterioration_rate,
      evidence: p.evidence,
    };
  }

  let explanation = `Overall risk score: ${overallScore}/100. `;
  if (hasFail30) explanation += "⚠ Failure predicted within 30 days. ";
  else if (hasFail60) explanation += "Failure predicted within 60 days. ";
  explanation += `Worst category: ${worst.category}.`;

  return { score: overallScore, level, trend, worstCategory: worst.category, timeToFailureDays, reportCount: predictions.length, explanation, breakdown };
}

// ─── Group records by weekNumber ──────────────────────────────────────────────
function groupByWeek(records) {
  const map = {};
  for (const r of records) {
    const wk = r.weekNumber;
    if (!map[wk]) map[wk] = [];
    map[wk].push(r);
  }
  // Sort descending by week number
  return Object.entries(map)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([weekNumber, recs]) => ({ weekNumber: Number(weekNumber), records: recs }));
}

// ─── Image gallery strip ─────────────────────────────────────────────────────
function ImageGallery({ images }) {
  const [lightbox, setLightbox] = useState(null);
  if (!images?.length) return null;
  return (
    <>
      <div className="mt-2 ml-10 flex items-center gap-2 flex-wrap">
        {images.map((src, i) => {
          const url = src.startsWith('http') ? src : `${API_BASE}${src}`;
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
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const res = await patch(`/api/reports/${recordId}/review`, { note });
    setSaving(false);
    if (res.success) onReviewed(res.record);
    onClose();
  };

  return (
    <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded space-y-3">
      <label className="text-[10px] font-bold text-blue-700 uppercase tracking-widest block">Review Note</label>
      <textarea
        rows={3}
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Add your review notes for this weekly submission..."
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

// ─── Inline forward confirm panel ────────────────────────────────────────────
function ForwardConfirm({ weekNumber, recordIds, onForwarded, onClose }) {
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');

  const confirm = async () => {
    setSaving(true);
    setProgress('Forwarding...');
    const forwardedIds = [];
    for (const id of recordIds) {
      const res = await post(`/api/reports/${id}/forward`);
      if (res.success) forwardedIds.push(id);
    }
    setSaving(false);
    if (forwardedIds.length) onForwarded(forwardedIds);
    onClose();
  };

  return (
    <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded space-y-3">
      <p className="text-sm font-medium text-amber-800">
        Forward <span className="font-bold">Week {weekNumber}</span> report ({recordIds.length} categor{recordIds.length === 1 ? 'y' : 'ies'}) to the DEO for action?
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
function WeekCard({ group, isPrincipal, onRecordUpdated, onRecordsForwarded }) {
  const [expanded, setExpanded]     = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [showForward, setShowForward] = useState(false);

  const { weekNumber, records } = group;

  // The representative record (highest priority) to use for PDF download
  const repRecord = records.reduce((a, b) =>
    (b.priorityScore ?? 0) > (a.priorityScore ?? 0) ? b : a
  );

  const allForwarded = records.every(r => !!r.forwardedAt);
  const anyForwarded = records.some(r => !!r.forwardedAt);
  // Only forward records that haven't been forwarded yet
  const unforwardedIds = records.filter(r => !r.forwardedAt).map(r => r._id);

  const overallScore = Math.max(...records.map(r => r.priorityScore ?? 0));
  const level        = priorityToLevel(overallScore);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
      {/* Week header */}
      <div
        className="flex items-center justify-between px-5 py-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">
            W{weekNumber}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Week {weekNumber} Submission</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
              {records.length} categor{records.length === 1 ? 'y' : 'ies'} · {new Date(records[0].createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {allForwarded && (
            <Badge variant="success" size="sm">
              <Send size={10} className="mr-1" /> Forwarded to DEO
            </Badge>
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
          {records.map(record => (
            <div key={record._id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                    {CAT_ICON[record.category] || <FileText size={14} />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">{record.category}</span>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={`text-[10px] font-bold ${SCORE_COLOR(record.conditionScore)}`}>
                        Condition {record.conditionScore}/5
                      </span>
                      {record.priorityScore != null && (
                        <span className="text-[10px] font-semibold text-slate-500">
                          Risk {Math.round(record.priorityScore)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500 font-medium">
                  {record.waterLeak     && <Badge variant="critical" size="sm">Water Leak</Badge>}
                  {record.wiringExposed && <Badge variant="critical" size="sm">Wiring Exposed</Badge>}
                  {record.roofLeakFlag  && <Badge variant="high"     size="sm">Roof Leak</Badge>}
                  {record.issueFlag && !record.waterLeak && !record.wiringExposed && !record.roofLeakFlag && (
                    <Badge variant="default" size="sm">Issue Flagged</Badge>
                  )}
                  {record.forwardedAt && (
                    <Badge variant="success" size="sm">
                      <Send size={9} className="mr-1" /> Forwarded
                    </Badge>
                  )}
                </div>
              </div>

              {/* Photo evidence */}
              <ImageGallery images={record.images} />

              {/* Review note per category */}
              {record.reviewNote && (
                <div className="mt-2 ml-10 text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded px-3 py-2">
                  <span className="font-bold">Review note: </span>{record.reviewNote}
                </div>
              )}

              {/* Per-category review inline panel */}
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
          ))}

          {/* Week-level actions */}
          {isPrincipal && (
            <div className="px-5 py-4 bg-slate-50/60">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewingId(
                    reviewingId ? null : repRecord._id
                  )}
                >
                  <CheckSquare size={12} className="mr-1" />
                  {reviewingId ? 'Close Review' : 'Add Review'}
                </Button>

                <Button
                  variant={allForwarded ? "ghost" : "outline"}
                  size="sm"
                  disabled={allForwarded}
                  onClick={() => setShowForward(v => !v)}
                >
                  <Send size={12} className="mr-1" />
                  {allForwarded ? 'Already Forwarded' : 'Send to DEO'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`${API_BASE}/api/reports/${repRecord._id}/pdf`, '_blank')}
                >
                  <Download size={12} className="mr-1" /> Download PDF
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

// ─── Main SchoolView ──────────────────────────────────────────────────────────
export default function SchoolView() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const socket     = useSocket();
  const [analysis, setAnalysis]  = useState(null);
  const [reports, setReports]    = useState([]);
  const [school, setSchool]      = useState(null);
  const [loading, setLoading]    = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const schoolId = typeof user?.schoolId === "object" ? user?.schoolId?._id : user?.schoolId;
      if (!schoolId) { setLoading(false); return; }

      const [riskRes, reportsRes, schoolRes] = await Promise.all([
        get(`/api/risk/${schoolId}`),
        get(`/api/condition-report?schoolId=${schoolId}&limit=200`),
        get(`/api/schools/${schoolId}`),
      ]);

      if (riskRes.success)     setAnalysis(buildAnalysis(riskRes.predictions));
      if (reportsRes.success)  setReports(reportsRes.records || []);
      if (schoolRes.success)   setSchool(schoolRes.school);
      setLoading(false);
    };
    loadData();
  }, [user]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    socket.on('report:reviewed', ({ reportId, principalNote }) => {
      setReports(prev => prev.map(r =>
        r._id === reportId ? { ...r, reviewNote: principalNote } : r
      ));
    });
    socket.on('report:forwarded', ({ reportId }) => {
      setReports(prev => prev.map(r =>
        r._id === reportId ? { ...r, forwardedAt: new Date().toISOString() } : r
      ));
    });
    return () => {
      socket.off('report:reviewed');
      socket.off('report:forwarded');
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0f172a] rounded-full animate-spin" />
        <p className="text-slate-400 font-black tracking-[0.2em] text-[10px] uppercase animate-pulse">Analysing Profile...</p>
      </div>
    );
  }

  const isPrincipal = user?.role === 'principal' || user?.role === 'school';
  const canViewSchool = isPrincipal || user?.role === 'peon';

  if (!user?.schoolId || !canViewSchool) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white border border-slate-200 rounded-lg max-w-xl mx-auto mt-12 shadow-sm">
        <p className="text-xl text-slate-900 font-bold">Access Restricted</p>
        <p className="text-sm mt-2">This view is for school staff (Principal / Peon) only.</p>
      </div>
    );
  }

  const currentWeek  = getISOWeek();
  const currentMonth = new Date().getMonth();

  const uniqueCompletedWeeks = new Set(reports.map(r => r.weekNumber)).size;
  const completedThisMonth   = new Set(
    reports.filter(r => new Date(r.createdAt).getMonth() === currentMonth).map(r => r.weekNumber)
  ).size;
  const totalPending     = Math.max(0, currentWeek - uniqueCompletedWeeks);
  const pendingThisMonth = Math.max(0, 4 - completedThisMonth);
  const latestReport     = reports.length > 0 ? reports[0] : null;

  const weekGroups = groupByWeek(reports);

  // Callbacks to update local state
  const handleRecordUpdated = (updated) => {
    setReports(prev => prev.map(r => r._id === updated._id ? updated : r));
  };

  const handleRecordsForwarded = (ids) => {
    const now = new Date().toISOString();
    setReports(prev => prev.map(r =>
      ids.includes(r._id) ? { ...r, forwardedAt: now } : r
    ));
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title="Node Operations Center"
        subtitle={`Administrative Oversight · ${school?.name || "Generic Node"}`}
        icon={Building}
        actions={
          <Button onClick={() => navigate("/dashboard/reports")} variant="primary">
            Resource Registry
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 -mt-4">
        <Badge variant="info"    size="lg"><MapPin   size={12} className="mr-1.5" /> {school?.district    || "Unspecified Region"}</Badge>
        <Badge variant="default" size="lg"><Calendar size={12} className="mr-1.5" /> Structure Age: {school?.buildingAge ?? "?"}Y</Badge>
        <Badge variant="default" size="lg"><Users    size={12} className="mr-1.5" /> Registry Size: {school?.numStudents ?? "?"}</Badge>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Validation Required"
          value={totalPending}
          icon={Clock}
          variant={totalPending > 0 ? "high" : "success"}
          trendValue={`${pendingThisMonth} reports pending this month`}
        />
        <MetricCard
          label="Weeks Submitted"
          value={uniqueCompletedWeeks}
          icon={CheckCircle2}
          variant="success"
          trendValue={`${completedThisMonth} validated this month`}
        />
        <MetricCard
          label="Latest Submission"
          value={latestReport ? `Week ${latestReport.weekNumber}` : "None"}
          icon={FileText}
          variant="info"
          trendValue={latestReport ? `${latestReport.category} · score ${latestReport.conditionScore}/5` : "Registry empty"}
        />
      </div>

      {/* Risk Analysis */}
      <Card title="Structural Survival Analysis" icon={Shield}>
        {analysis ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Failure Horizon</p>
                <div className={`text-2xl font-bold ${(analysis.timeToFailureDays ?? 99) <= 15 ? "text-red-700" : "text-slate-900"}`}>
                  {analysis.timeToFailureDays || "N/A"} <span className="text-xs font-medium opacity-50 uppercase">Days</span>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Condition Trend</p>
                <div className={`text-xs font-bold flex items-center gap-1.5 uppercase ${analysis.trend === "deteriorating" ? "text-red-700" : "text-emerald-700"}`}>
                  {analysis.trend === "deteriorating" ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                  {analysis.trend}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Critical Vector</p>
                <div className="text-xs font-bold text-slate-900 uppercase">{analysis.worstCategory || "None"}</div>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Data Points</p>
                <div className="text-2xl font-bold text-slate-900">{analysis.reportCount || 0}</div>
              </div>
            </div>
            {analysis.breakdown && Object.keys(analysis.breakdown).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(analysis.breakdown).map(([cat, data]) => (
                  <div key={cat} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900 flex items-center gap-1.5">
                        {CAT_ICON[cat]}{cat}
                      </span>
                      <Badge variant={data.level} size="sm">{data.level}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${data.level === "critical" ? "bg-red-600" : data.level === "high" ? "bg-orange-500" : data.level === "moderate" ? "bg-amber-500" : "bg-emerald-600"}`}
                          style={{ width: `${data.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-900 w-8 text-right">{data.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 p-4 rounded text-xs font-medium text-blue-900">
              <AlertTriangle size={16} className="text-blue-700 shrink-0 mt-0.5" />
              <p>{analysis.explanation.replace("⚠", "")}</p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 font-medium text-sm italic">
            Insufficient audit data for predictive survival analysis.
          </div>
        )}
      </Card>

      {/* Weekly Reports — grouped by week */}
      <Card
        title="Weekly Condition Reports"
        subtitle={isPrincipal
          ? "Plumbing · Electrical · Structural submissions grouped by week — review, send to DEO, download PDF"
          : "All category submissions grouped by week"}
      >
        {weekGroups.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm italic">No condition reports submitted yet.</div>
        ) : (
          <div className="space-y-4">
            {weekGroups.map(group => (
              <WeekCard
                key={group.weekNumber}
                group={group}
                isPrincipal={isPrincipal}
                onRecordUpdated={handleRecordUpdated}
                onRecordsForwarded={handleRecordsForwarded}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
