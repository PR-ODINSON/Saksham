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
      variant="gov"
      className={className}
      title="Latest Weekly Bundle"
      subtitle="LR model output (trained on TS-PS3.csv)"
      icon={FileText}
    >
      {toast && (
        <div className={`mb-3 p-3 rounded text-[11px] font-bold uppercase tracking-wide flex items-center gap-2 ${
          toast.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                   : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {toast.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {toast.msg}
        </div>
      )}

      <div className="space-y-4">
        <div className="p-4 rounded-lg border-2 border-slate-200 bg-slate-50/50">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporting Period</p>
              <p className="text-base font-black text-slate-900">Week {target.weekNumber}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {target.categories.length} categories · Worst: {target.worstCategory}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LR Urgency</p>
              <p className="text-2xl font-black text-slate-900 leading-none">
                {target.maxUrgency}<span className="text-xs opacity-50">/100</span>
              </p>
              <Badge variant={URGENCY_BADGE[target.urgencyLabel] || "default"} size="sm" className="mt-1">
                {target.urgencyLabel?.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center text-[11px]">
            {target.willFailWithin30Days && (
              <Badge variant="critical" size="sm">
                <AlertTriangle size={10} className="mr-1" /> Predicted fail &lt; 30d
              </Badge>
            )}
            <span className="flex items-center gap-1.5 text-violet-700 font-bold uppercase tracking-wide">
              <Cpu size={11} /> Linear Regression model
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="outline" size="md" onClick={handleViewPdf} className="w-full">
            <Download size={14} className="mr-1.5" /> View Bundled PDF
          </Button>

          {target.forwarded ? (
            <div className="flex items-center justify-center gap-2 px-3 py-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-widest">
              <CheckCircle2 size={14} /> Sent to DEO
            </div>
          ) : (
            <Button
              variant="primary" size="md"
              onClick={handleSend}
              isLoading={busy}
              className="w-full"
            >
              <Send size={14} className="mr-1.5" /> Send to DEO
            </Button>
          )}
        </div>

        <button
          onClick={() => navigate("/principal/dashboard/reports")}
          className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-blue-700 uppercase tracking-widest pt-2 border-t border-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Activity size={12} /> View all weekly bundles
          </span>
          <ChevronRight size={14} />
        </button>
      </div>
    </Card>
  );
}
