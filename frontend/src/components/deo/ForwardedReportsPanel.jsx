import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, API_BASE } from "../../services/api";
import Card from "../common/Card";
import Button from "../common/Button";
import Badge from "../common/Badge";
import { useLanguage } from "../../context/LanguageContext";
import AssignContractorModal from "./AssignContractorModal";
import {
  FileText, Download, Cpu, AlertTriangle, ChevronRight, RefreshCw, UserPlus,
} from "lucide-react";

const URGENCY = {
  critical: { color: "text-red-700",     bg: "bg-red-50",     border: "border-red-300",     dot: "bg-red-600",     label: "CRITICAL" },
  high:     { color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-300",  dot: "bg-orange-500",  label: "HIGH"     },
  medium:   { color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-300",   dot: "bg-amber-500",   label: "MEDIUM"   },
  low:      { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", label: "LOW"      },
};

/**
 * DEO-side panel that shows weekly bundles forwarded by principals,
 * sorted by LR urgency descending. Read-only — clicking a row opens the
 * bundled PDF, and the "View All" button jumps to /deo/dashboard/reports.
 */
export default function ForwardedReportsPanel({ district, className = "" }) {
  const { t } = useLanguage();
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignBundle, setAssignBundle] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ forwardedOnly: "true" });
    if (district) params.set("district", district);
    const res = await get(`/api/reports/weekly/bundles?${params.toString()}`);
    if (res.success) setBundles(res.bundles || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [district]);

  return (
    <Card
      variant="gov"
      className={className}
      title={t('fr.title')}
      subtitle={t('fr.subtitle')}
      icon={FileText}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          {bundles.length} {bundles.length === 1 ? t('fr.bundle') : t('fr.bundles')}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load} className="w-8 h-8 p-0">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/deo/dashboard/reports")}
          >
            {t('fr.view_all')} <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">{t('fr.loading')}</div>
      ) : bundles.length === 0 ? (
        <div className="py-12 text-center text-slate-400 font-medium text-sm italic bg-slate-50/50 rounded border border-dashed border-slate-200">
          {t('fr.no_reports')}
        </div>
      ) : (
        <div className="space-y-3">
          {bundles.slice(0, 5).map(b => {
            const u = URGENCY[b.urgencyLabel] || URGENCY.low;
            return (
              <div
                key={`${b.schoolId}-${b.weekNumber}`}
                className={`p-4 rounded-lg border-2 ${u.border} ${u.bg} flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded ${u.dot} text-white flex flex-col items-center justify-center font-bold`}>
                    <span className="text-[8px] uppercase opacity-70 leading-none">{t('fr.week_abbr')}</span>
                    <span className="text-xs leading-none">{b.weekNumber}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                        {b.schoolName}
                      </span>
                      <Badge variant={b.urgencyLabel === "critical" ? "critical" : b.urgencyLabel === "high" ? "high" : "default"} size="sm">
                        {u.label}
                      </Badge>
                      {b.willFailWithin30Days && (
                        <Badge variant="critical" size="sm">
                          <AlertTriangle size={10} className="mr-1" /> {t('fr.30_day_fail')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {b.district} · {t('fr.worst')}: {b.worstCategory} · {t('fr.forwarded')} {b.forwardedAt ? new Date(b.forwardedAt).toLocaleString() : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('fr.lr_urgency')}</p>
                    <div className="flex items-center gap-1 justify-end">
                      <Cpu size={11} className="text-violet-700" />
                      <span className={`text-lg font-bold ${u.color} leading-none`}>
                        {b.maxUrgency}<span className="text-[10px] opacity-50">/100</span>
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(`${API_BASE}/api/reports/${b.anchorRecordId}/pdf`, "_blank")
                    }
                  >
                    <Download size={14} className="mr-1.5" /> {t('fr.pdf')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setAssignBundle(b)}
                  >
                    <UserPlus size={14} className="mr-1.5" /> {t('fr.assign')}
                  </Button>
                </div>
              </div>
            );
          })}
          {assignBundle && (
            <AssignContractorModal
              bundle={assignBundle}
              onClose={() => setAssignBundle(null)}
              onAssigned={load}
            />
          )}

          {bundles.length > 5 && (
            <button
              onClick={() => navigate("/deo/dashboard/reports")}
              className="w-full text-center text-[11px] font-bold text-blue-700 uppercase tracking-widest py-2 hover:bg-blue-50 rounded transition-colors"
            >
              + {bundles.length - 5} {t('fr.more_bundles')}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
