import { useEffect, useMemo, useState } from "react";
import { get, post } from "../../services/api";
import Card from "../common/Card";
import Button from "../common/Button";
import Badge from "../common/Badge";
import Select from "../common/Select";
import Input from "../common/Input";
import { X, UserCog, AlertTriangle, CheckCircle2, Calendar, Cpu } from "lucide-react";

/**
 * Suggest a deadline based on LR urgency:
 * critical → 7 days, high → 14 days, medium → 30 days, low → 60 days.
 */
function defaultDeadline(urgencyLabel) {
  const days = urgencyLabel === "critical" ? 7
            :  urgencyLabel === "high"     ? 14
            :  urgencyLabel === "medium"   ? 30 : 60;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function AssignContractorModal({ bundle, onClose, onAssigned }) {
  const [contractors, setContractors] = useState([]);
  const [contractorId, setContractorId] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadline(bundle?.urgencyLabel || "medium"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    get("/api/users/contractors").then(d => {
      if (d.success) setContractors(d.contractors);
    });
  }, []);

  const categories = useMemo(
    () => (bundle?.categories || []).map(c => ({
      _id: c._id,
      category: c.category,
      priorityScore: Math.round(c.lrUrgencyFactor ?? c.priorityScore ?? 0),
    })),
    [bundle]
  );

  const handleAssign = async () => {
    if (!contractorId) { setError("Select a contractor"); return; }
    if (!deadline)     { setError("Select a deadline");   return; }
    setError(""); setSaving(true);

    try {
      const results = await Promise.all(categories.map(c =>
        post("/api/tasks/assign", {
          schoolId:      bundle.schoolId,
          district:      bundle.district,
          category:      c.category,
          priorityScore: c.priorityScore,
          deadline,
          assignedTo:    contractorId,
        })
      ));
      const failed = results.filter(r => !r.success);
      if (failed.length) {
        setError(`Assigned ${results.length - failed.length}/${results.length} — ${failed[0].message || "some failed"}`);
      } else {
        setDone(true);
        setTimeout(() => { onAssigned?.(); onClose(); }, 900);
      }
    } catch (e) {
      setError(e.message || "Assignment failed");
    } finally {
      setSaving(false);
    }
  };

  if (!bundle) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <Card title={`Assign Contractor · Week ${bundle.weekNumber}`} subtitle={bundle.schoolName} icon={UserCog} className="w-full max-w-xl" noPadding>
        <div className="p-6 space-y-5">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded hover:bg-slate-100">
            <X size={16} />
          </button>

          {/* Bundle summary */}
          <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bundle Urgency</span>
              <Badge variant={bundle.urgencyLabel === "critical" ? "critical" : bundle.urgencyLabel === "high" ? "high" : "default"} size="sm">
                {(bundle.urgencyLabel || "low").toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Cpu size={14} className="text-violet-700" />
                <span className="text-2xl font-black text-slate-800">{bundle.maxUrgency}<span className="text-xs text-slate-400">/100</span></span>
              </div>
              {bundle.willFailWithin30Days && (
                <Badge variant="critical" size="sm">
                  <AlertTriangle size={10} className="mr-1" /> 30-day failure
                </Badge>
              )}
              <span className="text-[11px] text-slate-500 font-medium">
                Worst category · <b className="uppercase">{bundle.worstCategory}</b>
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200">
              {categories.map(c => (
                <Badge key={c._id} variant="default" size="sm">
                  {c.category} · {c.priorityScore}
                </Badge>
              ))}
            </div>
          </div>

          {/* Contractor select */}
          <Select
            label="Contractor"
            value={contractorId}
            onChange={e => setContractorId(e.target.value)}
            options={contractors.map(c => ({
              value: c._id,
              label: c.phone ? `${c.name} · ${c.phone}` : c.name,
            }))}
            placeholder="Select contractor…"
          />

          {/* Deadline */}
          <Input
            label={<><Calendar size={12} className="inline mr-1" /> Deadline (auto-suggested by urgency)</>}
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
          />

          {error && (
            <div className="text-[12px] font-bold text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
          {done && (
            <div className="text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 flex items-center gap-2">
              <CheckCircle2 size={14} /> {categories.length} task{categories.length === 1 ? "" : "s"} assigned successfully.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button variant="primary" isLoading={saving} disabled={done} onClick={handleAssign} className="flex-1">
              Assign {categories.length} task{categories.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
