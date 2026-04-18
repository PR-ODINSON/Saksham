import { useState, useEffect, useCallback } from "react";
import { get, post, patch } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import CompletionModal from "../../components/common/CompletionModal";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import MetricCard from "../../components/common/MetricCard";
import PageHeader from "../../components/common/PageHeader";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import { Building, Zap, Wrench, Droplets, Grid, Hammer, Clock, Shield, ChevronDown } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "text-slate-600", border: "border-slate-300" },
  assigned: { label: "Assigned", color: "text-blue-700", border: "border-blue-400" },
  in_progress: { label: "In Progress", color: "text-amber-700", border: "border-amber-400" },
  completed: { label: "Completed", color: "text-emerald-700", border: "border-emerald-400" },
  cancelled: { label: "Cancelled", color: "text-slate-500", border: "border-slate-300" },
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card
        title="Formulate Maintenance Directive"
        className="w-full max-w-xl"
        noPadding
      >
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <Badge variant="critical" className="w-full justify-center py-2">{error}</Badge>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Select
                label="Target Infrastructure Node"
                value={form.schoolId}
                onChange={e => setForm({ ...form, schoolId: e.target.value })}
                required
                options={schools.map(s => ({ value: s._id, label: s.name || s.schoolId }))}
                placeholder="Select node..."
              />
            </div>
            <Select
              label="Assigned Category"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              options={Object.keys(CATEGORY_ICONS).map(k => ({ value: k, label: k.charAt(0).toUpperCase() + k.slice(1) }))}
            />
            <Select
              label="Operational Priority"
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              options={[
                { value: "critical", label: "Critical" },
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" }
              ]}
            />
            <div className="md:col-span-2">
              <Input
                label="Objective Description"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                required
                placeholder="Detailed scope of work..."
              />
            </div>
            <Select
              label="Designated Personnel"
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              options={contractors.map(c => ({ value: c._id, label: c.name }))}
              placeholder="Unassigned"
            />
            <Input
              label="Compliance Deadline"
              type="date"
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="ghost" onClick={onClose} className="flex-1">Discard</Button>
            <Button type="submit" variant="primary" isLoading={saving} className="flex-1">Authorize Directive</Button>
          </div>
        </form>
      </Card>
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
  const [categoryFilter, setCategoryFilter] = useState("all");
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
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    const res = await get(`/api/tasks?${params}`);
    if (res.success) setOrders(res.workOrders);
    setLoading(false);
  }, [statusFilter, categoryFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { get("/api/schools").then(d => d.success && setSchools(d.schools)); }, []);

  useEffect(() => {
    if (prefill.schoolId && canAssign) setShowNew(true);
  }, []);

  const updateOrderInList = (updated) => {
    setOrders(orders.map(o => o._id === updated._id ? updated : o));
  };

  const filtered = orders.filter(o => {
    const sMatch = statusFilter === "all" || o.status === statusFilter;
    const cMatch = categoryFilter === "all" || o.category === categoryFilter;
    return sMatch && cMatch;
  });
  const breachedCount = orders.filter(o => o.slaBreach).length;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto pt-8 sm:pt-12 pb-12 px-4 sm:px-8 space-y-8">
        <PageHeader
          title="Infrastructure Directives"
          subtitle={user?.role === "contractor" ? "Allocated Tasks Requiring Operational Resolution" : "Operational Oversight of District-wide Maintenance Assignments"}
          icon={Hammer}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              <div className="relative">
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-[#003366] text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 pr-10 rounded-lg outline-none focus:border-blue-900 transition-all shadow-sm cursor-pointer"
                >
                  <option value="all">ALL CATEGORIES</option>
                  <option value="structural">STRUCTURAL</option>
                  <option value="plumbing">PLUMBING</option>
                  <option value="electrical">ELECTRICITY</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-[#003366] text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 pr-10 rounded-lg outline-none focus:border-blue-900 transition-all shadow-sm cursor-pointer"
                >
                  {["all", "pending", "assigned", "in_progress", "completed"].map(s => (
                    <option key={s} value={s}>
                      {s === "all" ? "ALL REGISTRY" : (STATUS_CONFIG[s]?.label || s).toUpperCase()} 
                      ({s === "all" ? orders.length : orders.filter(o => o.status === s).length})
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>

              {canAssign && (
                <Button onClick={() => setShowNew(true)} variant="primary" className="text-[10px] font-bold uppercase tracking-widest">
                  New Directive
                </Button>
              )}
            </div>
          }
        />

        {breachedCount > 0 && (
          <MetricCard
            label="SLA Compliance Alert"
            value={breachedCount}
            variant="critical"
            trendValue="Directives exceeding authorized timelines"
            icon={Clock}
          />
        )}


        {/* Orders list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0f172a] rounded-full animate-spin" />
            <p className="text-slate-400 font-black tracking-[0.2em] text-[12px] uppercase animate-pulse">Syncing Registry...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded border border-slate-200 border-dashed">
            <p className="text-slate-400 font-medium italic text-sm">No matching work orders found in the registry.</p>
          </div>
        ) : (
          <Card noPadding className="border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Type</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Asset Location</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Personnel</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Deadline</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Offset</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(order => {
                    const sc = STATUS_CONFIG[order.status];
                    const isAssignedToMe = user?.role === "contractor" && order.assignedTo?._id === user.id;
                    const canComplete = isAssignedToMe || canAssign;

                    return (
                      <tr key={order._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                              order.status === 'completed' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                              order.status === 'in_progress' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                              'bg-slate-50 border-slate-100 text-slate-400'
                            }`}>
                              {CATEGORY_ICONS[order.category] || <Wrench size={16} />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 uppercase text-[11px] tracking-tight">{order.category}</p>
                              <p className="text-[9px] font-medium text-slate-400">REF: {order._id.slice(-6).toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[12px] font-semibold text-slate-700">{order.schoolId?.name || "Unknown Node"}</p>
                          <p className="text-[10px] text-slate-400">{order.schoolId?.schoolId}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                              {(order.assignedTo?.name || "U")[0]}
                            </div>
                            <p className="text-[12px] font-medium text-slate-600">{order.assignedTo?.name || "Unassigned"}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className={`text-[12px] font-bold ${order.slaBreach ? 'text-red-600' : 'text-slate-700'}`}>
                              {order.dueDate ? new Date(order.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : 'NA'}
                            </span>
                            {order.slaBreach && <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">SLA Breach</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant={order.contractorDelayDays > 0 ? "critical" : "low"} 
                            size="sm"
                            className="font-bold"
                          >
                            {order.contractorDelayDays || 0} DAYS
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant={order.status === 'completed' ? 'low' : order.status === 'in_progress' ? 'moderate' : 'info'} 
                            size="sm"
                            className="font-bold uppercase tracking-widest text-[9px]"
                          >
                            {sc.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {canAssign && order.status === "pending" && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => patch(`/api/tasks/${order._id}/status`, { status: "assigned" }).then(r => r.success && updateOrderInList(r.workOrder))}
                                className="text-[9px] font-bold uppercase tracking-widest px-3 py-1"
                              >
                                Assign
                              </Button>
                            )}
                            {order.status !== "completed" && order.status !== "cancelled" && canComplete && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setCompletingOrder(order)}
                                className="text-[9px] font-bold uppercase tracking-widest px-4 py-1 bg-[#003366]"
                              >
                                Authorize Closure
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
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
    </div>
  );
}
