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
      {/* Tight Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-[#003366] opacity-70" />
          <h3 className="text-xs font-bold text-[#003366] uppercase tracking-[0.15em]">Latest Weekly Bundle</h3>
        </div>
        {!loading && target && (
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
            <div className={`w-2 h-2 rounded-full ${target.forwarded ? 'bg-emerald-500' : 'bg-orange-500'} animate-pulse`} />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">
              {target.forwarded ? 'Processed' : 'Action Required'}
            </span>
          </div>
        )}
      </div>

      <div className="px-6 py-5">
        {toast && (
          <div className={`mb-4 p-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-2 ${
            toast.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                     : "bg-red-50 text-red-700 border border-red-100"
          }`}>
            {toast.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {toast.msg}
          </div>
        )}

        {/* High-Impact Info Grid */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
          
          {/* Week & Stats */}
          <div className="flex items-center gap-8 min-w-fit">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Reporting Period</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-bold text-[#003366] tracking-tighter">W{target.weekNumber}</span>
                <span className="text-base font-semibold text-slate-300">2026</span>
              </div>
            </div>

            <div className="h-14 w-px bg-slate-100 hidden sm:block" />

            <div className="flex flex-col gap-2">
              <div className="flex gap-2.5">
                <Badge variant="info" size="sm" className="bg-blue-50 border-blue-100 text-[#003366] font-bold px-3 py-1 uppercase tracking-wider">
                  {target.categories.length} CATEGORIES
                </Badge>
                <Badge variant={URGENCY_BADGE[target.urgencyLabel] || "default"} size="sm" className="px-3 py-1 uppercase tracking-wider font-bold shadow-sm">
                  {target.urgencyLabel} RISK
                </Badge>
              </div>
              <p className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Worst: <span className="text-red-700 uppercase font-bold">{target.worstCategory}</span>
              </p>
              {target.willFailWithin30Days && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 uppercase tracking-tight bg-red-50 px-3 py-1 rounded border border-red-100 animate-pulse w-fit">
                  <AlertTriangle size={14} /> FAILURE PREDICTED &lt; 30d
                </div>
              )}
            </div>
          </div>

          <div className="h-14 w-px bg-slate-100 hidden lg:block" />

          {/* Unified Score & Actions */}
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-6">
            
            {/* Score Branding */}
            <div className="flex items-center gap-5 bg-slate-50 border border-slate-100 pr-6 pl-1.5 py-1.5 rounded-2xl group transition-all hover:bg-white hover:shadow-xl hover:shadow-[#003366]/5">
              <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                 <span className="text-3xl font-bold text-[#003366] leading-none">{target.maxUrgency}</span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">INDEX</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LR Urgency Score</span>
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-tighter">Student Impact Verified</span>
              </div>
            </div>

            {/* Tight Action Buttons */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleViewPdf} className="flex-1 sm:flex-none h-12 border-slate-200 hover:bg-slate-50 rounded-xl px-5 text-xs font-bold uppercase tracking-widest transition-all">
                <Download size={16} className="mr-2 opacity-70" /> PDF
              </Button>

              {target.forwarded ? (
                <div className="flex-1 sm:flex-none h-12 flex items-center justify-center gap-2 px-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-widest shadow-sm">
                  <CheckCircle2 size={18} /> FORWARDED
                </div>
              ) : (
                <Button
                  variant="primary" size="sm"
                  onClick={handleSend}
                  isLoading={busy}
                  className="flex-1 sm:flex-none h-12 rounded-xl px-12 shadow-lg shadow-blue-500/10 text-xs font-bold uppercase tracking-widest"
                >
                  <Send size={18} className="mr-2" /> SEND TO DEO
                </Button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Ultra-Minimal Footer */}
      <div 
        onClick={() => navigate("/principal/dashboard/reports")}
        className="group cursor-pointer w-full h-10 bg-slate-50/50 hover:bg-[#003366]/5 border-t border-slate-50 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-[#003366] uppercase tracking-[0.2em] transition-all gap-3"
      >
        <Activity size={12} className="group-hover:animate-bounce" /> ACCESS HISTORICAL REGISTRY <ChevronRight size={12} />
      </div>
    </Card>


  );
}
