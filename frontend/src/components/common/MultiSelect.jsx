import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

/**
 * MultiSelect dropdown.
 *
 * The dropdown panel is rendered in a portal and positioned absolutely against
 * the trigger button. This avoids being clipped by any ancestor that has
 * `overflow-hidden` / `max-height` / scroll containers (e.g. cards, modals).
 */
const MultiSelect = ({
  label,
  options,
  selectedValues = [],
  onChange,
  placeholder = "Select options",
  className = "",
}) => {
  const [isOpen, setIsOpen]   = useState(false);
  const [coords, setCoords]   = useState({ top: 0, left: 0, width: 0, openUp: false });
  const triggerRef            = useRef(null);
  const panelRef              = useRef(null);

  const PANEL_MAX_HEIGHT = 256;

  const computePosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp     = spaceBelow < PANEL_MAX_HEIGHT + 24 && rect.top > spaceBelow;
    setCoords({
      top:   openUp ? rect.top - 4 : rect.bottom + 4,
      left:  rect.left,
      width: rect.width,
      openUp,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    computePosition();
    const onScroll = () => computePosition();
    const onResize = () => computePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen, computePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target) &&
        panelRef.current   && !panelRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const toggleOption = (val) => {
    const newValues = selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val];
    onChange(newValues);
  };

  const triggerLabel =
    selectedValues.length === 0
      ? placeholder
      : selectedValues.length === 1
        ? options.find(o => o.value === selectedValues[0])?.label
        : `${selectedValues.length} items selected`;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest block">
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded text-sm font-medium transition-all outline-none
          ${isOpen ? 'border-blue-900 ring-1 ring-blue-900' : 'border-slate-200 hover:border-slate-300'}`}
      >
        <span className={`truncate ${selectedValues.length === 0 ? 'text-slate-400' : 'text-slate-900'}`}>
          {triggerLabel}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top:   coords.openUp ? undefined : coords.top,
            bottom: coords.openUp ? window.innerHeight - coords.top : undefined,
            left:  coords.left,
            width: coords.width,
            maxHeight: PANEL_MAX_HEIGHT,
            zIndex: 1000,
          }}
          className="bg-white border border-slate-200 rounded-lg shadow-xl flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
                    <p className="text-sm font-medium truncate">{opt.label}</p>
                    {opt.desc && <p className="text-[11px] text-slate-500 truncate font-normal">{opt.desc}</p>}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedValues.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                {selectedValues.length} selected
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange([]); }}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Clear all
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default MultiSelect;
