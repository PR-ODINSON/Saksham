import { useState, useEffect, useCallback, useRef } from "react";
import { get, post, patch } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import CompletionModal from "../../components/common/CompletionModal";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import MetricCard from "../../components/common/MetricCard";
import PageHeader from "../../components/common/PageHeader";
import Select from "../../components/common/Select";
import Input from "../../components/common/Input";
import useSocket from "../../hooks/useSocket";
import { Building, Zap, Wrench, Droplets, Grid, Hammer, Clock, Shield, CheckCircle, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  pending:     { label: "Pending",     color: "text-slate-600" },
  assigned:    { label: "Assigned",    color: "text-blue-700" },
  accepted:    { label: "Accepted",    color: "text-teal-700" },
  in_progress: { label: "In Progress", color: "text-amber-700" },
  completed:   { label: "Completed",   color: "text-emerald-700" },
  cancelled:   { label: "Cancelled",   color: "text-slate-500" },
};

const PRIORITY_CONFIG = {
  critical: "bg-red-50 text-red-700 border-red-300",
  high:     "bg-orange-50 text-orange-700 border-orange-300",
  medium:   "bg-amber-50 text-amber-700 border-amber-300",
  low:      "bg-slate-50 text-slate-700 border-slate-300",
};

const CATEGORY_ICONS = {
  structural: <Building size={20} strokeWidth={2.5} />, 
  electrical: <Zap size={20} strokeWidth={2.5} />, 
  plumbing:   <Wrench size={20} strokeWidth={2.5} />, 
  sanitation: <Droplets size={20} strokeWidth={2.5} />, 
  furniture:  <Grid size={20} strokeWidth={2.5} />,
};

// ─── Accept modal ─────────────────────────────────────────────────────────────
function AcceptModal({ order, onAccepted, onClose }) {
  const [scope, setScope] = useState('school');
  const [note, setNote]   = useState('');
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    setSaving(true);
    const res = await patch(`/api/tasks/${order._id}/respond`, { decision: 'accepted', scope, note });
    setSaving(false);
    if (res.success) onAccepted(order._id, scope);
    onClose();
  };

  return (
    <div className="mt-3 p-4 bg-teal-50 border border-teal-200 rounded space-y-3">
      <p className="text-xs font-bold text-teal-800 uppercase tracking-widest">Accept scope:</p>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input type="radio" name="scope" value="school" checked={scope === 'school'} onChange={() => setScope('school')} />
          This school only
        </label>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input type="radio" name="scope" value="district" checked={scope === 'district'} onChange={() => setScope('district')} />
          All schools in this district
        </label>
      </div>
      <textarea
        rows={2}
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Optional note..."
        className="w-full text-sm border border-teal-200 rounded p-2 outline-none focus:ring-1 focus:ring-teal-400 resize-none"
      />
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" isLoading={saving} onClick={confirm}>Confirm</Button>
      </div>
    </div>
  );
}

// ─── Reject modal ─────────────────────────────────────────────────────────────
function RejectModal({ order, onRejected, onClose }) {
  const [note, setNote]   = useState('');
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    setSaving(true);
    const res = await patch(`/api/tasks/${order._id}/respond`, { decision: 'rejected', note });
    setSaving(false);
    if (res.success) onRejected(order._id);
    onClose();
  };

  return (
    <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded space-y-3">
      <p className="text-sm font-medium text-red-800">Reject this work order?</p>
      <textarea
        rows={2}
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Optional reason..."
        className="w-full text-sm border border-red-200 rounded p-2 outline-none focus:ring-1 focus:ring-red-400 resize-none"
      />
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="danger" size="sm" isLoading={saving} onClick={confirm}>Reject</Button>
      </div>
    </div>
  );
}

// ─── New Work Order Form ──────────────────────────────────────────────────────
function NewWorkOrderPanel({ prefill, onCreated, onClose, schools }) {
  const [form, setForm] = useState({
    schoolId:     prefill.schoolId || "",
    category:     prefill.category || "structural",
    subCategory:  "",
    description:  "",
    priority:     prefill.score >= 76 ? "critical" : prefill.score >= 51 ? "high" : "medium",
    estimatedDays:"",
    riskScore:    prefill.score || "",
    dueDate:      "",
  });
  const [contractors, setContractors] = useState([]);
  const [assignedTo, setAssignedTo]   = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    // Phase 10 fix: use /api/users/contractors instead of /api/admin/users
    get("/api/users/contractors").then(d => {
      if (d.success) setContractors(d.contractors);
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
                { value: "high",     label: "High" },
                { value: "medium",   label: "Medium" },
                { value: "low",      label: "Low" }
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
  const { user }         = useAuth();
  const socket           = useSocket();
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();
  const [orders, setOrders]           = useState([]);
  const [schools, setSchools]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew]         = useState(false);
  const [completingOrder, setCompletingOrder] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const newBadgeTimers = useRef({});

  const prefill = {
    schoolId: searchParams.get("schoolId") || "",
    category: searchParams.get("category") || "",
    score:    Number(searchParams.get("score")) || 0,
    school:   searchParams.get("school") || "",
  };

  const canAssign = ["deo", "admin"].includes(user?.role);
  const isContractor = user?.role === "contractor";

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

  // Socket: new assignment for contractor
  useEffect(() => {
    if (!socket || !isContractor) return;
    const handler = ({ task }) => {
      if (!task) return;
      const enriched = { ...task, _isNew: true };
      setOrders(prev => [enriched, ...prev]);
      // Remove "new" badge after 5 seconds
      const t = setTimeout(() => {
        setOrders(prev => prev.map(o => o._id === enriched._id ? { ...o, _isNew: false } : o));
      }, 5000);
      newBadgeTimers.current[enriched._id] = t;
    };
    socket.on('task:assigned', handler);
    return () => {
      socket.off('task:assigned', handler);
      Object.values(newBadgeTimers.current).forEach(clearTimeout);
    };
  }, [socket, isContractor]);

  const updateOrderInList = (updated) => {
    setOrders(prev => prev.map(o => o._id === updated._id ? updated : o));
  };

  const handleAccepted = (orderId, scope) => {
    if (scope === 'district') {
      fetchOrders();
    } else {
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'accepted' } : o));
    }
  };

  const handleRejected = (orderId) => {
    setOrders(prev => prev.filter(o => o._id !== orderId));
  };

  const filtered    = orders.filter(o => statusFilter === "all" || o.status === statusFilter);
  const breachedCount = orders.filter(o => o.slaBreach).length;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <PageHeader 
        title="Infrastructure Directives"
        subtitle={isContractor ? "Allocated tasks requiring operational resolution" : "Operational oversight of district-wide maintenance assignments"}
        icon={Hammer}
        actions={
          canAssign && (
            <Button onClick={() => setShowNew(true)} variant="primary">
              Authorize Directive
            </Button>
          )
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

      {/* Status filter tabs */}
      <div className="flex border-b border-slate-200">
        {["all", "pending", "assigned", "accepted", "in_progress", "completed"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-6 py-4 text-[10px] font-bold tracking-widest transition-all border-b-2 -mb-px flex items-center gap-2 ${
              statusFilter === s 
                ? "border-blue-900 text-blue-900 bg-blue-50/30" 
                : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
            }`}
          >
            {s === "all" ? "ALL REGISTRY" : STATUS_CONFIG[s]?.label.toUpperCase()}
            <Badge variant={statusFilter === s ? "info" : "default"} size="sm" className="ml-2">
              {s === "all" ? orders.length : orders.filter(o => o.status === s).length}
            </Badge>
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
        <div className="text-center py-20 bg-white rounded border border-slate-200 border-dashed">
          <p className="text-slate-400 font-medium italic text-sm">No matching work orders found in the registry.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filtered.map(order => {
            const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const assignedToId = order.assignment?.assignedTo?._id || order.assignment?.assignedTo;
            const isAssignedToMe = isContractor && assignedToId?.toString() === user.id;
            const canComplete    = isAssignedToMe || canAssign;
            const canRespond     = isContractor && ['assigned', 'pending'].includes(order.status) && isAssignedToMe;

            return (
              <Card 
                key={order._id}
                className={order.slaBreach ? 'border-red-200' : ''}
                noPadding
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 p-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-4">
                      <div className="w-10 h-10 rounded bg-slate-900 border border-slate-700 text-white flex items-center justify-center">
                        {CATEGORY_ICONS[order.category] || <Wrench size={20} />}
                      </div>
                      <span className="font-bold text-slate-900 uppercase text-lg tracking-tight">{order.category}</span>
                      <Badge variant={order.priority === 'critical' || order.priority === 'high' ? 'high' : 'default'} size="lg">
                        {order.priority}
                      </Badge>
                      {order.slaBreach && <Badge variant="critical" size="lg">SLA Breach</Badge>}
                      {order._isNew && (
                        <Badge variant="info" size="lg" className="animate-pulse">New Assignment</Badge>
                      )}
                    </div>
                    
                    <p className="text-slate-600 text-sm mb-6 leading-relaxed font-medium">{order.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-lg border border-slate-100">
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Asset Location</p>
                        <p className="text-xs text-slate-900 truncate font-bold">{order.schoolId?.name || "Unknown Node"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Designated Personnel</p>
                        <p className="text-xs text-slate-900 font-bold">{order.assignment?.assignedTo?.name || "Unassigned"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Authorized Deadline</p>
                        <p className={`text-xs font-bold ${order.slaBreach ? 'text-red-600' : 'text-slate-900'}`}>
                          {order.deadline ? new Date(order.deadline).toLocaleDateString() : 'Unscheduled'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Temporal Delay</p>
                        <p className={`text-xs font-bold ${order.contractorDelayDays > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                          {order.contractorDelayDays || 0} Days
                        </p>
                      </div>
                    </div>

                    {order.status === "completed" && order.completionNotes && (
                      <div className="mt-4 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-100 p-4 rounded">
                        <span className="text-[9px] font-bold uppercase tracking-widest block mb-1 opacity-60">Resolution Summary</span>
                        {order.completionNotes}
                      </div>
                    )}

                    {/* Accept / Reject panels */}
                    {acceptingId === order._id && (
                      <AcceptModal
                        order={order}
                        onAccepted={handleAccepted}
                        onClose={() => setAcceptingId(null)}
                      />
                    )}
                    {rejectingId === order._id && (
                      <RejectModal
                        order={order}
                        onRejected={handleRejected}
                        onClose={() => setRejectingId(null)}
                      />
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <Badge variant={order.status === 'completed' ? 'low' : order.status === 'in_progress' ? 'moderate' : 'info'} size="lg">
                      {sc.label}
                    </Badge>

                    {/* Contractor: Accept / Reject buttons */}
                    {canRespond && order.status !== 'accepted' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setAcceptingId(order._id); setRejectingId(null); }}
                          className="w-full"
                        >
                          <CheckCircle size={14} className="mr-1 text-teal-600" /> Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setRejectingId(order._id); setAcceptingId(null); }}
                          className="w-full"
                        >
                          <XCircle size={14} className="mr-1 text-red-500" /> Reject
                        </Button>
                      </>
                    )}
                    
                    {order.status !== "completed" && order.status !== "cancelled" && canComplete && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setCompletingOrder(order)}
                        className="w-full"
                      >
                        Authorize Closure
                      </Button>
                    )}
                    
                    {canAssign && order.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => patch(`/api/tasks/${order._id}/status`, { status: "assigned" }).then(r => r.success && updateOrderInList(r.workOrder))}
                        className="w-full"
                      >
                        Assign Task
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
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
