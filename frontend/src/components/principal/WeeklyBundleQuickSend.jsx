import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, API_BASE } from "../../services/api";
import Card from "../common/Card";
import Button from "../common/Button";
import Badge from "../common/Badge";
import {
  Send, Download, FileText, AlertTriangle, CheckCircle2, Cpu, Activity, ChevronRight,
} from "lucide-react";

const URGENCY_BADGE = {
  critical: "critical",
  high:     "high",
  medium:   "warning",
  low:      "success",
};

/**
 * Principal-dashboard widget: shows the most recent weekly bundle, the LR
 * urgency derived from the model trained on TS-PS3.csv and a one-click
 * "Send to DEO" button. Falls back to the reports list if no bundles exist.
 */
export default function WeeklyBundleQuickSend({ schoolId, className = "" }) {
  const [bundles, setBundles]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState(false);
  const [toast, setToast]         = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const res = await get(`/api/reports/weekly/bundles?schoolId=${schoolId}`);
    if (res.success) setBundles(res.bundles || []);
    setLoading(false);
  };

  useEffect(() => { if (schoolId) load(); /* eslint-disable-next-line */ }, [schoolId]);

  if (loading) {
    return (
      <Card variant="gov" className={className} title="Latest Weekly Report" icon={FileText}>
        <div className="py-8 text-center text-slate-400 text-sm">Loading…</div>
      </Card>
    );
  }

  if (!bundles.length) {
    return (
      <Card variant="gov" className={className} title="Latest Weekly Report" icon={FileText}>
        <div className="py-8 text-center">
          <p className="text-slate-400 font-medium text-sm">No weekly reports submitted yet.</p>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-2">
            Have the peon submit this week's audit to enable LR scoring.
          </p>
        </div>
      </Card>
    );
  }

  // Most urgent pending bundle wins the card; otherwise fall back to latest week.
  const pending = bundles.filter(b => !b.forwarded);
  const target  = (pending.length ? pending : bundles)
    .slice()
    .sort((a, b) => {
      if (b.maxUrgency !== a.maxUrgency) return b.maxUrgency - a.maxUrgency;
      return b.weekNumber - a.weekNumber;
    })[0];

  const handleSend = async () => {
    setBusy(true);
    const res = await post(
      `/api/reports/weekly/${target.schoolId}/${target.weekNumber}/forward`, {}
    );
    setBusy(false);
    if (res.success) {
      setToast({ ok: true, msg: `Bundle for Week ${target.weekNumber} sent to DEO.` });
      load();
      setTimeout(() => setToast(null), 4000);
    } else {
      setToast({ ok: false, msg: res.message || "Forward failed." });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleViewPdf = () => {
    window.open(`${API_BASE}/api/reports/${target.anchorRecordId}/pdf`, "_blank");
  };

  return (
    <Card
      className={`border-none shadow-sm shadow-[#003366]/5 overflow-hidden ${className}`}
      variant="default"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-[#003366] rounded-lg">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#003366] leading-none mb-1">Latest Weekly Bundle</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Model: LR Prediction Node</p>
          </div>
        </div>
        {!loading && target && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${target.forwarded ? 'bg-emerald-500' : 'bg-orange-500'} animate-pulse`} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {target.forwarded ? 'Status: Processed' : 'Status: Pending Action'}
            </span>
          </div>
        )}
      </div>

      <div className="p-6">
        {toast && (
          <div className={`mb-4 p-3 rounded-xl text-[11px] font-bold uppercase tracking-wide flex items-center gap-2 ${
            toast.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                     : "bg-red-50 text-red-700 border border-red-100"
          }`}>
            {toast.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {toast.msg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Main Reporting Info */}
          <div className="md:col-span-8 flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="shrink-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 opacity-70">Reporting Period</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-[#003366] tracking-tighter">Week {target.weekNumber}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date().getFullYear()}</span>
              </div>
            </div>

            <div className="h-10 w-px bg-slate-100 hidden sm:block" />

            <div className="flex-1 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-70">Infrastructure Analysis</p>
              <div className="flex flex-wrap gap-2">
                <div className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-700 flex items-center gap-1.5 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {target.categories.length} Categories Bundled
                </div>
                <div className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-700 flex items-center gap-1.5 shadow-sm">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                   Worst Dept: {target.worstCategory}
                </div>
              </div>
              {target.willFailWithin30Days && (
                <p className="text-[10px] font-bold text-red-600 flex items-center gap-1.5 animate-pulse bg-red-50 w-fit px-2 py-0.5 rounded uppercase tracking-wider">
                  <AlertTriangle size={12} /> Priority Alert: Failure Predicted Within 30 Days
                </p>
              )}
            </div>
          </div>

          {/* LR Urgency Score */}
          <div className="md:col-span-4 bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-70">LR Priority Score</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#003366] leading-none">{target.maxUrgency}</span>
                <span className="text-xs font-bold text-slate-400">/100</span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Student Impact Ranking</p>
            </div>
            <Badge variant={URGENCY_BADGE[target.urgencyLabel] || "default"} size="sm" className="h-8 shadow-sm">
              {target.urgencyLabel?.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Actions Row */}
        <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
              <Cpu size={12} />
            </span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Verified by Predictive Engine TS-PS3.csv
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleViewPdf} className="flex-1 sm:flex-none h-11 border-slate-200 hover:bg-slate-50 rounded-xl px-6">
              <Download size={16} className="mr-2" /> View PDF
            </Button>

            {target.forwarded ? (
              <div className="flex-1 sm:flex-none h-11 flex items-center justify-center gap-2 px-6 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-widest shadow-sm">
                <CheckCircle2 size={16} /> Processed
              </div>
            ) : (
              <Button
                variant="primary" size="sm"
                onClick={handleSend}
                isLoading={busy}
                className="flex-1 sm:flex-none h-11 rounded-xl px-8 shadow-lg shadow-blue-500/10"
              >
                <Send size={16} className="mr-2" /> Forward to DEO
              </Button>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate("/principal/dashboard/reports")}
        className="w-full h-12 bg-slate-50/50 hover:bg-slate-100/80 border-t border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 hover:text-[#003366] uppercase tracking-widest transition-all gap-2"
      >
        <Activity size={14} /> Access Historical Bundle Registry <ChevronRight size={14} />
      </button>
    </Card>

  );
}
