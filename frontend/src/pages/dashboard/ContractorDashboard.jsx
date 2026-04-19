import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { get, post, patch, API_BASE } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import MetricCard from "../../components/common/MetricCard";
import PageHeader from "../../components/common/PageHeader";
import CompletionModal from "../../components/common/CompletionModal";
import ViewFeedbackModal from "../../components/common/ViewFeedbackModal";
import {
  Hammer, Wrench, Zap, Building, AlertTriangle, MapPin, Calendar,
  Camera, Cpu, CheckCircle2, X, Clock, ChevronRight, RefreshCw,
  FileText, Phone, User, ImageOff, Shield, Activity, ListChecks,
} from "lucide-react";

const CATEGORY_META = {
  plumbing:   { icon: Wrench,   color: "text-blue-700",    bg: "bg-blue-50",   border: "border-blue-200"   },
  electrical: { icon: Zap,      color: "text-amber-700",   bg: "bg-amber-50",  border: "border-amber-200"  },
  structural: { icon: Building, color: "text-slate-700",   bg: "bg-slate-50",  border: "border-slate-200"  },
  sanitation: { icon: Wrench,   color: "text-emerald-700", bg: "bg-emerald-50",border: "border-emerald-200"},
  furniture:  { icon: Hammer,   color: "text-violet-700",  bg: "bg-violet-50", border: "border-violet-200" },
};

const URGENCY = {
  critical: { color: "text-red-700",     bg: "bg-red-50",     border: "border-red-300",     dot: "bg-red-600",     label: "CRITICAL" },
  high:     { color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-300",  dot: "bg-orange-500",  label: "HIGH"     },
  medium:   { color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-300",   dot: "bg-amber-500",   label: "MEDIUM"   },
  low:      { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", label: "LOW"      },
};

const STATUS_META = {
  pending:     { label: "Pending Acceptance", variant: "info"     },
  assigned:    { label: "Assigned",            variant: "info"     },
  accepted:    { label: "Accepted",            variant: "moderate" },
  in_progress: { label: "In Progress",         variant: "moderate" },
  completed:   { label: "Completed",           variant: "low"      },
  delayed:     { label: "Delayed",             variant: "critical" },
  cancelled:   { label: "Cancelled",           variant: "default"  },
};

function deadlineMeta(deadline) {
  if (!deadline) return { text: "—", variant: "default", days: null };
  const ms = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(ms / 86400000);
  if (days < 0)       return { text: `${Math.abs(days)}d overdue`, variant: "critical", days };
  if (days <= 3)      return { text: `${days}d left`, variant: "critical", days };
  if (days <= 7)      return { text: `${days}d left`, variant: "high",     days };
  if (days <= 14)     return { text: `${days}d left`, variant: "moderate", days };
  return { text: `${days}d left`, variant: "low", days };
}

function urgencyLabelOf(score) {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 30) return "medium";
  return "low";
}

// ─── Task Card ───────────────────────────────────────────────────────────────
function TaskCard({ order, onOpen }) {
  const cm = CATEGORY_META[order.category] || CATEGORY_META.structural;
  const Icon = cm.icon;
  const u = URGENCY[urgencyLabelOf(order.priorityScore || 0)];
  const dl = deadlineMeta(order.deadline);
  const status = STATUS_META[order.status] || STATUS_META.pending;
  const school = order.school || {};

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`bg-white rounded-xl border-2 ${u.border} shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden`}
      onClick={() => onOpen(order)}
    >
      {/* Header strip with urgency color */}
      <div className={`${u.bg} px-5 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold ${u.color} uppercase tracking-widest`}>{u.label}</span>
          <Cpu size={11} className="text-violet-700" />
          <span className="text-[11px] font-bold text-slate-700">{Math.round(order.priorityScore || 0)}/100</span>
        </div>
        <Badge variant={dl.variant} size="sm">
          <Clock size={10} className="mr-1" /> {dl.text}
        </Badge>
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-12 h-12 rounded-lg ${cm.bg} ${cm.border} border flex items-center justify-center flex-shrink-0`}>
            <Icon className={cm.color} size={22} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 truncate">
              {school.name || `School ${order.schoolId}`}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              <MapPin size={10} className="inline mr-1" />
              {[school.block, order.district].filter(Boolean).join(" · ") || "Location pending"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Category</p>
            <p className={`text-[12px] font-bold uppercase ${cm.color}`}>{order.category}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
            <Badge variant={status.variant} size="sm">{status.label}</Badge>
          </div>
          <ChevronRight size={18} className="text-slate-300 ml-2" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Side drawer with full peon submission ───────────────────────────────────
function TaskDetailDrawer({ taskId, onClose, onChanged, onComplete, onViewFeedback }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [activeImg, setActiveImg] = useState(null);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    const res = await get(`/api/tasks/${taskId}/details`);
    if (res.success) setData(res);
    setLoading(false);
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  if (!taskId) return null;

  const wo     = data?.workOrder;
  const school = data?.school;
  const rec    = data?.conditionRecord;
  const lr     = data?.lr;
  const issues = data?.issues || [];
  const photos = data?.photos || [];

  const respond = async (decision) => {
    setActing(true);
    const res = await patch(`/api/tasks/${taskId}/respond`, { decision, scope: "school" });
    setActing(false);
    if (res.success) { onChanged?.(); load(); }
  };

  const advance = async (status) => {
    setActing(true);
    const res = await patch(`/api/work-orders/${taskId}/status`, { status });
    setActing(false);
    if (res.success) { onChanged?.(); load(); }
  };

  const u  = URGENCY[urgencyLabelOf(wo?.priorityScore || 0)] || URGENCY.low;
  const cm = CATEGORY_META[wo?.category] || CATEGORY_META.structural;
  const status = STATUS_META[wo?.status] || STATUS_META.pending;
  const dl = deadlineMeta(wo?.deadline);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-y-auto flex flex-col"
        >
          {/* Header */}
          <div className={`${u.bg} ${u.border} border-b-2 px-6 pt-6 pb-5 sticky top-0 z-10`}>
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={status.variant} size="sm">{status.label}</Badge>
                  <Badge variant="default" size="sm" className={u.color}>
                    {u.label}
                  </Badge>
                  <Badge variant={dl.variant} size="sm">
                    <Clock size={10} className="mr-1" /> {dl.text}
                  </Badge>
                </div>
                <h2 className="text-xl font-bold text-slate-900 truncate">
                  {school?.name || `School ${wo?.schoolId}`}
                </h2>
                <p className="text-[12px] font-bold text-slate-600 mt-0.5 uppercase tracking-wide">
                  <MapPin size={11} className="inline mr-1" />
                  {[school?.block, wo?.district].filter(Boolean).join(" · ")}
                  {school?.location?.lat && (
                    <a
                      href={`https://www.google.com/maps?q=${school.location.lat},${school.location.lng}`}
                      target="_blank" rel="noreferrer"
                      className="ml-2 text-blue-700 underline normal-case"
                    >
                      open in maps
                    </a>
                  )}
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded hover:bg-white/50">
                <X size={18} />
              </button>
            </div>
          </div>

          {loading || !data ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading task details…</div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Category card */}
              <div className={`rounded-lg border ${cm.border} ${cm.bg} p-4 flex items-center gap-3`}>
                <cm.icon className={cm.color} size={28} strokeWidth={2.5} />
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</p>
                  <p className={`text-lg font-bold ${cm.color} uppercase`}>{wo.category}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reported by Peon</p>
                  <p className="text-[12px] font-bold text-slate-800">
                    Week {rec?.weekNumber ?? "—"} · {rec?.createdAt ? new Date(rec.createdAt).toLocaleDateString() : ""}
                  </p>
                </div>
              </div>

              {/* LR analysis */}
              {lr && (
                <div className="rounded-lg border-2 border-violet-200 bg-violet-50/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu size={16} className="text-violet-700" />
                    <h3 className="text-[11px] font-bold text-violet-700 uppercase tracking-widest">
                      Linear-Regression Risk Analysis
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Urgency" value={`${lr.urgencyFactor ?? "—"}/100`} accent="text-violet-700" />
                    <Stat label="Days to Failure" value={lr.daysToFailure != null ? `${lr.daysToFailure}` : "—"} accent="text-slate-800" />
                    <Stat label="P(fail in 30d)" value={lr.fail30Probability != null ? `${(lr.fail30Probability * 100).toFixed(1)}%` : "—"} accent="text-red-600" />
                    <Stat label="P(fail in 60d)" value={lr.fail60Probability != null ? `${(lr.fail60Probability * 100).toFixed(1)}%` : "—"} accent="text-orange-600" />
                  </div>
                  {lr.willFailWithin30Days && (
                    <div className="mt-3 flex items-center gap-2 text-[12px] font-bold text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                      <AlertTriangle size={14} /> LR predicts failure within 30 days — prioritise this work.
                    </div>
                  )}
                </div>
              )}

              {/* What's wrong (issues from the condition record) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks size={16} className="text-slate-600" />
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    What the peon reported
                  </h3>
                </div>
                {issues.length === 0 ? (
                  <p className="text-[12px] italic text-slate-400 px-3 py-2 bg-slate-50 rounded border border-dashed border-slate-200">
                    No structured issue flags were captured — refer to photos and condition score.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {issues.map(i => {
                      const sev = i.severity === "critical" ? "critical"
                              : i.severity === "high"     ? "high"
                              : i.severity === "medium"   ? "moderate" : "low";
                      return (
                        <li key={i.key} className="flex items-center justify-between gap-3 px-3 py-2 bg-white border border-slate-200 rounded">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className="text-slate-400" />
                            <span className="text-[13px] font-semibold text-slate-800">{i.label}</span>
                          </div>
                          <Badge variant={sev} size="sm">{i.severity}</Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {rec && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Condition" value={`${rec.conditionScore ?? "—"}/5`} />
                    <Stat label="Building Age" value={`${rec.buildingAge ?? "—"} y`} />
                    <Stat label="Weather" value={rec.weatherZone || "—"} />
                    <Stat label="Students" value={`${rec.numStudents ?? "—"}`} />
                  </div>
                )}
              </div>

              {/* Photos uploaded by peon */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Camera size={16} className="text-slate-600" />
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    Photos from site ({photos.length})
                  </h3>
                </div>
                {photos.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded border border-dashed border-slate-200">
                    <ImageOff size={20} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-[12px] italic text-slate-400">No photos uploaded by the peon.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {photos.map((src, idx) => {
                      const url = src.startsWith("http") ? src : `${API_BASE}${src}`;
                      return (
                        <button
                          key={idx}
                          onClick={() => setActiveImg(url)}
                          className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-blue-400 transition"
                        >
                          <img src={url} alt={`Site evidence ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Assigned by */}
              {wo.assignment?.assignedBy && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
                  <User size={14} className="text-slate-500" />
                  <p className="text-[12px] font-medium text-slate-600">
                    Assigned by <b className="text-slate-800">{wo.assignment.assignedBy.name}</b>
                    {wo.assignment.assignedBy.role && <span className="uppercase text-[10px] ml-2 text-slate-400">({wo.assignment.assignedBy.role})</span>}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap gap-3">
                {rec?._id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`${API_BASE}/api/reports/${rec._id}/pdf`, "_blank")}
                  >
                    <FileText size={14} className="mr-1.5" /> View Full PDF
                  </Button>
                )}
                {wo.status === "assigned" && (
                  <>
                    <Button variant="ghost" size="sm" disabled={acting} onClick={() => respond("rejected")}>
                      Decline
                    </Button>
                    <Button variant="primary" size="sm" disabled={acting} onClick={() => respond("accepted")}>
                      <CheckCircle2 size={14} className="mr-1.5" /> Accept
                    </Button>
                  </>
                )}
                {wo.status === "accepted" && (
                  <Button variant="primary" size="sm" disabled={acting} onClick={() => advance("in_progress")}>
                    Start Work
                  </Button>
                )}
                {(wo.status === "in_progress" || wo.status === "accepted") && (
                  <Button variant="primary" size="sm" className="ml-auto" onClick={() => onComplete?.(wo)}>
                    <Shield size={14} className="mr-1.5" /> Mark Complete
                  </Button>
                )}
                {wo.status === "completed" && (
                  <Button variant="primary" size="sm" className="ml-auto" onClick={() => onViewFeedback?.(wo)}>
                    <FileText size={14} className="mr-1.5" /> View Feedback
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Lightbox */}
          <AnimatePresence>
            {activeImg && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-6"
                onClick={() => setActiveImg(null)}
              >
                <img src={activeImg} alt="full" className="max-h-full max-w-full rounded shadow-2xl" />
                <button onClick={() => setActiveImg(null)} className="absolute top-6 right-6 text-white p-2">
                  <X size={28} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Stat({ label, value, accent = "text-slate-800" }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-sm font-bold ${accent}`}>{value}</p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ContractorDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active"); // active | completed | all
  const [openId, setOpenId] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [viewingFeedback, setViewingFeedback] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const res = await get("/api/tasks");
    if (res.success) {
      // Enrich each work order with school metadata for the cards
      const woList = res.workOrders || [];
      const ids = [...new Set(woList.map(w => w.schoolId))];
      let schoolsById = new Map();
      if (ids.length) {
        const sRes = await get("/api/schools");
        if (sRes.success) schoolsById = new Map(sRes.schools.map(s => [s.schoolId, s]));
      }
      const enriched = woList.map(w => ({ ...w, school: schoolsById.get(w.schoolId) || null }));
      setOrders(enriched);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = useMemo(() => {
    let list = orders;
    if (filter === "active")    list = orders.filter(o => !["completed", "cancelled"].includes(o.status));
    if (filter === "completed") list = orders.filter(o => o.status === "completed");
    return [...list].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }, [orders, filter]);

  const stats = useMemo(() => ({
    total:       orders.length,
    active:      orders.filter(o => ["pending", "assigned", "accepted", "in_progress"].includes(o.status)).length,
    completed:   orders.filter(o => o.status === "completed").length,
    overdue:     orders.filter(o => o.deadline && new Date(o.deadline) < new Date() && o.status !== "completed").length,
    critical:    orders.filter(o => (o.priorityScore || 0) >= 75 && o.status !== "completed").length,
  }), [orders]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto pt-10 sm:pt-16 pb-12 px-4 sm:px-8 space-y-8">
        <PageHeader
          title="Field Operations Console"
          subtitle={`Welcome, ${user?.name || "Contractor"} — your assigned maintenance tasks, ranked by urgency`}
          icon={Hammer}
          actions={
            <Button variant="outline" size="sm" onClick={fetchOrders} className="border-[#003366] text-[#003366]">
              <RefreshCw size={14} className={loading ? "animate-spin mr-1.5" : "mr-1.5"} /> Refresh
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <MetricCard label="Active Tasks"   value={stats.active}    icon={Activity}      variant="info" />
          <MetricCard label="Critical"       value={stats.critical}  icon={AlertTriangle} variant={stats.critical > 0 ? "critical" : "success"} />
          <MetricCard label="Overdue"        value={stats.overdue}   icon={Clock}         variant={stats.overdue  > 0 ? "critical" : "success"} />
          <MetricCard label="Completed"      value={stats.completed} icon={CheckCircle2}  variant="success" />
        </div>

        {/* Contractor profile snippet */}
        {user && (
          <Card variant="default" className="bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#003366] text-white flex items-center justify-center text-base font-bold">
                {(user.name || "C")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-[12px] text-slate-500">
                  {user.district ? `${user.district} District` : "Contractor"}
                  {user.phone && (
                    <> · <Phone size={10} className="inline" /> {user.phone}</>
                  )}
                </p>
              </div>
              <Badge variant="info" size="sm">Contractor</Badge>
            </div>
          </Card>
        )}

        {/* Filter pills */}
        <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          {[
            { id: "active",    label: `Active (${stats.active})` },
            { id: "completed", label: `Completed (${stats.completed})` },
            { id: "all",       label: `All (${stats.total})` },
          ].map(f => (
            <Button
              key={f.id}
              size="sm"
              variant={filter === f.id ? "primary" : "ghost"}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
          <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Sorted by urgency descending
          </span>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0f172a] rounded-full animate-spin" />
            <p className="text-slate-400 font-bold tracking-[0.2em] text-[12px] uppercase animate-pulse">Loading Tasks…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded border border-slate-200 border-dashed">
            <Hammer size={28} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 font-medium italic text-sm">
              {filter === "active" ? "You have no active tasks. New work orders from the DEO will appear here."
                                   : "No tasks in this view."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(o => (
              <TaskCard key={o._id} order={o} onOpen={(t) => setOpenId(t._id)} />
            ))}
          </div>
        )}
      </div>

      {openId && (
        <TaskDetailDrawer
          taskId={openId}
          onClose={() => setOpenId(null)}
          onChanged={fetchOrders}
          onComplete={(wo) => {
            setOpenId(null);
            setCompleting(wo);
          }}
          onViewFeedback={(wo) => {
            setOpenId(null);
            setViewingFeedback(wo);
          }}
        />
      )}

      {completing && (
        <CompletionModal
          workOrder={completing}
          onDone={() => { fetchOrders(); }}
          onClose={() => setCompleting(null)}
        />
      )}
      
      {viewingFeedback && (
        <ViewFeedbackModal
          workOrder={viewingFeedback}
          onClose={() => setViewingFeedback(null)}
        />
      )}
    </div>
  );
}
