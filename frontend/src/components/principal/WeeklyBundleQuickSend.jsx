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
  high: "high",
  medium: "warning",
  low: "success",
};

/**
 * Principal-dashboard widget: shows the most recent weekly bundle, the LR
 * urgency derived from the model trained on TS-PS3.csv and a one-click
 * "Send to DEO" button. Falls back to the reports list if no bundles exist.
 */
export default function WeeklyBundleQuickSend({ schoolId, className = "" }) {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
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
  const target = (pending.length ? pending : bundles)
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
      className={`border border-slate-200 shadow-none ${className}`}
      variant="default"
    >
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Latest Weekly Analysis</h3>
          <p className="text-sm text-slate-500">ML-driven report verification</p>
        </div>
        {!loading && target && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${target.forwarded ? 'bg-emerald-500' : 'bg-orange-500'}`} />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {target.forwarded ? 'Synced with DEO' : 'Awaiting Forward'}
            </span>
          </div>
        )}
      </div>

      <div className="p-8">
        {toast && (
          <div className={`mb-6 p-4 rounded-lg text-sm font-medium flex items-center gap-3 border ${
            toast.ok ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
          }`}>
            {toast.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />} {toast.msg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Time Window */}
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reporting Window</span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900">W{target.weekNumber}</span>
              <span className="text-lg font-bold text-slate-300">2026</span>
            </div>
          </div>

          {/* Column 2: Risk Details */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info" className="px-3 py-1 text-xs font-bold">
                {target.categories.length} CATEGORIES
              </Badge>
              <Badge 
                variant={target.urgencyLabel === 'critical' ? 'critical' : target.urgencyLabel === 'high' ? 'high' : 'info'}
                className="px-3 py-1 text-xs font-bold"
              >
                {target.urgencyLabel.toUpperCase()} RISK
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-slate-500">Primary Issue:</span>
                <span className="font-bold text-slate-900 capitalize">{target.worstCategory}</span>
              </div>
              {target.willFailWithin30Days && (
                <div className="flex items-center gap-2 text-[11px] font-bold text-red-600 uppercase tracking-wider bg-red-50 px-2 py-1 rounded w-fit">
                  <AlertTriangle size={14} /> Critical Failure &lt; 30 Days
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Scores & Actions */}
          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-center gap-4">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 w-full sm:w-auto">
              <div className="text-3xl font-black text-slate-900">{target.maxUrgency}</div>
              <div className="leading-tight">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Index</div>
                <div className="text-xs font-bold text-slate-700">AI Verified</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={handleViewPdf}
                className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all font-bold text-xs uppercase tracking-wider"
              >
                <Download size={16} /> PDF
              </button>

              {target.forwarded ? (
                <div className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider border border-emerald-100">
                  <CheckCircle2 size={16} /> Synced
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSend}
                  isLoading={busy}
                  className="h-10 rounded-lg text-xs font-bold uppercase tracking-wider w-full"
                >
                  <Send size={16} className="mr-2" /> Send to DEO
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        onClick={() => navigate("/principal/dashboard/reports")}
        className="w-full h-11 bg-slate-50 hover:bg-slate-100 border-t border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 transition-all gap-2 cursor-pointer"
      >
        Access Historical Registry <ChevronRight size={14} />
      </div>
    </Card>


  );
}
