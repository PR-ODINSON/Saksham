import { useState, useEffect } from "react";
import { get, post, API_BASE } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import AssignContractorModal from "../../components/deo/AssignContractorModal";
import {
  AlertTriangle, FileText, Clock, Send, CheckCircle2,
  RefreshCw,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────
const URGENCY = {
  critical: { color: "text-red-600",     dot: "bg-red-500",     label: "Critical" },
  high:     { color: "text-orange-600",  dot: "bg-orange-500",  label: "High"     },
  medium:   { color: "text-amber-600",   dot: "bg-amber-500",   label: "Medium"   },
  low:      { color: "text-emerald-600", dot: "bg-emerald-500", label: "Low"      },
};

const CATEGORY_COLOR = {
  plumbing:   "text-blue-700 bg-blue-50",
  electrical: "text-amber-700 bg-amber-50",
  structural: "text-slate-700 bg-slate-100",
};


// ─── Main view ────────────────────────────────────────────────────────────────
export default function ConditionLogView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forwarding, setForwarding] = useState(null);
  const [toast, setToast] = useState(null);
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | sent
  const [assignBundle, setAssignBundle] = useState(null);

  const isPrincipal = user?.role === "principal" || user?.role === "school";
  const isDEO = user?.role === "deo" || user?.role === "admin";

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
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">{t('clv.loading_reports')}</p>
      </div>
    );
  }

  if (!isPrincipal && !isDEO) {
    return (
      <div className="p-10 text-center bg-white border border-slate-200 rounded-xl max-w-xl mx-auto mt-12">
        <p className="text-lg text-slate-900">{t('clv.access_restricted')}</p>
        <p className="text-sm text-slate-500 mt-2">{t('clv.auth_required')}</p>
      </div>
    );
  }

  if (isPrincipal && !schoolId) {
    return (
      <div className="p-10 text-center bg-white border border-slate-200 rounded-xl max-w-xl mx-auto mt-12">
        <p className="text-lg text-slate-900">{t('clv.account_unlinked')}</p>
        <p className="text-sm text-slate-500 mt-2">{t('clv.no_school')}</p>
      </div>
    );
  }

  // ── Filters ──────────────────────────────────────────────────────────────
  const filtered = bundles.filter(b => {
    const uOk = urgencyFilter === "all" || b.urgencyLabel === urgencyFilter;
    const sOk = statusFilter === "all"
      || (statusFilter === "pending" && !b.forwarded)
      || (statusFilter === "sent" && b.forwarded);
    return uOk && sOk;
  });

  // Sort by urgency descending (most urgent on top), tiebreak latest week first
  const sorted = [...filtered].sort((a, b) => {
    if (b.maxUrgency !== a.maxUrgency) return b.maxUrgency - a.maxUrgency;
    return b.weekNumber - a.weekNumber;
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  const criticalCount = bundles.filter(b => b.urgencyLabel === "critical").length;
  const fail30Count = bundles.filter(b => b.willFailWithin30Days).length;
  const sentCount = bundles.filter(b => b.forwarded).length;
  const pendingCount = bundles.length - sentCount;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto pt-8 sm:pt-12 pb-12 px-4 sm:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl text-slate-900">
              {isDEO ? "Forwarded Reports" : "My Weekly Reports"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isDEO
                ? "Weekly bundles sent in by school principals — sorted by urgency."
                : "Weekly snapshots of your school. Forward the urgent ones to your DEO."}
            </p>
          </div>
          <button
            onClick={loadBundles}
            className="h-9 px-3 inline-flex items-center gap-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm self-start sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {toast && (
          <div className={`px-4 py-3 rounded-md border text-sm flex items-center gap-2 ${
            toast.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {toast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {toast.msg}
          </div>
        )}

        {/* Stat tiles — minimalist */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="Total bundles"        value={bundles.length} />
          <StatTile label="Critical urgency"     value={criticalCount}  tone={criticalCount > 0 ? "red"    : "muted"} />
          <StatTile label="Predicted fail < 30d" value={fail30Count}    tone={fail30Count   > 0 ? "amber"  : "muted"} />
          <StatTile label={isDEO ? "Already received" : "Sent to DEO"}  value={sentCount}
            hint={pendingCount > 0 ? `${pendingCount} awaiting` : null}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-wrap gap-2 flex-1">
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
            >
              <option value="all">All urgency</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
            >
              <option value="all">All status</option>
              <option value="pending">Awaiting</option>
              <option value="sent">Forwarded</option>
            </select>
          </div>

          <span className="text-xs text-slate-500">
            Showing <span className="text-slate-900 font-medium">{sorted.length}</span> of {bundles.length}
          </span>
        </div>

        {/* Bundle list */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {sorted.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-400 text-sm">
              {bundles.length === 0 ? t('clv.no_reports') : t('clv.no_match')}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sorted.map(b => {
                const u = URGENCY[b.urgencyLabel] || URGENCY.low;
                return (
                  <li
                    key={`${b.schoolId}-${b.weekNumber}`}
                    className="flex items-start sm:items-center gap-4 px-5 sm:px-6 py-4 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Week pill */}
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex-shrink-0">
                      <span className="text-[10px] text-slate-400 leading-none">Wk</span>
                      <span className="text-base font-semibold text-slate-900 leading-none mt-0.5">
                        {b.weekNumber}
                      </span>
                    </div>

                    {/* School + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {isDEO && (
                          <span className="text-base text-slate-900 truncate">{b.schoolName}</span>
                        )}
                        {!isDEO && (
                          <span className="text-base text-slate-900">Week {b.weekNumber} bundle</span>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${u.dot}`} />
                          <span className={`text-xs ${u.color}`}>{u.label}</span>
                        </span>
                        {b.willFailWithin30Days && (
                          <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                            30-day risk
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        {isDEO && (
                          <span className="text-xs text-slate-500 truncate">
                            {b.district || "—"}
                          </span>
                        )}
                        {isDEO && b.categories?.length > 0 && (
                          <span className="text-slate-300 text-xs">·</span>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {b.categories.map(cat => (
                            <span
                              key={cat._id}
                              className={`px-1.5 py-0.5 rounded text-[11px] capitalize ${
                                CATEGORY_COLOR[cat.category] || "text-slate-600 bg-slate-100"
                              }`}
                            >
                              {cat.category}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Risk score */}
                    <div className="hidden sm:flex flex-col items-end pr-2">
                      <span className="text-xl font-semibold text-slate-900 leading-none">
                        {b.maxUrgency}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">/100</span>
                    </div>

                    {/* Status (always visible, compact) */}
                    <div className="hidden md:flex flex-col items-end pr-2">
                      {b.forwarded ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                          <CheckCircle2 size={12} /> Forwarded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                          <Clock size={12} /> Awaiting
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleView(b)}
                        className="h-9 px-3 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                        title={t('clv.view_pdf')}
                      >
                        PDF
                      </button>

                      {isPrincipal && !b.forwarded && (
                        <button
                          onClick={() => handleForward(b)}
                          disabled={forwarding === b.weekNumber}
                          className="h-9 px-4 rounded-md bg-[#003366] text-white hover:bg-[#002244] transition-colors text-sm disabled:opacity-60 inline-flex items-center gap-1.5"
                        >
                          <Send size={13} />
                          {forwarding === b.weekNumber ? "Sending…" : "Forward"}
                        </button>
                      )}

                      {isDEO && b.forwarded && (
                        b.assigned ? (
                          <span
                            className="h-9 px-3 rounded-md bg-emerald-50 text-emerald-700 inline-flex items-center gap-1.5 text-sm"
                            title={b.assignedAt ? `Assigned ${new Date(b.assignedAt).toLocaleString()}` : 'Assigned'}
                          >
                            <CheckCircle2 size={14} /> Assigned
                          </span>
                        ) : (
                          <button
                            onClick={() => setAssignBundle(b)}
                            className="h-9 px-4 rounded-md bg-[#003366] text-white hover:bg-[#002244] transition-colors text-sm"
                          >
                            {b.partiallyAssigned ? `Assign (${b.assignedCount}/${b.categories.length})` : 'Assign'}
                          </button>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

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

// ─── Local minimalist stat tile ──────────────────────────────────────────────
function StatTile({ label, value, tone = "default", hint }) {
  const tones = {
    default: "text-slate-900",
    muted:   "text-slate-400",
    red:     "text-red-600",
    amber:   "text-amber-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-3xl font-semibold mt-1 leading-none ${tones[tone] || tones.default}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-slate-400 mt-2">{hint}</div>}
    </div>
  );
}
