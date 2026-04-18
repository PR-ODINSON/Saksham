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
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-200 mb-8 ${className}`}>
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="w-12 h-12 rounded bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-900 shadow-sm">
            <Icon size={24} />
          </div>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && (
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
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
