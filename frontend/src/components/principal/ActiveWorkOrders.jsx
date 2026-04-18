import { useState, useEffect } from 'react';
import { get } from '../../services/api';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { Wrench, Phone, Calendar, User, Clock } from 'lucide-react';

export default function ActiveWorkOrders({ schoolId, className }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!schoolId) return;
      // Fetch all non-completed work orders for this school
      const res = await get(`/api/tasks?schoolId=${schoolId}`);
      if (res.success) {
        setOrders(res.workOrders.filter(o => ['assigned', 'accepted', 'in_progress'].includes(o.status)));
      }
      setLoading(false);
    };
    fetchOrders();
  }, [schoolId]);

  if (loading) return <div className={`h-48 flex items-center justify-center bg-white rounded-lg animate-pulse border border-slate-200 ${className}`}>Retrieving Work Stream...</div>;

  return (
    <Card variant="gov" className={className} title="Contractor Work Logs" icon={Wrench} subtitle="Real-time monitoring of assigned on-site repairs">
      <div className="space-y-4 mt-2">
        {orders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium text-sm italic bg-slate-50/50 rounded border border-dashed border-slate-200">
            No active work orders currently in field operation.
          </div>
        ) : (
          orders.map(o => (
            <div key={o._id} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${o.status === 'in_progress' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-800">{o.category} REPAIR</span>
                </div>
                <Badge variant={o.status === 'in_progress' ? 'success' : 'info'} size="sm">
                  {o.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Assigned Agent</p>
                    <p className="text-[13px] font-bold text-slate-800">{o.assignment?.assignedTo?.name || 'Awaiting acceptance'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Contact Channel</p>
                    <p className="text-[13px] font-bold text-slate-800">{o.assignment?.assignedTo?.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Contractual Deadline</p>
                    <p className="text-[13px] font-bold text-slate-800">{new Date(o.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Time Elapsed</p>
                    <p className="text-[13px] font-bold text-slate-800">{Math.round((new Date() - new Date(o.createdAt)) / (1000 * 60 * 60 * 24))} Days</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
