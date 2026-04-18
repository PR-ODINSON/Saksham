import { useState, useEffect } from "react";
import { get } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FileText, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Building, MapPin, Users, Calendar, CheckCircle2, Clock } from "lucide-react";

const RISK_CONFIG = {
  critical: { color: "text-red-600", bg: "bg-red-50 border-2 border-red-600 shadow-[4px_4px_0_#ef4444]", label: "CRITICAL", fill: "#ef4444" },
  high: { color: "text-orange-600", bg: "bg-orange-50 border-2 border-orange-600 shadow-[4px_4px_0_#f97316]", label: "HIGH", fill: "#f97316" },
  moderate: { color: "text-amber-600", bg: "bg-amber-50 border-2 border-amber-600 shadow-[4px_4px_0_#f59e0b]", label: "MODERATE", fill: "#f59e0b" },
  low: { color: "text-emerald-600", bg: "bg-emerald-50 border-2 border-emerald-600 shadow-[4px_4px_0_#10b981]", label: "LOW", fill: "#10b981" },
};

function priorityToLevel(ps) {
  if (ps >= 80) return "critical";
  if (ps >= 60) return "high";
  if (ps >= 40) return "moderate";
  return "low";
}

function getISOWeek() {
  const now  = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
}

function buildAnalysis(predictions) {
  if (!predictions || predictions.length === 0) return null;

  const scoreOf  = (p) => p.riskScore ?? p.storedPriorityScore ?? 0;
  const dtfOf    = (p) => p.estimated_days_to_failure ?? p.storedDaysToFailure ?? null;
  const fail30Of = (p) => p.within_30_days ?? p.storedWithin30Days ?? false;
  const fail60Of = (p) => p.within_60_days ?? p.storedWithin60Days ?? false;

  const overallScore = Math.round(Math.max(...predictions.map(scoreOf)));
  const level        = priorityToLevel(overallScore);
  const worst        = predictions.reduce((a, b) => (scoreOf(b) > scoreOf(a) ? b : a));

  const dtfValues = predictions
    .map(dtfOf)
    .filter(d => d != null && !isNaN(d) && d > 0);
  const timeToFailureDays = dtfValues.length ? Math.round(Math.min(...dtfValues)) : null;

  const hasFail30 = predictions.some(fail30Of);
  const hasFail60 = predictions.some(fail60Of);
  const trend = hasFail30 ? "deteriorating" : overallScore >= 60 ? "deteriorating" : "stable";

  const breakdown = {};
  for (const p of predictions) {
    const ps = Math.round(scoreOf(p));
    breakdown[p.category] = {
      score:               ps,
      level:               priorityToLevel(ps),
      conditionScore:      p.storedConditionScore ?? p.conditionScore,
      willFailWithin30Days: fail30Of(p),
      deteriorationRate:   p.deterioration_rate,
      evidence:            p.evidence,
    };
  }

  let explanation = `Overall risk score: ${overallScore}/100. `;
  if (hasFail30) explanation += "⚠ Failure predicted within 30 days. ";
  else if (hasFail60) explanation += "Failure predicted within 60 days. ";
  explanation += `Worst category: ${worst.category}.`;

  return {
    score: overallScore,
    level,
    trend,
    worstCategory: worst.category,
    timeToFailureDays,
    reportCount: predictions.length,
    explanation,
    breakdown,
  };
}

export default function SchoolView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [reports, setReports] = useState([]);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const schoolId = typeof user?.schoolId === "object" ? user?.schoolId?._id : user?.schoolId;
      if (!schoolId) { setLoading(false); return; }

      const [riskRes, reportsRes, schoolRes] = await Promise.all([
        get(`/api/risk/${schoolId}`),
        get(`/api/condition-report?schoolId=${schoolId}&limit=50`),
        get(`/api/schools/${schoolId}`),
      ]);

      if (riskRes.success) setAnalysis(buildAnalysis(riskRes.predictions));
      if (reportsRes.success) setReports(reportsRes.records || []);
      if (schoolRes.success) setSchool(schoolRes.school);
      setLoading(false);
    };
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 font-body">
         <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0f172a] rounded-full animate-spin" />
         <p className="text-slate-400 font-black tracking-[0.2em] text-[10px] uppercase animate-pulse">Analysing Profile...</p>
      </div>
    );
  }

  const isPrincipal = user?.role === 'principal' || user?.role === 'school';

  if (!user?.schoolId || !isPrincipal) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white border-2 border-slate-200 rounded-[2rem] max-w-xl mx-auto mt-12 font-body">
        <p className="text-xl text-[#0f172a] font-black">Access Denied.</p>
        <p className="text-sm mt-2">Only Principal accounts can access this dashboard view.</p>
      </div>
    );
  }

  // Calculate Report Metrics
  const currentWeek = getISOWeek();
  const currentMonth = new Date().getMonth();
  
  // Calculate completed
  const uniqueCompletedWeeks = new Set(reports.map(r => r.weekNumber)).size;
  const completedThisMonth = new Set(reports.filter(r => new Date(r.createdAt).getMonth() === currentMonth).map(r => r.weekNumber)).size;
  
  // Assuming 1 report per week expected
  const expectedWeeksSoFar = currentWeek; 
  const totalPending = Math.max(0, expectedWeeksSoFar - uniqueCompletedWeeks);
  const pendingThisMonth = Math.max(0, 4 - completedThisMonth); // roughly 4 weeks in a month

  const latestReport = reports.length > 0 ? reports[0] : null;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto font-body text-[#0f172a]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border-2 border-[#0f172a] flex items-center justify-center shadow-[2px_2px_0_#0f172a]">
              <Building size={20} className="text-[#0f172a]" />
            </div>
            <h1 className="text-4xl font-black text-[#0f172a] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Principal Dashboard
            </h1>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border-2 border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
              <Building size={12} strokeWidth={3} /> {school?.name || "Unknown"}
            </span>
            <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border-2 border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
              <MapPin size={12} strokeWidth={3} /> {school?.district || "Unknown District"}
            </span>
            <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border-2 border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
              <Calendar size={12} strokeWidth={3} /> {school?.buildingAge ?? "?"} YRS OLD
            </span>
            <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border-2 border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
              <Users size={12} strokeWidth={3} /> {school?.numStudents ?? "?"} STUDENTS
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate("/dashboard/reports")}
          className="px-6 py-3.5 rounded-2xl bg-[#0f172a] hover:bg-blue-600 text-white text-sm font-black flex items-center justify-center gap-2 border-2 border-[#0f172a] shadow-[4px_4px_0_#2563eb] transition-all active:translate-y-1 active:translate-x-1 active:shadow-none whitespace-nowrap"
        >
          <FileText size={18} />
          View Reports
        </button>
      </div>

      {/* REPORT METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Reports */}
        <div className="bg-amber-50 border-2 border-amber-500 rounded-[2rem] p-6 shadow-[6px_6px_0_#f59e0b] hover:-translate-y-1 transition-all flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-amber-600" size={20} strokeWidth={3} />
            <h3 className="text-xs font-black tracking-widest uppercase text-amber-700">Total Pending</h3>
          </div>
          <div>
             <div className="text-5xl font-black text-amber-600 mb-2">{totalPending}</div>
             <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700/70">
               {pendingThisMonth} pending this month
             </p>
          </div>
        </div>

        {/* Completed Reports */}
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-[2rem] p-6 shadow-[6px_6px_0_#10b981] hover:-translate-y-1 transition-all flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="text-emerald-600" size={20} strokeWidth={3} />
            <h3 className="text-xs font-black tracking-widest uppercase text-emerald-700">Reports Completed</h3>
          </div>
          <div>
             <div className="text-5xl font-black text-emerald-600 mb-2">{uniqueCompletedWeeks}</div>
             <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/70">
               {completedThisMonth} completed this month
             </p>
          </div>
        </div>

        {/* Latest Report */}
        <div className="bg-white border-2 border-[#0f172a] rounded-[2rem] p-6 shadow-[6px_6px_0_#0f172a] hover:-translate-y-1 transition-all flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="text-[#0f172a]" size={20} strokeWidth={3} />
            <h3 className="text-xs font-black tracking-widest uppercase text-slate-500">Latest Report</h3>
          </div>
          {latestReport ? (
            <div>
              <div className="text-xl font-black text-[#0f172a] uppercase">{latestReport.category}</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
                Submitted Week {latestReport.weekNumber}
              </p>
              <div className="mt-3 text-[10px] font-bold bg-slate-50 px-3 py-2 rounded-xl border-2 border-slate-200 line-clamp-2">
                {latestReport.notes || "No additional notes provided."}
              </div>
            </div>
          ) : (
            <p className="text-sm font-bold text-slate-400">No reports submitted yet.</p>
          )}
        </div>
      </div>

      {/* Prediction Engine Summary */}
      <div className="bg-white border-2 border-[#0f172a] rounded-[2rem] p-8 shadow-[6px_6px_0_#0f172a] flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-6">
          <ActivityIcon className="text-blue-600" />
          <h3 className="text-sm font-black tracking-widest uppercase text-slate-500">Prediction Engine Summary</h3>
        </div>

        {analysis ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200 hover:border-[#0f172a] transition-colors">
                <p className="text-[9px] font-black tracking-widest uppercase text-slate-400 mb-2">Time to Failure</p>
                <p className={`text-2xl font-black ${analysis.timeToFailureDays <= 15 ? "text-red-600" : analysis.timeToFailureDays <= 30 ? "text-orange-600" : "text-[#0f172a]"}`}>
                  {analysis.timeToFailureDays || "N/A"} <span className="text-xs opacity-50">DAYS</span>
                </p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200 hover:border-[#0f172a] transition-colors">
                <p className="text-[9px] font-black tracking-widest uppercase text-slate-400 mb-2">Trend Analysis</p>
                <p className={`text-lg font-black flex items-center gap-1.5 ${analysis.trend === "deteriorating" ? "text-red-600" : analysis.trend === "improving" ? "text-emerald-600" : "text-slate-600"}`}>
                  {analysis.trend === "deteriorating" ? <TrendingDown size={18} strokeWidth={3} /> : analysis.trend === "improving" ? <TrendingUp size={18} strokeWidth={3} /> : <ArrowRight size={18} strokeWidth={3} />}
                  {analysis.trend.toUpperCase()}
                </p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200 hover:border-[#0f172a] transition-colors">
                <p className="text-[9px] font-black tracking-widest uppercase text-slate-400 mb-2">Worst Category</p>
                <p className="text-lg font-black text-[#0f172a] uppercase">{analysis.worstCategory || "NONE"}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200 hover:border-[#0f172a] transition-colors">
                <p className="text-[9px] font-black tracking-widest uppercase text-slate-400 mb-2">Reports Analysed</p>
                <p className="text-2xl font-black text-[#0f172a]">{analysis.reportCount || 0}</p>
              </div>
            </div>
            <div className="mt-6 flex items-start gap-3 bg-blue-50/50 p-4 rounded-xl border-2 border-blue-100 text-sm font-bold text-slate-600 leading-relaxed">
                <AlertTriangle size={18} className="text-blue-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                {analysis.explanation}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-8 opacity-50">
            <FileText size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-bold text-sm">No analysis available. Waiting for reports.</p>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      {analysis?.breakdown && Object.keys(analysis.breakdown).length > 0 && (
        <div className="bg-white border-2 border-[#0f172a] rounded-[2rem] p-8 shadow-[6px_6px_0_#0f172a]">
          <h3 className="text-sm font-black tracking-widest uppercase text-slate-500 mb-6">Component Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {Object.entries(analysis.breakdown).map(([cat, data]) => {
              const catLevel = data.level;
              const cfg = RISK_CONFIG[catLevel];
              return (
                <div key={cat} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-[#0f172a]">{cat}</span>
                    <span className={`text-[9px] px-2.5 py-1 rounded-lg border-2 font-black uppercase tracking-widest ${cfg.bg} ${cfg.color}`}>
                      {catLevel}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-3 bg-slate-100 rounded-full border-2 border-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-r-full border-r-2 border-black/20 ${cfg.fill === "#ef4444" ? "bg-red-500" : cfg.fill === "#f97316" ? "bg-orange-500" : cfg.fill === "#f59e0b" ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${data.score}%` }}
                      />
                    </div>
                    <span className={`text-sm font-black w-8 text-right ${cfg.color}`}>{data.score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
