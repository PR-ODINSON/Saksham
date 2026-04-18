import React from 'react';

/**
 * Common PageHeader component.
 */
const PageHeader = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  actions, 
  className = '' 
}) => {
  return (
    <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 ${className}`}>
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-[#003366] flex items-center justify-center text-white shadow-lg shadow-blue-900/10">
            <Icon size={24} strokeWidth={2.5} />
          </div>
        )}
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-[#003366] leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
