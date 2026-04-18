import { useState, useEffect } from "react";
import { get } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FileText, AlertTriangle, TrendingUp, CheckCircle2, TrendingDown, ArrowRight, Building, MapPin, Users, Calendar } from "lucide-react";

const RISK_CONFIG = {
  critical: { color: "text-red-600", bg: "bg-red-50 border-2 border-red-600 shadow-[4px_4px_0_#ef4444]", label: "CRITICAL", fill: "#ef4444" },
  high: { color: "text-orange-600", bg: "bg-orange-50 border-2 border-orange-600 shadow-[4px_4px_0_#f97316]", label: "HIGH", fill: "#f97316" },
  moderate: { color: "text-amber-600", bg: "bg-amber-50 border-2 border-amber-600 shadow-[4px_4px_0_#f59e0b]", label: "MODERATE", fill: "#f59e0b" },
  low: { color: "text-emerald-600", bg: "bg-emerald-50 border-2 border-emerald-600 shadow-[4px_4px_0_#10b981]", label: "LOW", fill: "#10b981" },
};

const CONDITION_CONFIG = {
  good:     { dot: "bg-emerald-500", text: "text-emerald-700", label: "Good" },
  moderate: { dot: "bg-amber-500",   text: "text-amber-700",   label: "Moderate" },
  poor:     { dot: "bg-red-500",     text: "text-red-700",     label: "Poor" },
};

// Map 1-5 conditionScore to a condition label
function scoreToCondition(cs) {
  if (cs <= 2) return "good";
  if (cs <= 3) return "moderate";
  return "poor";
}

// Map 0-100 priorityScore to a risk level
function priorityToLevel(ps) {
  if (ps >= 80) return "critical";
  if (ps >= 60) return "high";
  if (ps >= 40) return "moderate";
  return "low";
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

function RiskGauge({ score, level }) {
  const cfg = RISK_CONFIG[level] || RISK_CONFIG.low;
  return (
    <div className={`rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 transition-all hover:-translate-y-1 ${cfg.bg}`}>
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90 drop-shadow-md" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#fff" strokeWidth="12" />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={cfg.fill}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42 * score / 100} ${2 * Math.PI * 42}`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-black ${cfg.color}`}>{score}</span>
          <span className="text-[#0f172a] text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">/ 100</span>
        </div>
      </div>
      <span className={`text-sm font-black tracking-widest px-4 py-1.5 bg-white border-2 border-current rounded-xl shadow-[2px_2px_0_currentColor] ${cfg.color}`}>
        {cfg.label} RISK
      </span>
    </div>
  );
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
        get(`/api/condition-report?schoolId=${schoolId}&limit=20`),
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

  const isSchoolStaff = user?.role === 'peon' || user?.role === 'principal' || user?.role === 'school';

  if (!user?.schoolId || !isSchoolStaff) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white border-2 border-slate-200 rounded-[2rem] max-w-xl mx-auto mt-12 font-body">
        <p className="text-xl text-[#0f172a] font-black">Access Denied.</p>
        <p className="text-sm mt-2">Only School Peon/Watchman or Principal accounts can access this view for their school.</p>
      </div>
    );
  }

  const level = analysis?.level || "low";
  const score = analysis?.score || 0;

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
              {school?.name || "My School"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
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
          onClick={() => navigate("/dashboard/report")}
          className="px-6 py-3.5 rounded-2xl bg-[#0f172a] hover:bg-blue-600 text-white text-sm font-black flex items-center justify-center gap-2 border-2 border-[#0f172a] shadow-[4px_4px_0_#2563eb] transition-all active:translate-y-1 active:translate-x-1 active:shadow-none whitespace-nowrap"
        >
          <FileText size={18} />
          Submit Weekly Report
        </button>
      </div>

      {/* Risk overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RiskGauge score={score} level={level} />

        <div className="md:col-span-2 bg-white border-2 border-[#0f172a] rounded-[2rem] p-8 shadow-[6px_6px_0_#0f172a] flex flex-col justify-between">
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
              <p className="text-slate-500 font-bold text-sm">No analysis available. Submit a weekly report.</p>
            </div>
          )}
        </div>
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

      {/* Condition records */}
      <div className="bg-white border-2 border-[#0f172a] rounded-[2rem] p-8 shadow-[6px_6px_0_#0f172a]">
        <h3 className="text-sm font-black tracking-widest uppercase text-slate-500 mb-6">Condition Log</h3>
        {reports.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
            <p className="text-slate-400 font-bold mb-4">No inspection records found for this location.</p>
            <button onClick={() => navigate("/dashboard/report")} className="px-5 py-2.5 rounded-xl bg-white border-2 border-[#0f172a] text-[#0f172a] text-xs font-black tracking-widest uppercase shadow-[3px_3px_0_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#0f172a] transition-all">
              Initialise First Report
            </button>
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
                      <div className="w-10 h-10 rounded-xl bg-white border-2 border-slate-200 group-hover:border-[#0f172a] flex items-center justify-center font-black text-slate-400 group-hover:text-[#0f172a] transition-colors">
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

// Internal icon component for cleaner code above
function ActivityIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
