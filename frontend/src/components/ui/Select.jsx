import React from 'react';

function Select({ 
  label, 
  name,
  value, 
  onChange, 
  options = [],
  required = false,
  disabled = false,
  error = '',
  helperText = '',
  className = ''
}) {
  return (
    <div className={`mb-6 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-gray-700 text-lg font-semibold mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none bg-white ${error ? 'border-red-500' : ''}`}
        style={{
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 1rem center',
          backgroundSize: '1.5em 1.5em',
          paddingRight: '3rem'
        }}
      >
        <option value="">Select an option</option>
        {options.map((option, idx) => (
          <option key={idx} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-gray-500 text-sm mt-2">{helperText}</p>
      )}
    </div>
  );
}

export default Select;
