import { useState, useEffect, useCallback } from "react";
import { get } from "../services/api";
import { useNavigate } from "react-router-dom";

const RISK_CONFIG = {
  critical: { color: "text-red-400", bg: "bg-red-500/15 border-red-500/40", badge: "bg-red-500 text-white", bar: "bg-red-500" },
  high: { color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/40", badge: "bg-orange-500 text-white", bar: "bg-orange-500" },
  moderate: { color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/40", badge: "bg-amber-500 text-white", bar: "bg-amber-500" },
  low: { color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/40", badge: "bg-emerald-600 text-white", bar: "bg-emerald-500" },
};

const CATEGORY_ICONS = {
  structural: "🏗️", electrical: "⚡", plumbing: "🔧", sanitation: "🚿", furniture: "🪑",
};

function StatCard({ label, value, sub, color = "text-white" }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function RiskBar({ score }) {
  const level = score >= 76 ? "critical" : score >= 51 ? "high" : score >= 26 ? "moderate" : "low";
  const cfg = RISK_CONFIG[level];
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums ${cfg.color}`}>{score}</span>
    </div>
  );
}

export default function DEODashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [minRisk, setMinRisk] = useState(0);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (district) params.set("district", district);
    const res = await get(`/api/risk-scores?${params}`);
    if (res.success) setData(res.riskScores);
    setLoading(false);
  }, [district]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = data.filter(s => {
    if (minRisk && s.riskScore < minRisk) return false;
    if (category && s.worstCategory !== category) return false;
    return true;
  });

  const stats = {
    total: data.length,
    critical: data.filter(s => s.riskLevel === "critical").length,
    high: data.filter(s => s.riskLevel === "high").length,
    avgScore: data.length ? Math.round(data.reduce((a, s) => a + s.riskScore, 0) / data.length) : 0,
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">DEO Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Prioritised school risk overview</p>
        </div>
        <button
          onClick={() => navigate("/dashboard/work-orders")}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
        >
          View Work Orders
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Schools" value={stats.total} />
        <StatCard label="Critical" value={stats.critical} color="text-red-400" sub="Immediate action" />
        <StatCard label="High Risk" value={stats.high} color="text-orange-400" sub="Within 30 days" />
        <StatCard label="Avg Risk Score" value={stats.avgScore} sub="0–100 scale" color="text-blue-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Filter by district..."
          value={district}
          onChange={e => setDistrict(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_ICONS).map(([k, v]) => (
            <option key={k} value={k}>{v} {k.charAt(0).toUpperCase() + k.slice(1)}</option>
          ))}
        </select>
        <select
          value={minRisk}
          onChange={e => setMinRisk(Number(e.target.value))}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={0}>All risk levels</option>
          <option value={26}>Moderate+</option>
          <option value={51}>High+</option>
          <option value={76}>Critical only</option>
        </select>
        <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm border border-slate-600">
          Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading risk scores…</div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Rank</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">School</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">District</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Risk Score</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Level</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Worst Category</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Time to Failure</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Trend</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-500">No schools match the current filters</td></tr>
                )}
                {filtered.map((s, idx) => {
                  const cfg = RISK_CONFIG[s.riskLevel];
                  return (
                    <tr key={s.schoolId} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{s.schoolName}</div>
                        <div className="text-slate-500 text-xs">{s.studentCount} students</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{s.district}</td>
                      <td className="px-4 py-3 w-36">
                        <RiskBar score={s.riskScore} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>
                          {s.riskLevel.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {s.worstCategory ? `${CATEGORY_ICONS[s.worstCategory]} ${s.worstCategory}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${s.timeToFailureDays <= 15 ? "text-red-400" : s.timeToFailureDays <= 30 ? "text-orange-400" : "text-slate-300"}`}>
                          {s.timeToFailureDays}d
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.trend === "deteriorating" && <span className="text-red-400 text-xs">↗ Worsening</span>}
                        {s.trend === "improving" && <span className="text-emerald-400 text-xs">↘ Improving</span>}
                        {s.trend === "stable" && <span className="text-slate-400 text-xs">→ Stable</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/dashboard/work-orders/new?schoolId=${s.schoolId}&school=${encodeURIComponent(s.schoolName)}&category=${s.worstCategory}&score=${s.riskScore}`)}
                          className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/50 text-blue-300 text-xs font-medium transition-colors"
                        >
                          Assign
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Explanation callout */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">How scores are computed</h3>
        <p className="text-slate-400 text-xs leading-relaxed">
          Risk scores (0–100) combine: <strong className="text-slate-300">condition ratings</strong> (poor=3, moderate=2, good=1)
          weighted by <strong className="text-slate-300">category impact</strong> (structural &gt; electrical &gt; sanitation &gt; plumbing),
          a <strong className="text-slate-300">building age multiplier</strong>, and
          <strong className="text-slate-300"> 4-week time-decay history</strong> (recent reports weighted more).
          Priority score also factors in student count and deterioration trend.
        </p>
      </div>
    </div>
  );
}
