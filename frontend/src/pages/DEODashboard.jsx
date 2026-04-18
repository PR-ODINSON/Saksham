import { useState, useEffect, useCallback } from "react";
import { get } from "../services/api";
import { useNavigate } from "react-router-dom";
import EvidenceDrawer from "../components/EvidenceDrawer";

const RISK_CONFIG = {
  critical: { color: "text-red-400", bg: "bg-red-500/15 border-red-500/40", badge: "bg-red-500 text-white", bar: "bg-red-500" },
  high: { color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/40", badge: "bg-orange-500 text-white", bar: "bg-orange-500" },
  moderate: { color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/40", badge: "bg-amber-500 text-white", bar: "bg-amber-500" },
  low: { color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/40", badge: "bg-emerald-600 text-white", bar: "bg-emerald-500" },
};

const CATEGORY_COLORS = {
  structural: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  electrical: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  plumbing: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  sanitation: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  furniture: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const CATEGORY_ICONS = {
  structural: "🏗️", electrical: "⚡", plumbing: "🔧", sanitation: "🚿", furniture: "🪑",
};

function StatCard({ label, value, sub, color = "text-white" }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 shadow-sm">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function DEODashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState(60);
  const [selectedSchool, setSelectedSchool] = useState(null);
  
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (district) params.set("district", district);
    if (block) params.set("block", block);
    if (category) params.set("category", category);
    params.set("urgency", urgency);
    
    const res = await get(`/api/risk/queue?${params}`);
    if (res.success) setData(res.queue);
    setLoading(false);
  }, [district, block, category, urgency]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    totalSchools: data.length,
    criticalCount: data.filter(s => s.priorityScore >= 75).length,
    highRiskCount: data.filter(s => s.priorityScore >= 50 && s.priorityScore < 75).length,
    avgUrgency: data.length ? Math.round(data.reduce((a, s) => a + s.daysToFailure, 0) / data.length) : 0,
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">District Maintenance Queue</h1>
          <p className="text-slate-400 text-sm mt-0.5">Aggregated school risks and pending decisions</p>
        </div>
        <button
          onClick={() => navigate("/dashboard/work-orders")}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-md active:scale-95"
        >
          Manage Work Orders
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Schools at Risk" value={stats.totalSchools} sub="Across all categories" />
        <StatCard label="Critical Priority" value={stats.criticalCount} color="text-red-400" sub="Immediate attention" />
        <StatCard label="High Priority" value={stats.highRiskCount} color="text-orange-400" sub="Next 15-30 days" />
        <StatCard label="Avg. Days to Failure" value={`${stats.avgUrgency}d`} sub="System-wide urgency" color="text-blue-400" />
      </div>

      {/* Filters & Controls */}
      <div className="flex flex-wrap gap-4 items-center bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search district..."
            value={district}
            onChange={e => setDistrict(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm w-40 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
          <input
            type="text"
            placeholder="Search block..."
            value={block}
            onChange={e => setBlock(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm w-40 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_ICONS).map(([k, v]) => (
            <option key={k} value={k}>{v} {k.charAt(0).toUpperCase() + k.slice(1)}</option>
          ))}
        </select>

        {/* Urgency Toggle */}
        <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-700">
          <button
            onClick={() => setUrgency(30)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${urgency === 30 ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
          >
            30 Days
          </button>
          <button
            onClick={() => setUrgency(60)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${urgency === 60 ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
          >
            60 Days
          </button>
        </div>

        <button onClick={fetchData} className="ml-auto px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm border border-slate-600 transition-colors">
          Refresh Data
        </button>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-500 animate-pulse">Analyzing predictive queue...</p>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-5 py-4 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">School & Location</th>
                  <th className="px-5 py-4 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">At-Risk Categories</th>
                  <th className="px-5 py-4 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Days to Failure</th>
                  <th className="px-5 py-4 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Student Impact</th>
                  <th className="px-5 py-4 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Indicators</th>
                  <th className="px-5 py-4 text-slate-400 font-semibold uppercase tracking-wider text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {data.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-20 text-slate-500 italic">No schools found matching the current urgency window.</td></tr>
                )}
                {data.map((s) => (
                  <tr key={s.schoolId} 
                    className="hover:bg-slate-700/30 transition-all cursor-pointer group"
                    onClick={() => setSelectedSchool(s)}
                  >
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors">{s.schoolName}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{s.block}, {s.district}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {s.categories.map(cat => (
                          <span key={cat} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${CATEGORY_COLORS[cat] || "bg-slate-700 text-slate-300 border-slate-600"}`}>
                            {cat.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className={`text-sm font-bold ${s.daysToFailure <= 15 ? "text-red-400" : s.daysToFailure <= 30 ? "text-orange-400" : "text-blue-400"}`}>
                        {s.daysToFailure} days
                      </div>
                      <div className="w-24 h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div 
                          className={`h-full ${s.daysToFailure <= 15 ? "bg-red-500" : s.daysToFailure <= 30 ? "bg-orange-500" : "bg-blue-500"}`}
                          style={{ width: `${Math.max(10, 100 - (s.daysToFailure))}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-slate-200 font-medium">{s.studentImpactScore} students</div>
                      <div className="text-[10px] text-slate-500">Predicted failure impact</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        {s.isGirlsSchool && (
                          <span className="flex items-center gap-1 text-pink-400 px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-[10px] font-bold">
                            👩‍🎓 GIRLS
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-400 px-2 py-0.5 rounded-full bg-slate-700/50 border border-slate-600/50 text-[10px] font-bold">
                          📋 {s.topEvidence.length} CLUES
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/work-orders/new?schoolId=${s.schoolId}&school=${encodeURIComponent(s.schoolName)}&category=${s.highestPriorityCategory}&score=${s.priorityScore}`);
                        }}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-900/20 active:translate-y-0.5"
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evidence Drawer Integration */}
      <EvidenceDrawer
        isOpen={!!selectedSchool}
        onClose={() => setSelectedSchool(null)}
        schoolName={selectedSchool?.schoolName}
        categories={selectedSchool?.categories}
        evidence={selectedSchool?.topEvidence}
      />

      {/* Explanation callout */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">Predictive Aggregation Logic</h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-4xl">
              This queue aggregates multiple infrastructure predictions into single school rows. 
              <strong className="text-slate-300"> Days to Failure</strong> reflects the earliest predicted breakdown across plumbing, electrical, or structural categories. 
              <strong className="text-slate-300"> Highest Priority Category</strong> is selected based on the component with the steepest deterioration trend. 
              Click any row to reveal the specific data-points that triggered the maintenance alert.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
