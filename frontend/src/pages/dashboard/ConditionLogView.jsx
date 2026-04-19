import { useState, useEffect } from "react";
import { get, post, API_BASE } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { useLanguage } from "../../context/LanguageContext";
import PageHeader from "../../components/common/PageHeader";
import MetricCard from "../../components/common/MetricCard";
import AssignContractorModal from "../../components/deo/AssignContractorModal";
import {
  AlertTriangle, FileText, Camera, Clock, Filter,
  Send, CheckCircle2, ChevronDown, ChevronUp,
  Download, Wrench, Zap, Building, Cpu, ShieldAlert, Activity, UserPlus,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────
const URGENCY_CONFIG = {
  critical: { color: "text-red-700",     bg: "bg-red-50",     border: "border-red-300",     dot: "bg-red-600",     label: "CRITICAL" },
  high:     { color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-300",  dot: "bg-orange-500",  label: "HIGH"     },
  medium:   { color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-300",   dot: "bg-amber-500",   label: "MEDIUM"   },
  low:      { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", label: "LOW"      },
};

const CATEGORY_META = {
  plumbing:   { icon: Wrench,   color: "text-blue-700",   bg: "bg-blue-50"  },
  electrical: { icon: Zap,      color: "text-amber-700",  bg: "bg-amber-50" },
  structural: { icon: Building, color: "text-slate-700",  bg: "bg-slate-50" },
};

const CONDITION_LABEL = {
  1: "Excellent", 2: "Good", 3: "Fair", 4: "Poor", 5: "Critical",
};

function urgencyToLevel(u) {
  if (u >= 75) return "critical";
  if (u >= 55) return "high";
  if (u >= 30) return "medium";
  return "low";
}

// ─── Per-category sub-row inside a bundle ────────────────────────────────────
function CategoryRow({ rec, t }) {
  const meta = CATEGORY_META[rec.category] || CATEGORY_META.plumbing;
  const Icon = meta.icon;
  const urgency = rec.lrUrgencyFactor ?? rec.priorityScore ?? 0;
  const level   = rec.lrUrgencyLabel || urgencyToLevel(urgency);
  const u       = URGENCY_CONFIG[level];
  const dtf     = rec.lrDaysToFailure ?? rec.daysToFailure;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded ${meta.bg} flex items-center justify-center ${meta.color}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-tight text-slate-800">
            {rec.category}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            {CONDITION_LABEL[rec.conditionScore] || "?"} ({rec.conditionScore}/5)
            {rec.photoUploaded ? ` · ${t('clv.photo_on_file')}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-right">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('clv.lr_urgency')}</p>
          <div className="flex items-center gap-2 justify-end">
            <span className={`w-1.5 h-1.5 rounded-full ${u.dot}`} />
            <span className={`text-sm font-bold ${u.color}`}>{Math.round(urgency)}/100</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('clv.days_to_failure')}</p>
          <span className="text-sm font-bold text-slate-800">{dtf != null ? `${dtf}d` : "—"}</span>
        </div>
        <Badge variant={level === "critical" ? "critical" : level === "high" ? "high" : level === "medium" ? "warning" : "success"} size="sm">
          {u.label}
        </Badge>
      </div>
    </div>
  );
}

// ─── A weekly bundle (1 row per week, all 3 categories inside) ───────────────
function WeeklyBundleCard({ bundle, isPrincipal, isDEO, onForward, onView, onAssign, t }) {
  const [expanded, setExpanded] = useState(false);
  const u = URGENCY_CONFIG[bundle.urgencyLabel] || URGENCY_CONFIG.low;
  const submittedAt = bundle.categories[0]?.createdAt ? new Date(bundle.categories[0].createdAt) : null;

  return (
    <div className={`rounded-lg border-2 ${u.border} bg-white overflow-hidden shadow-sm`}>
      {/* Header row */}
      <div className={`px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${u.bg}`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-md bg-white border border-slate-200 flex flex-col items-center justify-center shadow-inner">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{t('clv.week')}</span>
            <span className="text-base font-bold text-slate-800 leading-none mt-0.5">{bundle.weekNumber}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold uppercase tracking-widest text-slate-800">
                {bundle.schoolName ? `${bundle.schoolName} · ` : ''}{t('clv.weekly_bundle')} ({t('fr.week_abbr')}{bundle.weekNumber})
              </span>
              <Badge variant={bundle.urgencyLabel === "critical" ? "critical" : bundle.urgencyLabel === "high" ? "high" : "default"} size="sm">
                {u.label}
              </Badge>
              {bundle.willFailWithin30Days && (
                <Badge variant="critical" size="sm">
                  <AlertTriangle size={10} className="mr-1" />
                  {t('fr.30_day_fail')}
                </Badge>
              )}
            </div>
            <p className="text-[12px] text-slate-500 font-medium">
              {bundle.categories.length} {bundle.categories.length !== 1 ? t('clv.categories') : t('clv.category')} · {t('clv.worst')}: {bundle.worstCategory}
              {submittedAt && ` · ${t('clv.submitted')} ${submittedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-right pr-3 border-r border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('clv.lr_urgency_score')}</p>
            <p className={`text-2xl font-bold ${u.color} leading-none`}>{bundle.maxUrgency}<span className="text-xs opacity-60">/100</span></p>
          </div>

          <Button variant="outline" size="sm" onClick={() => onView(bundle)}>
            <Download size={14} className="mr-1.5" /> {t('clv.view_pdf')}
          </Button>

          {isPrincipal && (
            bundle.forwarded ? (
              <Badge variant="success" size="md">
                <CheckCircle2 size={12} className="mr-1.5" />
                {t('clv.sent_to_deo')}
              </Badge>
            ) : (
              <Button variant="primary" size="sm" onClick={() => onForward(bundle)}>
                <Send size={14} className="mr-1.5" /> {t('clv.send_to_deo')}
              </Button>
            )
          )}

          {isDEO && bundle.forwarded && (
            <Button variant="primary" size="sm" onClick={() => onAssign(bundle)}>
              <UserPlus size={14} className="mr-1.5" /> {t('clv.assign_contractor')}
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="w-9 h-9 p-0">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
      </div>

      {/* Expanded per-category breakdown */}
      {expanded && (
        <div className="px-5 py-4 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={14} className="text-violet-700" />
            <span className="text-[11px] font-bold text-violet-700 uppercase tracking-widest">
              {t('clv.lr_model_output')}
            </span>
          </div>
          {bundle.categories.map(rec => (
            <CategoryRow key={rec._id} rec={rec} t={t} />
          ))}

          {bundle.forwarded && bundle.forwardedAt && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-700 font-bold uppercase tracking-wide">
              <CheckCircle2 size={12} />
              {t('clv.forwarded_to_deo_on')} {new Date(bundle.forwardedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function ConditionLogView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [bundles, setBundles]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [forwarding, setForwarding] = useState(null);
  const [toast, setToast]         = useState(null);
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [statusFilter, setStatusFilter]   = useState("all"); // all | pending | sent
  const [assignBundle, setAssignBundle]   = useState(null);

  const isPrincipal = user?.role === "principal" || user?.role === "school";
  const isDEO       = user?.role === "deo" || user?.role === "admin";

  const schoolId = typeof user?.schoolId === "object"
    ? user?.schoolId?._id
    : user?.schoolId;

  const loadBundles = async () => {
    setLoading(true);
    try {
      let url = null;
      if (isDEO) {
        // DEO sees every forwarded bundle, ranked by LR urgency
        const params = new URLSearchParams({ forwardedOnly: 'true' });
        if (user?.district) params.set('district', user.district);
        url = `/api/reports/weekly/bundles?${params.toString()}`;
      } else if (schoolId) {
        url = `/api/reports/weekly/bundles?schoolId=${schoolId}`;
      }
      if (!url) { setLoading(false); return; }
      const res = await get(url);
      if (res.success) setBundles(res.bundles || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBundles(); /* eslint-disable-next-line */ }, [user]);

  const handleForward = async (bundle) => {
    setForwarding(bundle.weekNumber);
    const res = await post(
      `/api/reports/weekly/${bundle.schoolId}/${bundle.weekNumber}/forward`,
      {}
    );
    setForwarding(null);
    if (res.success) {
      setToast({ ok: true, msg: `Bundle for Week ${bundle.weekNumber} forwarded to DEO (${res.decisions?.length || 0} categories).` });
      loadBundles();
      setTimeout(() => setToast(null), 4000);
    } else {
      setToast({ ok: false, msg: res.message || "Forward failed" });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleView = (bundle) => {
    // Open the existing PDF generator using any record id from this week
    const id = bundle.anchorRecordId;
    window.open(`${API_BASE}/api/reports/${id}/pdf`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 font-body">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0f172a] rounded-full animate-spin" />
        <p className="text-slate-400 font-bold tracking-[0.2em] text-[12px] uppercase animate-pulse">{t('clv.loading_reports')}</p>
      </div>
    );
  }

  if (!isPrincipal && !isDEO) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white border border-slate-200 rounded-lg max-w-xl mx-auto mt-12 shadow-sm">
        <p className="text-xl text-slate-900 font-bold">{t('clv.access_restricted')}</p>
        <p className="text-sm mt-2">{t('clv.auth_required')}</p>
      </div>
    );
  }

  if (isPrincipal && !schoolId) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white border border-slate-200 rounded-lg max-w-xl mx-auto mt-12 shadow-sm">
        <p className="text-xl text-slate-900 font-bold">{t('clv.account_unlinked')}</p>
        <p className="text-sm mt-2">{t('clv.no_school')}</p>
      </div>
    );
  }

  // ── Filters ──────────────────────────────────────────────────────────────
  const filtered = bundles.filter(b => {
    const uOk = urgencyFilter === "all" || b.urgencyLabel === urgencyFilter;
    const sOk = statusFilter === "all"
      || (statusFilter === "pending" && !b.forwarded)
      || (statusFilter === "sent"    && b.forwarded);
    return uOk && sOk;
  });

  // Sort by urgency descending (most urgent on top), tiebreak latest week first
  const sorted = [...filtered].sort((a, b) => {
    if (b.maxUrgency !== a.maxUrgency) return b.maxUrgency - a.maxUrgency;
    return b.weekNumber - a.weekNumber;
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  const criticalCount = bundles.filter(b => b.urgencyLabel === "critical").length;
  const fail30Count   = bundles.filter(b => b.willFailWithin30Days).length;
  const sentCount     = bundles.filter(b => b.forwarded).length;
  const pendingCount  = bundles.length - sentCount;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto pt-10 sm:pt-16 pb-12 px-4 sm:px-8 space-y-8">
        <PageHeader
          title={isDEO ? t('clv.deo_title') : t('clv.prin_title')}
          subtitle={isDEO ? t('clv.deo_subtitle') : t('clv.prin_subtitle')}
          icon={FileText}
        />

        {toast && (
          <div className={`p-4 rounded-md border font-bold text-xs uppercase tracking-wide flex items-center gap-3 ${
            toast.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                     : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {toast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {toast.msg}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <MetricCard label={t('clv.total_bundles')} value={bundles.length} icon={FileText} variant="info" />
          <MetricCard label={t('clv.critical_urgency')}     value={criticalCount} icon={ShieldAlert} variant={criticalCount > 0 ? "critical" : "success"} />
          <MetricCard label={t('clv.predicted_fail')} value={fail30Count} icon={Activity} variant={fail30Count > 0 ? "high" : "success"} />
          <MetricCard label={t('clv.sent_to_deo_stat')}          value={sentCount}    icon={Send} variant="info" trendValue={`${pendingCount} ${t('clv.pending')}`} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[12px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
            <Filter size={14} /> {t('clv.refine_view')}
          </div>

          <div className="flex gap-1.5">
            {["all", "critical", "high", "medium", "low"].map(r => (
              <Button
                key={r}
                variant={urgencyFilter === r ? "primary" : "ghost"}
                size="sm"
                onClick={() => setUrgencyFilter(r)}
              >
                {r === "all" ? t('clv.any_urgency') : URGENCY_CONFIG[r]?.label || r}
              </Button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-100" />

          <div className="flex gap-1.5">
            {[
              { id: "all",     label: t('clv.all_bundles') },
              { id: "pending", label: t('clv.awaiting_deo') },
              { id: "sent",    label: t('clv.sent_filter') },
            ].map(s => (
              <Button
                key={s.id}
                variant={statusFilter === s.id ? "primary" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter(s.id)}
              >
                {s.label}
              </Button>
            ))}
          </div>

          <div className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
            {sorted.length} {t('clv.bundles_sorted')}
          </div>
        </div>

        {/* Bundle list */}
        <Card variant="gov" title={t('clv.lr_reports')} subtitle={t('clv.one_card')} noPadding>
          <div className="p-6">
            {sorted.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded border border-dashed border-slate-200">
                <FileText size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">
                  {bundles.length === 0
                    ? t('clv.no_reports')
                    : t('clv.no_match')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sorted.map(b => (
                  <WeeklyBundleCard
                    key={`${b.schoolId}-${b.weekNumber}`}
                    bundle={b}
                    isPrincipal={isPrincipal}
                    isDEO={isDEO}
                    onForward={handleForward}
                    onView={handleView}
                    onAssign={setAssignBundle}
                    t={t}
                  />
                ))}
              </div>
            )}
            {forwarding && (
              <p className="text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-4">
                {t('clv.forwarding')} {forwarding}...
              </p>
            )}
          </div>
        </Card>

        {assignBundle && (
          <AssignContractorModal
            bundle={assignBundle}
            onClose={() => setAssignBundle(null)}
            onAssigned={() => {
              setToast({ ok: true, msg: `Contractor assigned for Week ${assignBundle.weekNumber} bundle.` });
              setTimeout(() => setToast(null), 4000);
              loadBundles();
            }}
          />
        )}
      </div>
    </div>
  );
}
