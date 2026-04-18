import { useState, useEffect, useCallback } from "react";
import { get } from "../services/api";
import { useNavigate } from "react-router-dom";
import EvidenceDrawer from "../components/EvidenceDrawer";
import { Activity, LayoutList, CheckCircle2, ShieldCheck, Wrench, AlertTriangle } from 'lucide-react';

const CATEGORY_COLORS = {
  structural: "bg-purple-100 text-purple-800 border-purple-300",
  electrical: "bg-amber-100 text-amber-800 border-amber-300",
  plumbing: "bg-blue-100 text-blue-800 border-blue-300",
  sanitation: "bg-emerald-100 text-emerald-800 border-emerald-300",
  furniture: "bg-slate-100 text-slate-800 border-slate-300",
};

const CATEGORY_ICONS = {
  structural: "🏗️", electrical: "⚡", plumbing: "🔧", sanitation: "🚿", furniture: "🪑",
};

function StatCard({ label, value, sub, color = "text-slate-900", icon }) {
  return (
    <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[4px_4px_0_#0f172a] hover:-translate-y-1 transition-transform flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{label}</p>
        {icon && <div className="text-blue-600">{icon}</div>}
      </div>
      <div>
        <p className={`text-4xl font-black ${color}`} style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
        {sub && <p className="text-slate-600 text-xs mt-1 font-semibold">{sub}</p>}
      </div>
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
    <div className="p-6 space-y-8 max-w-7xl mx-auto min-h-screen bg-slate-50 font-body">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border-2 border-slate-900 mb-3 shadow-[2px_2px_0_#2563eb]">
             <ShieldCheck size={14} className="text-blue-600" />
             <span className="text-[10px] font-black text-slate-900 tracking-widest uppercase">Dashboard Active</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>District Maintenance Queue</h1>
          <p className="text-slate-600 text-sm mt-1 font-medium">Aggregated school risks and pending decisions</p>
        </div>
        <button
          onClick={() => navigate("/dashboard/work-orders")}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-black transition-all shadow-[4px_4px_0_#2563eb] active:translate-y-1 active:shadow-none border-2 border-slate-900"
        >
          <LayoutList size={18} />
          Manage Work Orders
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Schools at Risk" value={stats.totalSchools} sub="Across all categories" icon={<Activity size={20} />} />
        <StatCard label="Critical Priority" value={stats.criticalCount} color="text-red-600" sub="Immediate attention" icon={<AlertTriangle size={20} className="text-red-600" />} />
        <StatCard label="High Priority" value={stats.highRiskCount} color="text-orange-500" sub="Next 15-30 days" />
        <StatCard label="Avg. Days to Failure" value={`${stats.avgUrgency}d`} sub="System-wide urgency" color="text-blue-600" icon={<Wrench size={20} />} />
      </div>

      {/* Filters & Controls */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0_#0f172a]">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search district..."
            value={district}
            onChange={e => setDistrict(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm font-semibold w-40 focus:border-slate-900 focus:outline-none transition-colors"
          />
          <input
            type="text"
            placeholder="Search block..."
            value={block}
            onChange={e => setBlock(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm font-semibold w-40 focus:border-slate-900 focus:outline-none transition-colors"
          />
        </div>

        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm font-semibold focus:border-slate-900 focus:outline-none transition-colors"
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_ICONS).map(([k, v]) => (
            <option key={k} value={k}>{v} {k.charAt(0).toUpperCase() + k.slice(1)}</option>
          ))}
        </select>

        {/* Urgency Toggle */}
        <div className="flex p-1 bg-slate-100 rounded-xl border-2 border-slate-200">
          <button
            onClick={() => setUrgency(30)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${urgency === 30 ? "bg-white text-slate-900 shadow-sm border-2 border-slate-900" : "text-slate-500 hover:text-slate-700 border-2 border-transparent"}`}
          >
            30 Days
          </button>
          <button
            onClick={() => setUrgency(60)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${urgency === 60 ? "bg-white text-slate-900 shadow-sm border-2 border-slate-900" : "text-slate-500 hover:text-slate-700 border-2 border-transparent"}`}
          >
            60 Days
          </button>
        </div>

        <button onClick={fetchData} className="ml-auto px-5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold border-2 border-blue-200 transition-colors">
          Refresh Data
        </button>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4 bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0_#0f172a]">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-bold tracking-widest text-sm uppercase">Analyzing predictive queue...</p>
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-900 rounded-2xl overflow-hidden shadow-[4px_4px_0_#0f172a]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-50">
                  <th className="px-6 py-4 text-slate-900 font-black uppercase tracking-widest text-[10px]">School & Location</th>
                  <th className="px-6 py-4 text-slate-900 font-black uppercase tracking-widest text-[10px]">At-Risk Categories</th>
                  <th className="px-6 py-4 text-slate-900 font-black uppercase tracking-widest text-[10px]">Days to Failure</th>
                  <th className="px-6 py-4 text-slate-900 font-black uppercase tracking-widest text-[10px]">Student Impact</th>
                  <th className="px-6 py-4 text-slate-900 font-black uppercase tracking-widest text-[10px]">Indicators</th>
                  <th className="px-6 py-4 text-slate-900 font-black uppercase tracking-widest text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100">
                {data.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-24 text-slate-500 font-semibold">No schools found matching the current urgency window.</td></tr>
                )}
                {data.map((s) => (
                  <tr key={s.schoolId} 
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedSchool(s)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{s.schoolName}</div>
                      <div className="text-slate-500 text-xs font-semibold mt-1">{s.block}, {s.district}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {s.categories.map(cat => (
                          <span key={cat} className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider border-2 ${CATEGORY_COLORS[cat] || "bg-slate-100 text-slate-700 border-slate-300"}`}>
                            {cat.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm font-black ${s.daysToFailure <= 15 ? "text-red-600" : s.daysToFailure <= 30 ? "text-orange-500" : "text-blue-600"}`}>
                        {s.daysToFailure} days
                      </div>
                      <div className="w-24 h-2 bg-slate-100 rounded-full mt-2 overflow-hidden border border-slate-200">
                        <div 
                          className={`h-full rounded-full ${s.daysToFailure <= 15 ? "bg-red-500" : s.daysToFailure <= 30 ? "bg-orange-500" : "bg-blue-500"}`}
                          style={{ width: `${Math.max(10, 100 - (s.daysToFailure))}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-bold">{s.studentImpactScore} students</div>
                      <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Predicted failure impact</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {s.isGirlsSchool && (
                          <span className="flex items-center gap-1 text-pink-700 px-2.5 py-1 rounded-lg bg-pink-100 border-2 border-pink-200 text-[10px] font-black">
                            👩‍🎓 GIRLS
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-700 px-2.5 py-1 rounded-lg bg-slate-100 border-2 border-slate-200 text-[10px] font-black">
                          📋 {s.topEvidence.length} CLUES
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/work-orders/new?schoolId=${s.schoolId}&school=${encodeURIComponent(s.schoolName)}&category=${s.highestPriorityCategory}&score=${s.priorityScore}`);
                        }}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-transform active:scale-95 shadow-[2px_2px_0_#0f172a] border-2 border-slate-900"
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
      <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0_#0f172a]">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-50 border-2 border-blue-200 text-blue-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 mb-2 uppercase tracking-wide">Predictive Aggregation Logic</h3>
            <p className="text-slate-600 text-sm font-medium leading-relaxed max-w-4xl">
              This queue aggregates multiple infrastructure predictions into single school rows. 
              <strong className="text-slate-900 font-black mx-1">Days to Failure</strong> reflects the earliest predicted breakdown across plumbing, electrical, or structural categories. 
              <strong className="text-slate-900 font-black mx-1">Highest Priority Category</strong> is selected based on the component with the steepest deterioration trend. 
              Click any row to reveal the specific data-points that triggered the maintenance alert.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
