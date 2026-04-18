import React from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import Badge from './Badge';
import { X, Database } from 'lucide-react';

export default function EvidenceDrawer({ isOpen, onClose, schoolName, evidence = [], categories = [], coverImage }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Banner Image Area */}
            <div className="relative h-64 w-full bg-slate-200 shrink-0">
              {coverImage ? (
                <img src={coverImage} alt="School" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">No Image Available</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
              
              <div className="absolute top-4 right-4 z-10">
                <Button variant="secondary" size="sm" onClick={onClose} className="w-8 h-8 p-0 bg-white/20 hover:bg-white/40 backdrop-blur-md border-white/30 text-white shadow-xl">
                  <X size={16} />
                </Button>
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <h2 className="text-2xl font-black text-white leading-tight drop-shadow-md">{schoolName}</h2>
                <p className="mt-1 text-xs text-slate-300 font-bold tracking-widest uppercase">
                  Infrastructure Insights
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Categories */}
              <div>
                <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-4">Priority Assessment</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <Badge key={cat} variant="info" size="sm">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Evidence List */}
              <div>
                <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-3">Risk Indicators</h3>
                {evidence.length > 0 ? (
                  <ul className="space-y-3">
                    {evidence.map((item, idx) => (
                      <li key={idx} className="flex gap-3 items-start p-4 rounded-lg bg-white border border-slate-200">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                        <span className="text-sm text-slate-700 font-medium leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-10 border border-dashed border-slate-200 rounded bg-slate-50">
                    <p className="text-xs text-slate-400 font-medium italic">No specific risk triggers recorded.</p>
                  </div>
                )}
              </div>

              {/* Methodology note */}
              <div className="p-4 rounded bg-blue-50 border border-blue-100">
                <div className="flex gap-3">
                  <div className="text-blue-900 shrink-0 mt-0.5"><Database size={16} /></div>
                  <p className="text-[13px] text-blue-900 leading-relaxed font-medium">
                    Automated priority estimation based on multi-week condition logs and historic failure thresholds.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-200">
              <Button
                variant="primary"
                onClick={onClose}
                className="w-full"
              >
                Close Insights
              </Button>
      </div>
      </div>
    </div>,
    document.body
  );
}
