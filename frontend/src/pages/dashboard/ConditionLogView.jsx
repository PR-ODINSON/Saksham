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
  critical: { color: "text-red-700", bg: "bg-red-50", border: "border-red-300", dot: "bg-red-600", label: "CRITICAL" },
  high: { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-300", dot: "bg-orange-500", label: "HIGH" },
  medium: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300", dot: "bg-amber-500", label: "MEDIUM" },
  low: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", label: "LOW" },
};

const CATEGORY_META = {
  plumbing: { icon: Wrench, color: "text-blue-700", bg: "bg-blue-50" },
  electrical: { icon: Zap, color: "text-amber-700", bg: "bg-amber-50" },
  structural: { icon: Building, color: "text-slate-700", bg: "bg-slate-50" },
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
      <div className="max-w-7xl mx-auto pt-10 sm:pt-16 pb-12 px-4 sm:px-8 space-y-8">
        <PageHeader
          title={isDEO ? t('clv.deo_title') : t('clv.prin_title')}
          subtitle={isDEO ? t('clv.deo_subtitle') : t('clv.prin_subtitle')}
          icon={FileText}
        />

        {toast && (
          <div className={`p-4 rounded-md border font-bold text-xs uppercase tracking-wide flex items-center gap-3 ${toast.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
            }`}>
            {toast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {toast.msg}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <MetricCard label={t('clv.total_bundles')} value={bundles.length} icon={FileText} variant="info" />
          <MetricCard label={t('clv.critical_urgency')} value={criticalCount} icon={ShieldAlert} variant={criticalCount > 0 ? "critical" : "success"} />
          <MetricCard label={t('clv.predicted_fail')} value={fail30Count} icon={Activity} variant={fail30Count > 0 ? "high" : "success"} />
          <MetricCard label={t('clv.sent_to_deo_stat')} value={sentCount} icon={Send} variant="info" trendValue={`${pendingCount} ${t('clv.pending')}`} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-6 items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
              <Filter size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] leading-none mb-1">{t('clv.refine_view')}</p>
              <p className="text-sm font-bold text-slate-700 leading-none">Search Filters</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 flex-1">
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Urgency Level</label>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="h-10 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition-all cursor-pointer"
              >
                <option value="all">{t('clv.any_urgency')}</option>
                <option value="critical">{URGENCY_CONFIG.critical.label}</option>
                <option value="high">{URGENCY_CONFIG.high.label}</option>
                <option value="medium">{URGENCY_CONFIG.medium.label}</option>
                <option value="low">{URGENCY_CONFIG.low.label}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Bundle Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition-all cursor-pointer"
              >
                <option value="all">{t('clv.all_bundles')}</option>
                <option value="pending">{t('clv.awaiting_deo')}</option>
                <option value="sent">{t('clv.sent_filter')}</option>
              </select>
            </div>
          </div>

          <div className="ml-auto text-right">
            <p className="text-2xl font-bold text-[#003366] leading-none">{sorted.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Matched Bundles</p>
          </div>
        </div>

        {/* Bundle list - Tabular Format */}
        <Card variant="default" title={t('clv.lr_reports')} subtitle={t('clv.one_card')} noPadding className="border-none shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-[0.25em]">{t('clv.week')}</th>
{isDEO && <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-[0.25em]">School / District</th>}
<th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-[0.25em]">Urgency Index</th>
<th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-[0.25em]">Breakdown</th>
<th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-[0.25em]">Status</th>
<th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-[0.25em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={isDEO ? 6 : 5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                      {bundles.length === 0 ? t('clv.no_reports') : t('clv.no_match')}
                    </td>
                  </tr>
                ) : (
                  sorted.map(b => {
                    const u = URGENCY_CONFIG[b.urgencyLabel] || URGENCY_CONFIG.low;
                    const submittedAt = b.categories[0]?.createdAt ? new Date(b.categories[0].createdAt) : null;
                    return (
                      <tr key={`${b.schoolId}-${b.weekNumber}`} className="group hover:bg-blue-50/30 transition-all duration-200 cursor-default">
                        <td className="px-6 py-6 transition-all group-hover:pl-8">
                          <div className="flex flex-col">
                            <span className="text-2xl font-black text-[#003366] tracking-tighter leading-none mb-1 group-hover:scale-110 transition-transform origin-left">W{b.weekNumber}</span>
                            <div className="flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">2026 CYCLE</span>
                            </div>
                          </div>
                        </td>
                        {isDEO && (
                          <td className="px-6 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800 leading-tight mb-1 group-hover:text-[#003366] transition-colors">{b.schoolName}</span>
                              <div className="flex items-center gap-1.5 opacity-60">
                                <Building size={11} className="text-slate-500" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{b.district || "District Office"}</span>
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-6 text-center">
                          <div className="flex items-center gap-5">
                            <div className="relative group/score">
                              <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 ${u.border} ${u.bg} shadow-sm group-hover:shadow-lg transition-all duration-300 group-hover:-translate-y-0.5`}>
                                <span className={`text-2xl font-black ${u.color} leading-none`}>{b.maxUrgency}</span>
                                <span className={`text-[10px] font-black uppercase tracking-tighter opacity-50 ${u.color}`}>INDEX</span>
                              </div>
                              <div className={`absolute -inset-1 rounded-2xl ${u.bg} opacity-0 group-hover:opacity-20 blur-md transition-opacity`} />
                            </div>
                            <div className="flex flex-col pt-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-xs font-black uppercase tracking-[0.15em] ${u.color}`}>{u.label}</span>
                              </div>
                              {b.willFailWithin30Days && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-50 border border-red-100 text-[9px] font-black text-red-600 uppercase tracking-widest animate-bounce w-fit">
                                  30-DAY RISK
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-1.5">
                              {b.categories.map(cat => {
                                const meta = CATEGORY_META[cat.category] || CATEGORY_META.plumbing;
                                return (
                                  <div key={cat._id} title={cat.category} className={`px-2.5 py-1 rounded-md ${meta.bg} ${meta.color} text-[10px] font-black uppercase tracking-wider border border-current/20 shadow-sm hover:scale-105 transition-all`}>
                                    {cat.category}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">
                                <span className="text-[#003366]">{b.worstCategory}</span> bottleneck detected
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          {b.forwarded ? (
                            <div className="flex items-center gap-3 bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-2.5 w-fit group-hover:bg-emerald-50 transition-colors">
                              <div className="flex flex-col">
                                <span className="text-[12px] font-black uppercase tracking-[0.2em] text-emerald-800 leading-none mb-1.5">Forwarded</span>
                                <span className="text-[10px] font-bold text-emerald-600 opacity-70 flex items-center gap-1">
                                  {new Date(b.forwardedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-200/60 rounded-xl px-4 py-2.5 w-fit group-hover:bg-amber-50 group-hover:border-amber-100 transition-all">
                              <div className="flex flex-col items-start text-left">
                                <span className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-amber-700 leading-none mb-1.5">Awaiting</span>
                                <span className="text-[10px] font-bold text-slate-400 group-hover:text-amber-600/70 transition-colors">PRINCIPAL SIGN-OFF</span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleView(b)}
                              className="h-10 px-4 flex items-center justify-center rounded-xl bg-white text-slate-500 hover:text-[#003366] hover:bg-[#003366]/5 transition-all border border-slate-200 hover:border-[#003366]/30 shadow-sm hover:shadow-md text-[11px] font-black uppercase tracking-widest"
                              title={t('clv.view_pdf')}
                            >
                              PDF
                            </button>

                            {isPrincipal && !b.forwarded && (
                              <button
                                onClick={() => handleForward(b)}
                                className="h-10 px-6 rounded-xl bg-[#003366] text-white hover:bg-[#002244] transition-all shadow-lg shadow-blue-900/10 border border-[#003366] flex items-center gap-2 group/btn"
                                title={t('clv.send_to_deo')}
                              >
                                {forwarding === b.weekNumber ? (
                                  <span className="text-[10px] font-bold uppercase animate-pulse">Processing...</span>
                                ) : (
                                  <span className="text-[11px] font-bold uppercase tracking-widest">Forward</span>
                                )}
                              </button>
                            )}

                            {isDEO && b.forwarded && (
                              b.assigned ? (
                                <div
                                  className="h-10 px-5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2"
                                  title={b.assignedAt ? `Assigned ${new Date(b.assignedAt).toLocaleString()}` : 'Assigned'}
                                >
                                  <CheckCircle2 size={14} />
                                  <span className="text-[11px] font-bold uppercase tracking-widest">Assigned</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAssignBundle(b)}
                                  className="h-10 px-6 rounded-xl bg-[#003366] text-white hover:bg-[#002244] transition-all shadow-lg shadow-blue-900/10 border border-[#003366] flex items-center gap-2 group/btn"
                                >
                                  <span className="text-[11px] font-bold uppercase tracking-widest">
                                    {b.partiallyAssigned ? `Assign (${b.assignedCount}/${b.categories.length})` : 'Assign'}
                                  </span>
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
