import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { get } from '../../services/api';
import Card from '../common/Card';
import { TrendingUp, Activity } from 'lucide-react';

export default function HealthTimeline({ schoolId, className }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      const res = await get(`/api/risk/${schoolId}/timeline`);
      if (res.success) {
        setData(res.timeline);
      }
      setLoading(false);
    };
    fetchData();
  }, [schoolId]);

  if (loading) return <div className={`h-64 flex items-center justify-center bg-slate-50 rounded-lg animate-pulse ${className}`}>Loading Chart...</div>;

  return (
    <Card variant="gov" className={className} title="Infrastructure Health Timeline" icon={Activity} subtitle="Historical condition analysis across domains">
      <div className="h-[220px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPlumbing" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorElectrical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorStructural" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="week" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              dy={10}
            />
            <YAxis 
              hide={true} 
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)' }}
              itemStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}
              labelStyle={{ fontSize: '10px', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}
            />
            <Legend verticalAlign="top" height={36} align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            <Area 
              type="monotone" 
              dataKey="plumbing" 
              name="Plumbing"
              stroke="#2563eb" 
              fillOpacity={1}
              fill="url(#colorPlumbing)"
              strokeWidth={3} 
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls
            />
            <Area 
              type="monotone" 
              dataKey="electrical" 
              name="Electrical"
              stroke="#f59e0b" 
              fillOpacity={1}
              fill="url(#colorElectrical)"
              strokeWidth={3} 
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls
            />
            <Area 
              type="monotone" 
              dataKey="structural" 
              name="Structural"
              stroke="#ef4444" 
              fillOpacity={1}
              fill="url(#colorStructural)"
              strokeWidth={3} 
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 p-3 rounded border border-slate-100">
        <TrendingUp size={14} className="text-emerald-600" />
        Higher values indicate optimal infrastructure integrity (0-100 index)
      </div>
    </Card>
  );
}
