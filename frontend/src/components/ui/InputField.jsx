import React from 'react';

function InputField({ 
  label, 
  name,
  type = 'text', 
  value, 
  onChange, 
  placeholder = '', 
  required = false,
  disabled = false,
  error = '',
  helperText = '',
  icon,
  className = ''
}) {
  return (
    <div className={`mb-6 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-gray-700 text-lg font-semibold mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full ${icon ? 'pl-12' : 'pl-4'} pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${error ? 'border-red-500' : ''}`}
        />
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-gray-500 text-sm mt-2">{helperText}</p>
      )}
    </div>
  );
}

export default InputField;
