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
      className={`border-none shadow-sm shadow-[#003366]/5 overflow-hidden ${className}`}
      variant="default"
    >
      {/* Featured Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100/60 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#003366]/5 text-[#003366]">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="text-[11px] font-black text-[#003366] uppercase tracking-[0.2em] leading-none mb-1">Latest Predictive Analysis</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Real-time LR-Model Verification</p>
          </div>
        </div>
        {!loading && target && (
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
            <div className={`w-2 h-2 rounded-full ${target.forwarded ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'} animate-pulse`} />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.15em] whitespace-nowrap">
              {target.forwarded ? 'Registry Synced' : 'Awaiting Forward'}
            </span>
          </div>
        )}
      </div>

      <div className="px-8 py-8">
        {toast && (
          <div className={`mb-6 p-4 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-3 shadow-sm border ${toast.ok ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-red-50 text-red-700 border-red-100"
            }`}>
            {toast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {toast.msg}
          </div>
        )}

        {/* High-Impact Info Grid */}
        <div className="flex flex-col xl:flex-row xl:items-center gap-8 xl:gap-16">

          {/* Week & Stats */}
          <div className="flex items-center gap-10 min-w-fit">
            <div className="flex flex-col relative">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 pl-1">Reporting Window</span>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-[#003366] tracking-tighter leading-none hover:scale-105 transition-transform cursor-default">W{target.weekNumber}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-300">2026</span>
                  <div className="w-8 h-1 bg-[#003366]/20 rounded-full" />
                </div>
              </div>
            </div>

            <div className="h-16 w-px bg-gradient-to-b from-transparent via-slate-100 to-transparent hidden sm:block" />

            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Badge variant="info" size="sm" className="bg-blue-50 border-blue-100 text-[#003366] font-black px-4 py-1.5 uppercase tracking-widest shadow-sm">
                  {target.categories.length} CATEGORIES
                </Badge>
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border font-black uppercase tracking-widest text-[10px] shadow-sm ${target.urgencyLabel === 'critical' ? 'bg-red-50 text-red-700 border-red-100' :
                    target.urgencyLabel === 'high' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                      'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}>
                  {target.urgencyLabel} RISK
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                  Primary Vulnerability: <span className="text-red-700 font-black">{target.worstCategory}</span>
                </p>
                {target.willFailWithin30Days && (
                  <div className="flex items-center gap-2 text-[9px] font-black text-white uppercase tracking-widest bg-red-600 px-3 py-1.5 rounded-lg shadow-lg shadow-red-500/20 animate-pulse w-fit">
                    <AlertTriangle size={12} /> CRITICAL FAILURE &lt; 30 DAYS
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="h-20 w-px bg-gradient-to-b from-transparent via-slate-100 to-transparent hidden xl:block" />

          {/* Unified Score & Actions */}
          <div className="flex-1 flex flex-col md:flex-row items-center justify-between gap-8">

            {/* Score Branding */}
            <div className="flex items-center gap-6 bg-slate-50/50 border border-slate-100/80 pr-8 pl-2 py-2 rounded-3xl group transition-all hover:bg-white hover:shadow-2xl hover:shadow-[#003366]/5 cursor-default group/score">
              <div className="relative">
                <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center group-hover/score:border-[#003366]/30 transition-all group-hover/score:-translate-y-1">
                  <span className="text-4xl font-black text-[#003366] leading-none tracking-tighter">{target.maxUrgency}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">INDEX</span>
                </div>
                <div className="absolute -inset-2 bg-[#003366] opacity-0 group-hover/score:opacity-5 blur-xl transition-all rounded-full" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1">LR Predictive Score</span>
                <div className="flex items-center gap-2">
                  <Cpu size={14} className="text-[#003366]" />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">AI-Optimized Field Data</span>
                </div>
              </div>
            </div>

            {/* Premium Action Buttons */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <button
                onClick={handleViewPdf}
                className="flex-1 md:flex-none h-14 flex items-center justify-center rounded-2xl border-2 border-slate-100 bg-white text-slate-500 hover:text-[#003366] hover:border-[#003366]/20 transition-all font-black text-[10px] uppercase tracking-[0.2em] px-8 shadow-sm hover:shadow-lg active:scale-95"
              >
                <Download size={18} className="mr-3 opacity-60" /> Report PDF
              </button>

              {target.forwarded ? (
                <div className="flex-1 md:flex-none h-14 flex items-center justify-center gap-3 px-10 rounded-2xl bg-emerald-50 border-2 border-emerald-100 text-emerald-700 font-black text-[10px] uppercase tracking-[0.2em] shadow-sm">
                  <CheckCircle2 size={20} className="animate-in zoom-in duration-300" /> Registry Synced
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSend}
                  isLoading={busy}
                  className="flex-1 md:flex-none h-14 rounded-2xl px-14 shadow-xl shadow-blue-500/20 text-[10px] font-black uppercase tracking-[0.2em] relative overflow-hidden group/btn active:scale-95 transition-all"
                >
                  <div className="relative z-10 flex items-center">
                    <Send size={18} className="mr-3 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                    Send to DEO
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
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
