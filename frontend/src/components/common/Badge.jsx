import React from 'react';

/**
 * Common Badge component for status and priority levels.
 */
const Badge = ({ 
  children, 
  variant = 'default', // default, critical, high, moderate, low, info
  className = '',
  size = 'md' 
}) => {
  const variants = {
    default: 'bg-slate-100 text-slate-600 border-slate-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-[8px]',
    md: 'px-2 py-0.5 text-[9px]',
    lg: 'px-2.5 py-1 text-[10px]',
  };

  return (
    <span className={`inline-flex items-center font-bold uppercase tracking-wider border rounded-sm ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
