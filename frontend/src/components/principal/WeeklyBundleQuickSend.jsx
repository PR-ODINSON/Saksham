import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, API_BASE } from "../../services/api";
import Button from "../common/Button";
import {
  Send, Download, AlertTriangle, CheckCircle2, ChevronRight,
} from "lucide-react";

const RISK_STYLES = {
  critical: { dot: "bg-red-500",     text: "text-red-600",     label: "Critical" },
  high:     { dot: "bg-orange-500",  text: "text-orange-600",  label: "High"     },
  medium:   { dot: "bg-amber-500",   text: "text-amber-600",   label: "Medium"   },
  low:      { dot: "bg-emerald-500", text: "text-emerald-600", label: "Low"      },
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
      <div className={`bg-white border border-slate-200 rounded-2xl ${className}`}>
        <div className="px-8 py-10 text-center text-slate-400 text-base">Loading…</div>
      </div>
    );
  }

  if (!bundles.length) {
    return (
      <div className={`bg-white border border-slate-200 rounded-2xl ${className}`}>
        <div className="px-8 py-10 text-center">
          <p className="text-slate-500 text-base">No weekly reports submitted yet.</p>
          <p className="text-sm text-slate-400 mt-2">
            Have the peon submit this week's audit to enable LR scoring.
          </p>
        </div>
      </div>
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

  const risk = RISK_STYLES[target.urgencyLabel] || RISK_STYLES.low;

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-xl text-slate-900">Latest Weekly Analysis</h3>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${target.forwarded ? "bg-emerald-500" : "bg-amber-500"}`} />
          <span className="text-base text-slate-500">
            {target.forwarded ? "Synced with DEO" : "Awaiting Forward"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-8 py-8">
        {toast && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-base flex items-center gap-3 border ${
            toast.ok ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
          }`}>
            {toast.ok ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />} {toast.msg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-center">
          {/* Week */}
          <div>
            <p className="text-base text-slate-500 mb-2">Reporting Week</p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl text-slate-900 leading-none">W{target.weekNumber}</span>
              <span className="text-2xl text-slate-300 leading-none">2026</span>
            </div>
          </div>

          {/* Primary Issue */}
          <div>
            <p className="text-base text-slate-500 mb-2">Primary Issue</p>
            <p className="text-3xl text-slate-900 capitalize leading-tight">
              {target.worstCategory}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${risk.dot}`} />
              <span className={`text-base ${risk.text}`}>{risk.label} Risk</span>
            </div>
          </div>

          {/* Risk Index */}
          <div>
            <p className="text-base text-slate-500 mb-2">Risk Index</p>
            <div className="flex items-baseline gap-1">
              <span className="text-6xl text-slate-900 leading-none">{target.maxUrgency}</span>
              <span className="text-2xl text-slate-300 leading-none">/100</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleViewPdf}
            className="flex items-center justify-center gap-2 h-12 px-6 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-base"
          >
            <Download size={18} /> View PDF
          </button>

          {target.forwarded ? (
            <div className="flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-base flex-1 sm:flex-initial">
              <CheckCircle2 size={18} /> Synced
            </div>
          ) : (
            <Button
              variant="primary"
              onClick={handleSend}
              isLoading={busy}
              className="h-12 px-6 rounded-lg text-base flex-1 sm:flex-initial"
            >
              <Send size={18} className="mr-2" /> Send to DEO
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <button
        onClick={() => navigate("/principal/dashboard/reports")}
        className="w-full h-12 bg-slate-50 hover:bg-slate-100 border-t border-slate-100 flex items-center justify-center text-base text-slate-600 transition-colors gap-2"
      >
        View All Reports <ChevronRight size={16} />
      </button>
    </div>
  );
}
