import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
      <div className="h-[300px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
              itemStyle={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}
              labelStyle={{ fontSize: '10px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}
            />
            <Legend verticalAlign="top" height={36} align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            <Line 
              type="monotone" 
              dataKey="plumbing" 
              name="Plumbing"
              stroke="#2563eb" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
              connectNulls
            />
            <Line 
              type="monotone" 
              dataKey="electrical" 
              name="Electrical"
              stroke="#f59e0b" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
              connectNulls
            />
            <Line 
              type="monotone" 
              dataKey="structural" 
              name="Structural"
              stroke="#ef4444" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 p-3 rounded border border-slate-100">
        <TrendingUp size={14} className="text-emerald-600" />
        Higher values indicate optimal infrastructure integrity (0-100 index)
      </div>
    </Card>
  );
}
