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
import { useLanguage } from "../../context/LanguageContext";
import { Building, Zap, Wrench, Droplets, Grid, Hammer, Clock, Shield, ChevronDown } from 'lucide-react';



const PRIORITY_CONFIG = {
  critical: "bg-red-50 text-red-700 border-red-300",
  high: "bg-orange-50 text-orange-700 border-orange-300",
  medium: "bg-amber-50 text-amber-700 border-amber-300",
  low: "bg-slate-50 text-slate-700 border-slate-300",
};

const STATUS_CONFIG = {
  pending: { color: "text-slate-600", border: "border-slate-300" },
  assigned: { color: "text-blue-700", border: "border-blue-400" },
  in_progress: { color: "text-amber-700", border: "border-amber-400" },
  completed: { color: "text-emerald-700", border: "border-emerald-400" },
  cancelled: { color: "text-slate-500", border: "border-slate-300" },
};

const CATEGORY_ICONS = {
  structural: <Building size={20} strokeWidth={2.5} />,
  electrical: <Zap size={20} strokeWidth={2.5} />,
  plumbing: <Wrench size={20} strokeWidth={2.5} />,
  sanitation: <Droplets size={20} strokeWidth={2.5} />,
  furniture: <Grid size={20} strokeWidth={2.5} />,
};


// ─── New Work Order Form ──────────────────────────────────────────────────────
function NewWorkOrderPanel({ prefill, onCreated, onClose, schools, t }) {
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
        title={t('wo.form.title')}
        className="w-full max-w-xl"
        noPadding
      >
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <Badge variant="critical" className="w-full justify-center py-2">{error}</Badge>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Select
                label={t('wo.form.target_node')}
                value={form.schoolId}
                onChange={e => setForm({ ...form, schoolId: e.target.value })}
                required
                options={schools.map(s => ({ value: s._id, label: s.name || s.schoolId }))}
                placeholder={t('wo.form.select_node')}
              />
            </div>
            <Select
              label={t('wo.form.assigned_category')}
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              options={Object.keys(CATEGORY_ICONS).map(k => ({ value: k, label: k.charAt(0).toUpperCase() + k.slice(1) }))}
            />
            <Select
              label={t('wo.form.operational_priority')}
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              options={[
                { value: "critical", label: t('priority.critical') },
                { value: "high", label: t('priority.high') },
                { value: "medium", label: t('priority.medium') },
                { value: "low", label: t('priority.low') }
              ]}
            />
            <div className="md:col-span-2">
              <Input
                label={t('wo.form.objective_desc')}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                required
                placeholder={t('wo.form.detailed_scope')}
              />
            </div>
            <Select
              label={t('wo.form.designated_personnel')}
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              options={contractors.map(c => ({ value: c._id, label: c.name }))}
              placeholder={t('wo.form.unassigned')}
            />
            <Input
              label={t('wo.form.compliance_deadline')}
              type="date"
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="ghost" onClick={onClose} className="flex-1">{t('wo.form.discard')}</Button>
            <Button type="submit" variant="primary" isLoading={saving} className="flex-1">{t('wo.form.authorize')}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WorkOrders() {
  const { user } = useAuth();
  const { t } = useLanguage();
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

  const filtered = orders.filter(o => statusFilter === "all" || o.status === statusFilter);
  const districtStr = user?.district || "District";
  const imgIndex = (districtStr.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 10;

  const breachedCount = orders.filter(o => o.slaBreach).length;


  const activeCount = orders.filter(o => ['pending', 'assigned', 'in_progress'].includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Massive Hero Banner */}
      <div className="relative w-full h-[400px] bg-slate-900">
        <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1200&auto=format&fit=crop" alt="Directives Banner" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute bottom-24 left-0 right-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-md">
                {t('wo.title')}
              </h1>
              <p className="mt-2 text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Hammer size={14} /> {user?.role === "contractor" ? t('wo.subtitle.contractor') : t('wo.subtitle.deo')}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {canAssign && (
                <Button onClick={() => setShowNew(true)} variant="secondary" className="font-bold uppercase tracking-widest text-[10px] bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md shadow-xl">
                  {t('wo.auth_btn')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-8 pb-12">
        {/* REPORT METRICS - Floating Over Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 -mt-16 relative z-10">
          <MetricCard
            label={t('wo.total')}
            value={orders.length}
            variant="info"
            icon={Hammer}
          />
          <MetricCard
            label={t('wo.active')}
            value={activeCount}
            variant="high"
            icon={Clock}
          />
          <MetricCard
            label={t('wo.completed')}
            value={completedCount}
            variant="success"
            icon={Shield}
          />
          <MetricCard
            label={t('wo.sla')}
            value={breachedCount}
            variant={breachedCount > 0 ? "critical" : "default"}
            icon={breachedCount > 0 ? Clock : Shield}
          />
        </div>


        {/* Orders list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0f172a] rounded-full animate-spin" />
            <p className="text-slate-400 font-bold tracking-[0.2em] text-[12px] uppercase animate-pulse">{t('wo.loading')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded border border-slate-200 border-dashed">
            <p className="text-slate-400 font-medium italic text-sm">{t('wo.empty')}</p>
          </div>
        ) : (
          <Card noPadding className="border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{t('wo.th.type')}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{t('wo.th.location')}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{t('wo.th.personnel')}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{t('wo.th.deadline')}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{t('wo.th.offset')}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{t('wo.th.status')}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] text-right">{t('wo.th.actions')}</th>
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
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${order.status === 'completed' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                order.status === 'in_progress' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                              {CATEGORY_ICONS[order.category]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 uppercase text-[11px] tracking-tight">{order.category}</p>
                              <p className="text-[9px] font-medium text-slate-400">{t('wo.ref')} {order._id.slice(-6).toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[12px] font-semibold text-slate-700">{order.schoolId?.name || t('wo.unknown_node')}</p>
                          <p className="text-[10px] text-slate-400">{order.schoolId?.schoolId}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                              {(order.assignedTo?.name || "U")[0]}
                            </div>
                            <p className="text-[12px] font-medium text-slate-600">{order.assignedTo?.name || t('wo.unassigned')}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className={`text-[12px] font-bold ${order.slaBreach ? 'text-red-600' : 'text-slate-700'}`}>
                              {order.dueDate ? new Date(order.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : t('wo.na')}
                            </span>
                            {order.slaBreach && <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest">{t('wo.breach_badge')}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant={order.contractorDelayDays > 0 ? "critical" : "low"} 
                            size="sm"
                            className="font-bold"
                          >
                            {order.contractorDelayDays || 0} {t('wo.days')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant={order.status === 'completed' ? 'low' : order.status === 'in_progress' ? 'moderate' : 'info'} 
                            size="sm"
                            className="font-bold uppercase tracking-widest text-[9px]"
                          >
                            {t(`status.${order.status}`)}
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
                                {t('wo.btn.assign')}
                              </Button>
                            )}
                            {order.status !== "completed" && order.status !== "cancelled" && canComplete && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setCompletingOrder(order)}
                                className="text-[9px] font-bold uppercase tracking-widest px-4 py-1 bg-[#003366]"
                              >
                                {t('wo.btn.complete')}
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
            t={t}
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
