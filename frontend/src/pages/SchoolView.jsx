import { useState, useEffect } from "react";
import { get } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const RISK_CONFIG = {
  critical: { color: "text-red-400", bg: "bg-red-500/15 border-red-500/40", label: "CRITICAL" },
  high: { color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/40", label: "HIGH" },
  moderate: { color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/40", label: "MODERATE" },
  low: { color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/40", label: "LOW" },
};

const CONDITION_CONFIG = {
  good: { dot: "bg-emerald-400", text: "text-emerald-300", label: "Good" },
  moderate: { dot: "bg-amber-400", text: "text-amber-300", label: "Moderate" },
  poor: { dot: "bg-red-400", text: "text-red-300", label: "Poor" },
};

function RiskGauge({ score, level }) {
  const cfg = RISK_CONFIG[level] || RISK_CONFIG.low;
  const barColors = { critical: "#ef4444", high: "#f97316", moderate: "#f59e0b", low: "#10b981" };
  return (
    <div className={`rounded-xl border p-6 ${cfg.bg} flex flex-col items-center gap-3`}>
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={barColors[level] || "#10b981"}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42 * score / 100} ${2 * Math.PI * 42}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${cfg.color}`}>{score}</span>
          <span className="text-slate-400 text-xs">/ 100</span>
        </div>
      </div>
      <span className={`text-sm font-bold tracking-wider ${cfg.color}`}>{cfg.label} RISK</span>
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
        get(`/api/risk-scores/${schoolId}`),
        get(`/api/condition-report?schoolId=${schoolId}&limit=4`),
        get(`/api/schools/${schoolId}`),
      ]);

      if (riskRes.success) setAnalysis(riskRes.analysis);
      if (reportsRes.success) setReports(reportsRes.reports);
      if (schoolRes.success) setSchool(schoolRes.school);
      setLoading(false);
    };
    loadData();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;

  if (!user?.schoolId) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p className="text-lg">No school linked to your account.</p>
        <p className="text-sm mt-2">Contact your District Education Officer to link your account.</p>
      </div>
    );
  }

  const level = analysis?.level || "low";
  const score = analysis?.score || 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{school?.name || "My School"}</h1>
          <p className="text-slate-400 text-sm">{school?.district} · Building age: {school?.buildingAge}y · {school?.studentCount} students</p>
        </div>
        <button
          onClick={() => navigate("/dashboard/report")}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Weekly Report
        </button>
      </div>

      {/* Risk overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RiskGauge score={score} level={level} />

        <div className="md:col-span-2 bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Prediction Summary</h3>
          {analysis ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/40 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Time to Failure</p>
                  <p className={`text-xl font-bold mt-1 ${analysis.timeToFailureDays <= 15 ? "text-red-400" : analysis.timeToFailureDays <= 30 ? "text-orange-400" : "text-white"}`}>
                    {analysis.timeToFailureDays} days
                  </p>
                </div>
                <div className="bg-slate-700/40 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Trend</p>
                  <p className={`text-xl font-bold mt-1 ${analysis.trend === "deteriorating" ? "text-red-400" : analysis.trend === "improving" ? "text-emerald-400" : "text-slate-300"}`}>
                    {analysis.trend === "deteriorating" ? "↗ Worsening" : analysis.trend === "improving" ? "↘ Improving" : "→ Stable"}
                  </p>
                </div>
                <div className="bg-slate-700/40 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Worst Category</p>
                  <p className="text-base font-semibold text-white mt-1 capitalize">{analysis.worstCategory || "None"}</p>
                </div>
                <div className="bg-slate-700/40 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Reports Analysed</p>
                  <p className="text-xl font-bold text-white mt-1">{analysis.reportCount || 0}</p>
                </div>
              </div>
              <p className="text-slate-400 text-xs bg-slate-700/20 rounded-lg p-3">{analysis.explanation}</p>
            </>
          ) : (
            <p className="text-slate-500 text-sm">No analysis available. Submit a weekly report to get started.</p>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      {analysis?.breakdown && Object.keys(analysis.breakdown).length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Category Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(analysis.breakdown).map(([cat, data]) => {
              const catLevel = data.level;
              const cfg = RISK_CONFIG[catLevel];
              return (
                <div key={cat} className="flex items-center gap-4">
                  <span className="w-24 text-sm text-slate-400 capitalize">{cat}</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${catLevel === "critical" ? "bg-red-500" : catLevel === "high" ? "bg-orange-500" : catLevel === "moderate" ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${data.score}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold w-8 tabular-nums ${cfg.color}`}>{data.score}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} w-20 text-center`}>{catLevel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent reports */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Recent Reports</h3>
        {reports.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">No reports submitted yet.</p>
            <button onClick={() => navigate("/dashboard/report")} className="mt-3 px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-600/50 text-blue-300 text-sm hover:bg-blue-600/30">
              Submit First Report
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r._id} className="border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white text-sm font-medium">
                    Week of {new Date(r.weekOf).toLocaleDateString()}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_CONFIG[r.riskLevel]?.bg} ${RISK_CONFIG[r.riskLevel]?.color} border`}>
                    Score: {r.riskScore}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.items.map((item, i) => {
                    const cc = CONDITION_CONFIG[item.condition];
                    return (
                      <div key={i} className="flex items-center gap-1.5 bg-slate-700/40 rounded px-2 py-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${cc.dot}`} />
                        <span className="text-slate-300 text-xs capitalize">{item.category}</span>
                        <span className={`text-xs ${cc.text}`}>{cc.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
