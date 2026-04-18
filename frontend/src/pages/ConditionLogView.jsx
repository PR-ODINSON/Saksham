import { useState, useEffect } from "react";
import { get } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, FileText } from "lucide-react";

const RISK_CONFIG = {
  critical: { color: "text-red-600", bg: "bg-red-50 border-2 border-red-600", fill: "#ef4444" },
  high: { color: "text-orange-600", bg: "bg-orange-50 border-2 border-orange-600", fill: "#f97316" },
  moderate: { color: "text-amber-600", bg: "bg-amber-50 border-2 border-amber-600", fill: "#f59e0b" },
  low: { color: "text-emerald-600", bg: "bg-emerald-50 border-2 border-emerald-600", fill: "#10b981" },
};

const CONDITION_CONFIG = {
  good:     { dot: "bg-emerald-500", text: "text-emerald-700", label: "Good" },
  moderate: { dot: "bg-amber-500",   text: "text-amber-700",   label: "Moderate" },
  poor:     { dot: "bg-red-500",     text: "text-red-700",     label: "Poor" },
};

function scoreToCondition(cs) {
  if (cs <= 2) return "good";
  if (cs <= 3) return "moderate";
  return "poor";
}

function priorityToLevel(ps) {
  if (ps >= 80) return "critical";
  if (ps >= 60) return "high";
  if (ps >= 40) return "moderate";
  return "low";
}

export default function ConditionLogView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const schoolId = typeof user?.schoolId === "object" ? user?.schoolId?._id : user?.schoolId;
      if (!schoolId) { setLoading(false); return; }

      const reportsRes = await get(`/api/condition-report?schoolId=${schoolId}&limit=50`);
      if (reportsRes.success) setReports(reportsRes.records || []);
      setLoading(false);
    };
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 font-body">
         <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0f172a] rounded-full animate-spin" />
         <p className="text-slate-400 font-black tracking-[0.2em] text-[10px] uppercase animate-pulse">Loading Reports...</p>
      </div>
    );
  }

  const isPrincipal = user?.role === 'principal' || user?.role === 'school';

  if (!user?.schoolId || !isPrincipal) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white border-2 border-slate-200 rounded-[2rem] max-w-xl mx-auto mt-12 font-body">
        <p className="text-xl text-[#0f172a] font-black">Access Denied.</p>
        <p className="text-sm mt-2">Only Principal accounts can view reports for their school.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto font-body text-[#0f172a]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center shadow-[2px_2px_0_#bfdbfe]">
          <FileText size={24} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-[#0f172a] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Condition Log
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">All reports submitted by staff</p>
        </div>
      </div>

      <div className="bg-white border-2 border-[#0f172a] rounded-[2rem] p-8 shadow-[6px_6px_0_#0f172a]">
        {reports.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
            <p className="text-slate-400 font-bold mb-4">No inspection records found for this location.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {reports.map((r) => {
              const condition = scoreToCondition(r.conditionScore);
              const recLevel  = priorityToLevel(r.priorityScore || 0);
              const cc  = CONDITION_CONFIG[condition];
              const rc  = RISK_CONFIG[recLevel];
              return (
                <div key={r._id} className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 hover:border-[#0f172a] hover:shadow-[4px_4px_0_#0f172a] transition-all group">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white border-2 border-slate-200 group-hover:border-[#0f172a] flex items-center justify-center font-black text-slate-400 group-hover:text-[#0f172a] transition-colors shadow-sm">
                        W{r.weekNumber}
                      </div>
                      <div>
                        <span className="text-[#0f172a] text-lg font-black uppercase tracking-tight block">
                          {r.category}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`w-2 h-2 rounded-full ${cc.dot}`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${cc.text}`}>
                            {cc.label} ({r.conditionScore}/5)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {r.issueFlag   && <span className="text-[9px] font-black uppercase tracking-widest bg-red-50 border-2 border-red-200 text-red-600 rounded-lg px-2.5 py-1">Flagged</span>}
                      {r.waterLeak   && <span className="text-[9px] font-black uppercase tracking-widest bg-blue-50 border-2 border-blue-200 text-blue-600 rounded-lg px-2.5 py-1">Water leak</span>}
                      {r.wiringExposed && <span className="text-[9px] font-black uppercase tracking-widest bg-yellow-50 border-2 border-yellow-200 text-yellow-600 rounded-lg px-2.5 py-1">Exposed Wiring</span>}
                      {r.roofLeakFlag  && <span className="text-[9px] font-black uppercase tracking-widest bg-orange-50 border-2 border-orange-200 text-orange-600 rounded-lg px-2.5 py-1">Roof leak</span>}
                      {r.willFailWithin30Days && <span className="text-[9px] font-black uppercase tracking-widest bg-red-100 border-2 border-red-500 text-red-700 shadow-[2px_2px_0_#ef4444] rounded-lg px-2.5 py-1 flex items-center gap-1"><AlertTriangle size={10} strokeWidth={3} /> FAIL &lt;30d</span>}
                      
                      <div className="w-px h-6 bg-slate-300 mx-2 hidden md:block" />
                      
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-2 ${rc.bg} ${rc.color}`}>
                        Priority {Math.round(r.priorityScore || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
