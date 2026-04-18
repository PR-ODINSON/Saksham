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
    gov: 'border-slate-200 bg-white shadow-md',
  };

  return (
    <div className={`rounded-lg border transition-all flex flex-col ${variantStyles[variant]} ${className}`}>
      {(title || Icon) && (
        <div className={`px-6 py-4 flex items-center justify-between transition-colors ${
          variant === 'gov' 
            ? 'bg-[#003366] rounded-t-lg' 
            : 'border-b border-slate-100'
        }`}>
          <div>
            {title && (
              <h3 className={`text-sm font-black uppercase tracking-widest ${
                variant === 'gov' ? 'text-white' : 'text-slate-900'
              }`}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className={`text-[10px] font-bold uppercase mt-0.5 tracking-wider ${
                variant === 'gov' ? 'text-blue-200' : 'text-slate-500'
              }`}>
                {subtitle}
              </p>
            )}
          </div>
          {Icon && (
            <Icon 
              size={18} 
              className={variant === 'gov' ? 'text-blue-300' : 'text-slate-400'} 
            />
          )}
        </div>
      )}
      <div className={`flex-1 ${noPadding ? '' : 'p-6'}`}>
        {children}
      </div>
    </div>
  );
};

export default Card;
