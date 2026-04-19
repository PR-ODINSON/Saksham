import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, API_BASE } from "../../services/api";
import useSocket from "../../hooks/useSocket";
import AssignContractorModal from "./AssignContractorModal";
import {
  ChevronRight, RefreshCw, CheckCircle2, Clock,
} from "lucide-react";

const URGENCY = {
  critical: { color: "text-red-600",     dot: "bg-red-500",     label: "Critical" },
  high:     { color: "text-orange-600",  dot: "bg-orange-500",  label: "High"     },
  medium:   { color: "text-amber-600",   dot: "bg-amber-500",   label: "Medium"   },
  low:      { color: "text-emerald-600", dot: "bg-emerald-500", label: "Low"      },
};

/**
 * DEO-side panel that lists weekly bundles forwarded by principals,
 * sorted by LR urgency descending. Minimal layout: school name, week,
 * urgency, and the primary action (Assign / Assigned).
 */
export default function ForwardedReportsPanel({ district, className = "" }) {
  const socket = useSocket();
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

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on("report:forwarded:bundle", refresh);
    socket.on("report:forwarded",        refresh);
    socket.on("maintenance:created",     refresh);
    socket.on("task:assigned",           refresh);
    return () => {
      socket.off("report:forwarded:bundle", refresh);
      socket.off("report:forwarded",        refresh);
      socket.off("maintenance:created",     refresh);
      socket.off("task:assigned",           refresh);
    };
    // eslint-disable-next-line
  }, [socket, district]);

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg text-slate-900">School Reports</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {bundles.length} forwarded {bundles.length === 1 ? "bundle" : "bundles"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="w-9 h-9 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => navigate("/deo/dashboard/reports")}
            className="h-9 px-3 rounded-md text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
          >
            View all <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="px-6 py-12 text-center text-slate-400 text-sm">Loading…</div>
      ) : bundles.length === 0 ? (
        <div className="px-6 py-12 text-center text-slate-400 text-sm">
          No forwarded reports yet.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {bundles.slice(0, 5).map(b => {
            const u = URGENCY[b.urgencyLabel] || URGENCY.low;
            return (
              <li
                key={`${b.schoolId}-${b.weekNumber}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors"
              >
                {/* Week pill */}
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex-shrink-0">
                  <span className="text-[10px] text-slate-400 leading-none">Wk</span>
                  <span className="text-base font-semibold text-slate-900 leading-none mt-0.5">
                    {b.weekNumber}
                  </span>
                </div>

                {/* School & meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base text-slate-900 truncate">{b.schoolName}</span>
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
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {b.district || "—"} · Worst: <span className="capitalize">{b.worstCategory}</span>
                  </div>
                </div>

                {/* Score */}
                <div className="hidden sm:flex flex-col items-end pr-2">
                  <span className="text-xl font-semibold text-slate-900 leading-none">{b.maxUrgency}</span>
                  <span className="text-[10px] text-slate-400 mt-1">/100</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      window.open(`${API_BASE}/api/reports/${b.anchorRecordId}/pdf`, "_blank")
                    }
                    className="h-9 px-3 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                  >
                    PDF
                  </button>

                  {b.assigned ? (
                    <span
                      className="h-9 px-3 rounded-md bg-emerald-50 text-emerald-700 inline-flex items-center gap-1.5 text-sm"
                      title={b.assignedAt ? `Assigned ${new Date(b.assignedAt).toLocaleString()}` : "Assigned"}
                    >
                      <CheckCircle2 size={14} /> Assigned
                    </span>
                  ) : (
                    <button
                      onClick={() => setAssignBundle(b)}
                      className="h-9 px-4 rounded-md bg-[#003366] text-white hover:bg-[#002244] transition-colors text-sm"
                    >
                      {b.partiallyAssigned ? `Assign (${b.assignedCount}/${b.categories.length})` : "Assign"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}

          {bundles.length > 5 && (
            <li>
              <button
                onClick={() => navigate("/deo/dashboard/reports")}
                className="w-full text-center text-sm text-slate-600 py-3 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
              >
                View {bundles.length - 5} more <ChevronRight size={14} />
              </button>
            </li>
          )}
        </ul>
      )}

      {assignBundle && (
        <AssignContractorModal
          bundle={assignBundle}
          onClose={() => setAssignBundle(null)}
          onAssigned={load}
        />
      )}
    </div>
  );
}
