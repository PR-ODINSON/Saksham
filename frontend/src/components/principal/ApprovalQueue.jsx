import { useState, useEffect } from 'react';
import { get, patch } from '../../services/api';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { ShieldCheck, XCircle, Clock, AlertTriangle } from 'lucide-react';

export default function ApprovalQueue({ schoolId, className }) {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDecisions = async () => {
    if (!schoolId) return;
    const res = await get(`/api/maintenance/decisions?schoolId=${schoolId}&status=pending`);
    if (res.success) {
      setDecisions(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDecisions();
  }, [schoolId]);

  const handleStatusChange = async (id, newStatus) => {
    const res = await patch(`/api/maintenance/decisions/${id}`, { status: newStatus });
    if (res.success) {
      setDecisions(decisions.filter(d => d._id !== id));
    }
  };

  if (loading) return <div className={`h-48 flex items-center justify-center bg-white rounded-lg border border-slate-200 animate-pulse ${className}`}>Scanning Decision Engine...</div>;

  return (
    <Card variant="gov" className={className} title="Administrative Approvals" icon={ShieldCheck} subtitle="Review of machine-generated maintenance recommendations">
      <div className="space-y-4 mt-2">
        {decisions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium text-sm italic bg-slate-50/50 rounded border border-dashed border-slate-200">
            No pending maintenance decisions for this node.
          </div>
        ) : (
          decisions.map(d => (
            <div key={d._id} className="p-5 bg-white border border-slate-200 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:ring-2 hover:ring-blue-100 transition-all">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full flex items-center justify-center ${d.category === 'structural' ? 'bg-red-50 text-red-600' : d.category === 'electrical' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-black uppercase tracking-widest text-slate-900">{d.category} Repair</span>
                    <Badge variant={d.decision.priorityLevel === 'urgent' ? 'critical' : 'high'} size="sm">
                      {d.decision.priorityLevel}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 font-medium line-clamp-1">ML score: {d.decision.computedPriorityScore} · Students at risk: {d.impact.studentsAffected}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {d.explainability.reasons.slice(0, 2).map((r, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleStatusChange(d._id, 'declined')}
                  className="flex-1 md:flex-none text-red-600 hover:bg-red-50"
                >
                  <XCircle size={14} className="mr-1.5" /> Decline
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => handleStatusChange(d._id, 'approved')}
                  className="flex-1 md:flex-none"
                >
                  <ShieldCheck size={14} className="mr-1.5" /> Approve
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
