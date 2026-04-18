import { useState, useEffect } from 'react';
import { get } from '../../services/api';
import Card from '../common/Card';
import { CheckSquare, Info } from 'lucide-react';

export default function AuditCompliance({ schoolId, className }) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!schoolId) return;
      const res = await get(`/api/reports/stats?schoolId=${schoolId}`);
      if (res.success) {
        setStats(res.stats);
      }
      setLoading(false);
    };
    fetchStats();
  }, [schoolId]);

  if (loading) return <div className={`h-48 flex items-center justify-center bg-white rounded-lg border border-slate-200 animate-pulse ${className}`}>Calculating Compliance Rate...</div>;

  const submittedCount = stats.filter(s => s.submitted).length;
  const complianceRate = Math.round((submittedCount / stats.length) * 100) || 0;

  return (
    <Card variant="gov" className={className} title="Audit Compliance Track" icon={CheckSquare} subtitle="Monitoring weekly report submission status (Annual View)">
      <div className="mt-4">
        <div className="flex items-center justify-between mb-6 bg-slate-50 p-4 rounded border border-slate-100">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Overall Compliance</p>
            <p className="text-2xl font-black text-slate-900">{complianceRate}% <span className="text-xs font-bold text-slate-400 uppercase ml-2">Rating</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Reports Filed</p>
            <p className="text-2xl font-black text-slate-900">{submittedCount}<span className="text-xs font-bold text-slate-400 uppercase ml-2">/ {stats.length}</span></p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {stats.map(s => (
            <div 
              key={s.week} 
              title={`Week ${s.week}: ${s.submitted ? 'Submitted' : 'Missed'}`}
              className={`w-3 h-6 sm:w-4 sm:h-8 rounded-[2px] border ${s.submitted ? 'bg-emerald-500 border-emerald-600 shadow-sm' : 'bg-slate-100 border-slate-200'}`} 
            />
          ))}
        </div>
        
        <div className="mt-6 flex flex-wrap gap-4 items-center border-t border-slate-100 pt-4">
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-sm bg-emerald-500 border border-emerald-600" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Audit Reported</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Audit Vacant</span>
           </div>
           <div className="ml-auto flex items-center gap-1.5 text-blue-700">
             <Info size={14} />
             <span className="text-[10px] font-black uppercase tracking-widest">Target: 1 Report / Week</span>
           </div>
        </div>
      </div>
    </Card>
  );
}
