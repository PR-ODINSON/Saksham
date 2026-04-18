import React from 'react';

/**
 * Common Card component for formal government theme.
 */
const Card = ({ 
  children, 
  title, 
  subtitle, 
  icon: Icon, 
  className = '', 
  variant = 'default', // default, danger, success, warning
  noPadding = false 
}) => {
  const variantStyles = {
    default: 'border-slate-200 bg-white shadow-sm',
    danger: 'border-red-200 bg-red-50/50 shadow-sm',
    success: 'border-emerald-200 bg-emerald-50/50 shadow-sm',
    warning: 'border-amber-200 bg-amber-50/50 shadow-sm',
  };

  return (
    <div className={`rounded-lg border transition-all ${variantStyles[variant]} ${className}`}>
      {(title || Icon) && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{title}</h3>}
            {subtitle && <p className="text-[10px] font-medium text-slate-500 uppercase mt-0.5">{subtitle}</p>}
          </div>
          {Icon && <Icon size={18} className="text-slate-400" />}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
};

export default Card;
