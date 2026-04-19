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
      <div className="mt-4 -mx-6">
        {orders.length === 0 ? (
          <div className="mx-6 py-12 text-center text-slate-400 font-medium text-sm italic bg-slate-50/50 rounded border border-dashed border-slate-200">
            No active work orders currently in field operation.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ref ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Repair Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Agent</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Issued On</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Elapsed</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(o => {
                  const priority = o.priorityScore >= 75 ? 'critical' : o.priorityScore >= 50 ? 'high' : 'medium';
                  return (
                    <tr key={o._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <span className="text-sm font-mono font-medium text-slate-400">#{o._id.slice(-6).toUpperCase()}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${o.status === 'in_progress' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="text-sm font-bold text-slate-900 capitalize">{o.category} Repair</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <Badge variant={priority === 'critical' ? 'critical' : priority === 'high' ? 'high' : 'info'} size="sm" className="font-bold text-[10px] px-2.5 py-0.5">
                          {priority.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                            <User size={14} className="text-slate-500" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{o.assignment?.assignedTo?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-slate-600 text-sm">
                        {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                          <Calendar size={14} />
                          <span>
                            {new Date(o.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                          <Clock size={14} />
                          <span className="font-bold text-slate-800">
                            {Math.round((new Date() - new Date(o.createdAt)) / (1000 * 60 * 60 * 24))}d
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Badge variant={o.status === 'in_progress' ? 'success' : 'info'} size="sm" className="font-bold text-[10px] px-2.5 py-0.5">
                          {o.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
