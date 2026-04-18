import React from 'react';

/**
 * Common Input component.
 */
const Input = ({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  placeholder, 
  error, 
  className = '', 
  disabled = false,
  required = false
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest block">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-2.5 bg-white border rounded text-sm font-medium transition-all outline-none
          ${error 
            ? 'border-red-500 focus:ring-1 focus:ring-red-500' 
            : 'border-slate-200 focus:border-blue-900 focus:ring-1 focus:ring-blue-900'
          }
          ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'text-slate-900'}
        `}
      />
      {error && (
        <p className="text-[12px] font-bold text-red-600 uppercase tracking-wider mt-1">{error}</p>
      )}
    </div>
  );
};

export default Input;
