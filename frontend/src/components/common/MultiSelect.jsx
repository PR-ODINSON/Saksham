import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

/**
 * Premium MultiSelect dropdown for structural/functional auditing.
 */
const MultiSelect = ({ 
  label, 
  options, 
  selectedValues = [], 
  onChange, 
  placeholder = "Select options", 
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (val) => {
    const newValues = selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val];
    onChange(newValues);
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest block">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded text-sm font-medium transition-all outline-none 
            ${isOpen ? 'border-blue-900 ring-1 ring-blue-900' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <span className={`truncate ${selectedValues.length === 0 ? 'text-slate-400' : 'text-slate-900'}`}>
            {selectedValues.length === 0 
              ? placeholder 
              : selectedValues.length === 1 
                ? options.find(o => o.value === selectedValues[0])?.label
                : `${selectedValues.length} items selected`}
          </span>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto translate-y-0">
            <div className="p-2 space-y-1">
              {options.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(opt.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left
                      ${isSelected ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all
                      ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{opt.label}</p>
                      {opt.desc && <p className="text-[11px] text-slate-500 truncate font-normal">{opt.desc}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedValues.length > 0 && (
              <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 p-2 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase ml-2">Selections: {selectedValues.length}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onChange([]); }}
                  className="text-[11px] font-bold text-red-600 uppercase tracking-wider hover:text-red-700 p-1"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelect;
