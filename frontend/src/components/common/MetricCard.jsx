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
    default: 'bg-white border-slate-200 text-slate-900',
    critical: 'bg-red-50 border-red-200 text-red-900',
    high: 'bg-orange-50 border-orange-200 text-orange-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
  };

  const iconColors = {
    default: 'text-slate-400',
    critical: 'text-red-600',
    high: 'text-orange-600',
    success: 'text-emerald-600',
    info: 'text-blue-600',
  };

  return (
    <div className={`rounded-lg border p-6 shadow-sm flex flex-col justify-between transition-all hover:translate-y-[-2px] ${variants[variant]} ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 leading-none">{label}</span>
        {Icon && <Icon size={18} className={iconColors[variant]} />}
      </div>
      <div>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {trend && (
          <div className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1 ${
            trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-400'
          }`}>
            {trendValue && <span>{trendValue}</span>}
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
