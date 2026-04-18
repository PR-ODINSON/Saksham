import { useState, useEffect, useCallback } from "react";
import { get, post, patch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import CompletionModal from "../components/CompletionModal";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "text-slate-400", bg: "bg-slate-700/40 border-slate-600" },
  assigned: { label: "Assigned", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/40" },
  in_progress: { label: "In Progress", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/40" },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/40" },
  cancelled: { label: "Cancelled", color: "text-slate-500", bg: "bg-slate-800 border-slate-700" },
};

const PRIORITY_CONFIG = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-500 text-white",
  low: "bg-slate-600 text-slate-200",
};

const CATEGORY_ICONS = {
  structural: "🏗️", electrical: "⚡", plumbing: "🔧", sanitation: "🚿", furniture: "🪑",
};

function SLAMetricCard({ count }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 flex items-center justify-between">
      <div>
        <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">SLA Compliance Alert</p>
        <p className="text-2xl font-black text-white">{count} Work Orders</p>
        <p className="text-red-300/60 text-xs mt-1">Breached SLA deadline this month</p>
      </div>
      <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-900/40 animate-pulse">
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
  );
}

// ─── New Work Order Form ──────────────────────────────────────────────────────
function NewWorkOrderPanel({ prefill, onCreated, onClose, schools }) {
  const [form, setForm] = useState({
    schoolId: prefill.schoolId || "",
    category: prefill.category || "structural",
    subCategory: "",
    description: "",
    priority: prefill.score >= 76 ? "critical" : prefill.score >= 51 ? "high" : "medium",
    estimatedDays: "",
    riskScore: prefill.score || "",
    dueDate: "",
  });
  const [contractors, setContractors] = useState([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Load contractor users
    get("/api/admin/users").then(d => {
      if (d.success) setContractors(d.users.filter(u => u.role === "contractor"));
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await post("/api/tasks/assign", { ...form, assignedTo: assignedTo || undefined });
    setSaving(false);
    if (res.success) {
      onCreated(res.workOrder);
      onClose();
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Create Work Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">School</label>
              <select value={form.schoolId} onChange={e => setForm({ ...form, schoolId: e.target.value })} required
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select school…</option>
                {schools.map(s => <option key={s._id} value={s._id}>{s.name || s.schoolId}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(CATEGORY_ICONS).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Description *</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required rows={2}
                placeholder="Describe the issue and required work…"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Assign to Contractor</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Unassigned</option>
                {contractors.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50">
              {saving ? "Creating…" : "Create Work Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WorkOrders() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [completingOrder, setCompletingOrder] = useState(null);

  const prefill = {
    schoolId: searchParams.get("schoolId") || "",
    category: searchParams.get("category") || "",
    score: Number(searchParams.get("score")) || 0,
    school: searchParams.get("school") || "",
  };

  const canAssign = ["deo", "admin"].includes(user?.role);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await get(`/api/tasks?${params}`);
    if (res.success) setOrders(res.workOrders);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { get("/api/schools").then(d => d.success && setSchools(d.schools)); }, []);

  // Auto-open new work order form if redirected from DEO dashboard
  useEffect(() => {
    if (prefill.schoolId && canAssign) setShowNew(true);
  }, []);

  const updateOrderInList = (updated) => {
    setOrders(orders.map(o => o._id === updated._id ? updated : o));
  };

  const filtered = orders.filter(o => statusFilter === "all" || o.status === statusFilter);
  const breachedCount = orders.filter(o => o.slaBreach).length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Maintenance Work Orders</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {user?.role === "contractor" ? "Your assigned tasks" : "Track and manage repair assignments"}
          </p>
        </div>
        {canAssign && (
          <button onClick={() => setShowNew(true)} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20 active:translate-y-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Assignment
          </button>
        )}
      </div>

      {/* SLA Metric Card */}
      {breachedCount > 0 && <SLAMetricCard count={breachedCount} />}

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap bg-slate-800/20 p-1.5 rounded-xl border border-slate-700/50">
        {["all", "pending", "assigned", "in_progress", "completed"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${statusFilter === s ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-700/50"}`}
          >
            {s === "all" ? "All Orders" : STATUS_CONFIG[s]?.label}
            <span className={`ml-2 text-[10px] px-1.5 rounded-md ${statusFilter === s ? "bg-blue-400/30" : "bg-slate-700"}`}>
              {s === "all" ? orders.length : orders.filter(o => o.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="text-center py-24 text-slate-500 animate-pulse font-medium">Synchronizing work order registry...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-700">
          <p className="text-slate-500 italic">No matching work orders found in the registry.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(order => {
            const sc = STATUS_CONFIG[order.status];
            const pc = PRIORITY_CONFIG[order.priority];
            const isAssignedToMe = user?.role === "contractor" && order.assignedTo?._id === user.id;
            const canComplete = isAssignedToMe || canAssign;
            
            return (
              <div key={order._id} className={`border rounded-xl p-5 transition-all hover:border-slate-500 shadow-sm ${sc.bg} ${order.slaBreach ? 'border-red-500/50 shadow-red-900/10' : ''}`}>
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="text-xl">{CATEGORY_ICONS[order.category] || "🔧"}</span>
                      <span className="font-black text-white capitalize text-lg tracking-tight">{order.category}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${pc}`}>{order.priority}</span>
                      
                      {order.slaBreach && (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse uppercase">
                          ⚠️ SLA BREACH
                        </span>
                      )}
                    </div>
                    
                    <p className="text-slate-300 text-sm mb-4 leading-relaxed font-medium">{order.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-black/20 p-3 rounded-lg border border-slate-700/50">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Location</p>
                        <p className="text-xs text-white truncate font-semibold">🏫 {order.schoolId?.name || "Unknown School"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Contractor</p>
                        <p className="text-xs text-white font-semibold">👷 {order.assignedTo?.name || "Unassigned"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Target Date</p>
                        <p className={`text-xs font-semibold ${order.slaBreach ? 'text-red-400' : 'text-white'}`}>
                          📅 {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'No Deadline'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Contractor Delay</p>
                        <p className={`text-xs font-black ${order.contractorDelayDays > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          ⏱ {order.contractorDelayDays || 0} Days
                        </p>
                      </div>
                    </div>

                    {order.status === "completed" && order.completionNotes && (
                      <div className="mt-4 text-xs text-emerald-300 bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                        <span className="font-bold text-emerald-400 uppercase text-[10px] block mb-1">Resolution Summary</span>
                        {order.completionNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <span className={`px-3 py-1 rounded-lg text-xs font-black border uppercase tracking-widest bg-slate-900 ${sc.color}`}>{sc.label}</span>
                    
                    {order.status !== "completed" && order.status !== "cancelled" && canComplete && (
                      <button
                        onClick={() => setCompletingOrder(order)}
                        className="w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-md shadow-emerald-900/20 active:translate-y-0.5"
                      >
                        CLOSE ORDER
                      </button>
                    )}
                    
                    {canAssign && order.status === "pending" && (
                      <button
                        onClick={() => patch(`/api/tasks/${order._id}/status`, { status: "assigned" }).then(r => r.success && updateOrderInList(r.workOrder))}
                        className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition-all shadow-md shadow-blue-900/20 active:translate-y-0.5"
                      >
                        ASSIGN NOW
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewWorkOrderPanel
          prefill={prefill}
          schools={schools}
          onCreated={(wo) => setOrders([wo, ...orders])}
          onClose={() => setShowNew(false)}
        />
      )}
      {completingOrder && (
        <CompletionModal
          workOrder={completingOrder}
          onDone={updateOrderInList}
          onClose={() => setCompletingOrder(null)}
        />
      )}
    </div>
  );
}
