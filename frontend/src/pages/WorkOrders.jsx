import { useState, useEffect, useCallback } from "react";
import { get, post, patch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import CompletionModal from "../components/CompletionModal";
import { Building, Zap, Wrench, Droplets, Grid } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "text-slate-600" },
  assigned: { label: "Assigned", color: "text-blue-700" },
  in_progress: { label: "In Progress", color: "text-amber-700" },
  completed: { label: "Completed", color: "text-emerald-700" },
  cancelled: { label: "Cancelled", color: "text-slate-500" },
};

const PRIORITY_CONFIG = {
  critical: "bg-red-50 text-red-700 border-red-300",
  high: "bg-orange-50 text-orange-700 border-orange-300",
  medium: "bg-amber-50 text-amber-700 border-amber-300",
  low: "bg-slate-50 text-slate-700 border-slate-300",
};

const CATEGORY_ICONS = {
  structural: <Building size={20} strokeWidth={2.5} />, 
  electrical: <Zap size={20} strokeWidth={2.5} />, 
  plumbing: <Wrench size={20} strokeWidth={2.5} />, 
  sanitation: <Droplets size={20} strokeWidth={2.5} />, 
  furniture: <Grid size={20} strokeWidth={2.5} />,
};

function SLAMetricCard({ count }) {
  return (
    <div className="bg-red-50 border-2 border-[#0f172a] rounded-[20px] p-6 flex items-center justify-between shadow-[6px_6px_0_#0f172a]">
      <div>
        <p className="text-red-600 text-xs font-black uppercase tracking-widest mb-1">SLA Compliance Alert</p>
        <p className="text-3xl font-black text-[#0f172a]">{count} Work Orders</p>
        <p className="text-slate-600 text-xs mt-1 font-bold">Breached SLA deadline this month</p>
      </div>
      <div className="h-14 w-14 rounded-2xl bg-white border-2 border-[#0f172a] flex items-center justify-center shadow-[4px_4px_0_#0f172a] animate-pulse">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
    <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-[#0f172a] rounded-[24px] w-full max-w-lg shadow-[12px_12px_0_#0f172a] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b-2 border-slate-100 bg-slate-50">
          <h2 className="text-xl font-black text-[#0f172a]">Create Work Order</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white border-2 border-slate-200 text-[#0f172a] flex items-center justify-center hover:border-[#0f172a] transition-all shadow-sm">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="px-4 py-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 font-bold text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">School</label>
              <select value={form.schoolId} onChange={e => setForm({ ...form, schoolId: e.target.value })} required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 text-[#0f172a] font-bold text-sm focus:outline-none focus:border-[#0f172a] focus:shadow-[4px_4px_0_#0f172a] transition-all appearance-none cursor-pointer">
                <option value="">Select school…</option>
                {schools.map(s => <option key={s._id} value={s._id}>{s.name || s.schoolId}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 text-[#0f172a] font-bold text-sm focus:outline-none focus:border-[#0f172a] focus:shadow-[4px_4px_0_#0f172a] transition-all appearance-none cursor-pointer">
                <option value="">Select category...</option>
                {Object.keys(CATEGORY_ICONS).map((k) => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 text-[#0f172a] font-bold text-sm focus:outline-none focus:border-[#0f172a] focus:shadow-[4px_4px_0_#0f172a] transition-all appearance-none cursor-pointer">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Description *</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required rows={2}
                placeholder="Describe the issue and required work…"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 text-[#0f172a] font-bold text-sm resize-none focus:outline-none focus:border-[#0f172a] focus:shadow-[4px_4px_0_#0f172a] transition-all placeholder:text-slate-400" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Contractor</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 text-[#0f172a] font-bold text-sm focus:outline-none focus:border-[#0f172a] focus:shadow-[4px_4px_0_#0f172a] transition-all appearance-none cursor-pointer">
                <option value="">Unassigned</option>
                {contractors.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 text-[#0f172a] font-bold text-sm focus:outline-none focus:border-[#0f172a] focus:shadow-[4px_4px_0_#0f172a] transition-all" />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-black text-sm hover:border-[#0f172a] hover:text-[#0f172a] transition-all bg-white">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-3.5 rounded-xl bg-[#0f172a] hover:bg-blue-600 text-white font-black text-sm transition-all border-2 border-[#0f172a] shadow-[4px_4px_0_#2563eb] active:translate-y-1 active:translate-x-1 active:shadow-none disabled:opacity-50">
              {saving ? "Creating…" : "Create Assignment"}
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

  useEffect(() => {
    if (prefill.schoolId && canAssign) setShowNew(true);
  }, []);

  const updateOrderInList = (updated) => {
    setOrders(orders.map(o => o._id === updated._id ? updated : o));
  };

  const filtered = orders.filter(o => statusFilter === "all" || o.status === statusFilter);
  const breachedCount = orders.filter(o => o.slaBreach).length;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto font-body text-[#0f172a]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#0f172a] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Maintenance Orders</h1>
          <p className="text-slate-500 font-bold mt-2">
            {user?.role === "contractor" ? "Your active assigned tasks" : "Track and manage assignments globally"}
          </p>
        </div>
        {canAssign && (
          <button onClick={() => setShowNew(true)} className="px-6 py-3.5 rounded-2xl bg-[#0f172a] hover:bg-blue-600 text-white text-sm font-black flex items-center justify-center gap-2 border-2 border-[#0f172a] shadow-[4px_4px_0_#2563eb] transition-all active:translate-y-1 active:translate-x-1 active:shadow-none">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
            New Assignment
          </button>
        )}
      </div>

      {breachedCount > 0 && <SLAMetricCard count={breachedCount} />}

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap bg-slate-100 p-2 rounded-2xl border-2 border-slate-200">
        {["all", "pending", "assigned", "in_progress", "completed"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 border-2 ${
              statusFilter === s 
                ? "bg-[#0f172a] text-white border-[#0f172a] shadow-[3px_3px_0_#2563eb]" 
                : "bg-transparent text-slate-500 border-transparent hover:border-slate-300 hover:bg-white hover:text-[#0f172a]"
            }`}
          >
            {s === "all" ? "ALL ORDERS" : STATUS_CONFIG[s]?.label.toUpperCase()}
            <span className={`px-2 py-0.5 rounded-md text-[10px] ${statusFilter === s ? "bg-white/20" : "bg-slate-200 text-slate-600"}`}>
              {s === "all" ? orders.length : orders.filter(o => o.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
           <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0f172a] rounded-full animate-spin" />
           <p className="text-slate-400 font-black tracking-[0.2em] text-[10px] uppercase animate-pulse">Syncing Registry...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-slate-300">
          <p className="text-slate-400 font-bold italic">No matching work orders found in the registry.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filtered.map(order => {
            const sc = STATUS_CONFIG[order.status];
            const pc = PRIORITY_CONFIG[order.priority];
            const isAssignedToMe = user?.role === "contractor" && order.assignedTo?._id === user.id;
            const canComplete = isAssignedToMe || canAssign;
            
            return (
              <div key={order._id} className={`bg-white border-2 rounded-[2rem] p-6 transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_#0f172a] group ${
                order.slaBreach ? 'border-red-500 shadow-[6px_6px_0_#ef4444]' : 'border-[#0f172a] shadow-[4px_4px_0_#0f172a]'
              }`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border-2 border-[#0f172a] flex items-center justify-center shadow-[2px_2px_0_#0f172a] text-[#0f172a]">
                        {CATEGORY_ICONS[order.category] || <Wrench size={20} strokeWidth={2.5} />}
                      </div>
                      <span className="font-black text-[#0f172a] uppercase text-xl tracking-tight">{order.category}</span>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 ${pc}`}>{order.priority}</span>
                      
                      {order.slaBreach && (
                        <span className="px-3 py-1 rounded-lg bg-red-100 border-2 border-red-500 text-red-600 text-[10px] font-black animate-pulse uppercase tracking-widest shadow-[2px_2px_0_#ef4444]">
                          ⚠️ SLA BREACH
                        </span>
                      )}
                    </div>
                    
                    <p className="text-slate-600 text-sm mb-6 font-bold leading-relaxed">{order.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
                      <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1.5">Location</p>
                        <p className="text-xs text-[#0f172a] truncate font-bold">🏫 {order.schoolId?.name || "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1.5">Contractor</p>
                        <p className="text-xs text-[#0f172a] font-bold">👷 {order.assignedTo?.name || "Unassigned"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1.5">Target Date</p>
                        <p className={`text-xs font-black ${order.slaBreach ? 'text-red-600' : 'text-[#0f172a]'}`}>
                          📅 {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'None'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1.5">Delay</p>
                        <p className={`text-xs font-black ${order.contractorDelayDays > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          ⏱ {order.contractorDelayDays || 0} Days
                        </p>
                      </div>
                    </div>

                    {order.status === "completed" && order.completionNotes && (
                      <div className="mt-4 text-xs text-emerald-700 bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
                        <span className="font-black tracking-widest uppercase text-[9px] block mb-1.5">Resolution Notes</span>
                        <span className="font-bold">{order.completionNotes}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 border-[#0f172a] uppercase tracking-widest bg-white shadow-[2px_2px_0_#0f172a] ${sc.color}`}>
                      {sc.label}
                    </div>
                    
                    {order.status !== "completed" && order.status !== "cancelled" && canComplete && (
                      <button
                        onClick={() => setCompletingOrder(order)}
                        className="w-full px-5 py-3.5 rounded-xl bg-white border-2 border-[#0f172a] text-[#0f172a] hover:bg-emerald-50 hover:text-emerald-700 text-[10px] font-black transition-all shadow-[4px_4px_0_#0f172a] active:translate-y-1 active:translate-x-1 active:shadow-none uppercase tracking-widest"
                      >
                        Close Order
                      </button>
                    )}
                    
                    {canAssign && order.status === "pending" && (
                      <button
                        onClick={() => patch(`/api/tasks/${order._id}/status`, { status: "assigned" }).then(r => r.success && updateOrderInList(r.workOrder))}
                        className="w-full px-5 py-3.5 rounded-xl bg-[#0f172a] hover:bg-blue-600 text-white border-2 border-[#0f172a] text-[10px] font-black transition-all shadow-[4px_4px_0_#2563eb] active:translate-y-1 active:translate-x-1 active:shadow-none uppercase tracking-widest"
                      >
                        Assign Now
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
