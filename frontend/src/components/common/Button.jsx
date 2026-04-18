import React from 'react';

/**
 * Common Button component for formal government theme.
 */
const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', // primary, secondary, outline, ghost, danger
  size = 'md',       // sm, md, lg
  icon: Icon, 
  isLoading = false,
  disabled = false,
  className = '',
  type = 'button'
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-blue-900 text-white border border-blue-900 hover:bg-blue-800 shadow-sm',
    secondary: 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200',
    outline: 'bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-50',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-700 text-white border border-red-700 hover:bg-red-800 shadow-sm',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[12px] uppercase tracking-wider',
    md: 'px-5 py-2.5 text-xs uppercase tracking-wider',
    lg: 'px-6 py-3 text-sm uppercase tracking-wider',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon && (
        <Icon size={size === 'sm' ? 14 : 16} />
      )}
      {children}
    </button>
  );
};

export default Button;
