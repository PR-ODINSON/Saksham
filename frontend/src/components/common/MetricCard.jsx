import React from 'react';

/**
 * Common MetricCard component for displaying dashboard statistics.
 */
const MetricCard = ({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  variant = 'default',
  className = '' 
}) => {
  const variants = {
    default: 'bg-white border-slate-200 text-slate-900 border-l-4 border-l-slate-400',
    critical: 'bg-white border-slate-200 text-slate-900 border-l-4 border-l-red-500',
    high: 'bg-white border-slate-200 text-slate-900 border-l-4 border-l-orange-500',
    success: 'bg-white border-slate-200 text-slate-900 border-l-4 border-l-emerald-500',
    info: 'bg-white border-slate-200 text-slate-900 border-l-4 border-l-blue-600',
  };

  const iconColors = {
    default: 'text-slate-400',
    critical: 'text-red-600',
    high: 'text-orange-600',
    success: 'text-emerald-600',
    info: 'text-blue-600',
  };

  return (
    <div className={`rounded-xl border p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:translate-y-[-2px] ${variants[variant]} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-60 leading-none">{label}</span>
        <div className={`p-2 rounded-lg ${variant === 'default' ? 'bg-slate-50' : 'bg-white/50'}`}>
          {Icon && <Icon size={18} className={iconColors[variant]} />}
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold tracking-tight tabular-nums whitespace-nowrap text-[#003366]">{value}</div>
        {trend && (
          <div className={`text-[10px] font-bold uppercase tracking-wider mt-2 flex items-center gap-1.5 ${
            trend === 'up' ? 'text-emerald-700' : trend === 'down' ? 'text-red-700' : 'text-slate-500'
          }`}>
             <div className={`px-1.5 py-0.5 rounded ${
               trend === 'up' ? 'bg-emerald-100' : trend === 'down' ? 'bg-red-100' : 'bg-slate-100'
             }`}>
               {trend === 'up' && '↑'}
               {trend === 'down' && '↓'}
               {trend === 'stable' && '—'}
             </div>
            {trendValue && <span className="opacity-80">{trendValue}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
