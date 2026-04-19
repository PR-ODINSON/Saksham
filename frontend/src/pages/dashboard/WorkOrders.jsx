import { useState, useEffect, useCallback } from "react";
import { get, post, patch } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import CompletionModal from "../../components/common/CompletionModal";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import { useLanguage } from "../../context/LanguageContext";
import { Building, Zap, Wrench, Droplets, Grid, RefreshCw } from 'lucide-react';

const STATUS_STYLE = {
  pending:     { color: "text-slate-700",   bg: "bg-slate-100"   },
  assigned:    { color: "text-blue-700",    bg: "bg-blue-50"     },
  accepted:    { color: "text-blue-700",    bg: "bg-blue-50"     },
  in_progress: { color: "text-amber-700",   bg: "bg-amber-50"    },
  completed:   { color: "text-emerald-700", bg: "bg-emerald-50"  },
  cancelled:   { color: "text-slate-500",   bg: "bg-slate-100"   },
};

const CATEGORY_ICONS = {
  structural: <Building size={16} />,
  electrical: <Zap size={16} />,
  plumbing:   <Wrench size={16} />,
  sanitation: <Droplets size={16} />,
  furniture:  <Grid size={16} />,
};

const CATEGORY_TINT = {
  structural: "bg-slate-100 text-slate-600",
  electrical: "bg-amber-50 text-amber-700",
  plumbing:   "bg-blue-50 text-blue-700",
  sanitation: "bg-cyan-50 text-cyan-700",
  furniture:  "bg-violet-50 text-violet-700",
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
      <div className="max-w-7xl mx-auto pt-8 sm:pt-12 pb-12 px-4 sm:px-8 space-y-6">
        {/* Minimalist header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl text-slate-900">{t('wo.title')}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {user?.role === "contractor" ? t('wo.subtitle.contractor') : t('wo.subtitle.deo')}
            </p>
          </div>
          <button
            onClick={fetchOrders}
            className="h-9 px-3 inline-flex items-center gap-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm self-start sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label={t('wo.total')}     value={orders.length} />
          <StatTile label={t('wo.active')}    value={activeCount}    tone={activeCount > 0 ? "amber" : "muted"} />
          <StatTile label={t('wo.completed')} value={completedCount} tone={completedCount > 0 ? "green" : "muted"} />
          <StatTile label={t('wo.sla')}       value={breachedCount}  tone={breachedCount > 0 ? "red" : "muted"} />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-wrap gap-2 flex-1">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
            >
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="accepted">Accepted</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
            >
              <option value="all">All categories</option>
              {Object.keys(CATEGORY_ICONS).map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-500">
            Showing <span className="text-slate-900 font-medium">{filtered.length}</span> of {orders.length}
          </span>
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">{t('wo.loading')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="px-6 py-16 text-center text-slate-400 text-sm">{t('wo.empty')}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map(order => {
                  const isAssignedToMe = user?.role === "contractor" && order.assignedTo?._id === user.id;
                  const canComplete = isAssignedToMe || canAssign;
                  const stat = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
                  const tint = CATEGORY_TINT[order.category] || "bg-slate-100 text-slate-600";

                  return (
                    <li
                      key={order._id}
                      className="flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Category icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tint}`}>
                        {CATEGORY_ICONS[order.category] || <Building size={16} />}
                      </div>

                      {/* Title block */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base text-slate-900 capitalize truncate">{order.category}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${stat.bg} ${stat.color}`}>
                            {t(`status.${order.status}`)}
                          </span>
                          {order.slaBreach && (
                            <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              SLA breach
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {order.schoolId?.name || t('wo.unknown_node')}
                          <span className="text-slate-300"> · </span>
                          {t('wo.ref')} {order._id.slice(-6).toUpperCase()}
                        </div>
                      </div>

                      {/* Personnel */}
                      <div className="hidden md:flex items-center gap-2 min-w-[140px]">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[11px] text-slate-500 uppercase">
                          {(order.assignedTo?.name || "U")[0]}
                        </div>
                        <span className="text-xs text-slate-600 truncate">
                          {order.assignedTo?.name || t('wo.unassigned')}
                        </span>
                      </div>

                      {/* Deadline */}
                      <div className="hidden sm:flex flex-col items-end pr-2 min-w-[90px]">
                        <span className={`text-sm ${order.slaBreach ? 'text-red-600' : 'text-slate-700'}`}>
                          {order.dueDate
                            ? new Date(order.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
                            : t('wo.na')}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {order.contractorDelayDays > 0
                            ? `+${order.contractorDelayDays} ${t('wo.days')}`
                            : 'on time'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {canAssign && order.status === "pending" && (
                          <button
                            onClick={() =>
                              patch(`/api/tasks/${order._id}/status`, { status: "assigned" })
                                .then(r => r.success && updateOrderInList(r.workOrder))
                            }
                            className="h-9 px-3 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                          >
                            {t('wo.btn.assign')}
                          </button>
                        )}
                        {order.status !== "completed" && order.status !== "cancelled" && canComplete && (
                          <button
                            onClick={() => setCompletingOrder(order)}
                            className="h-9 px-4 rounded-md bg-[#003366] text-white hover:bg-[#002244] transition-colors text-sm"
                          >
                            {t('wo.btn.complete')}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
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

function StatTile({ label, value, tone = "default" }) {
  const tones = {
    default: "text-slate-900",
    muted:   "text-slate-400",
    red:     "text-red-600",
    amber:   "text-amber-600",
    green:   "text-emerald-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-3xl font-semibold mt-1 leading-none ${tones[tone] || tones.default}`}>
        {value}
      </div>
    </div>
  );
}
