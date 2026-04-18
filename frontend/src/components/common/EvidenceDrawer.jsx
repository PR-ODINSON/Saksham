import React from 'react';
import Button from './Button';
import Badge from './Badge';
import { X, Database } from 'lucide-react';

export default function EvidenceDrawer({ isOpen, onClose, schoolName, evidence = [], categories = [] }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md transform transition ease-in-out duration-500">
          <div className="h-full flex flex-col bg-white shadow-2xl border-l border-slate-200">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-200 bg-slate-50 relative">
              <h2 className="text-xl font-bold text-slate-900">Infrastructure Insights</h2>
              <p className="mt-1 text-sm text-slate-500 font-medium tracking-tight">
                Predictive data for <span className="text-blue-900 font-bold">{schoolName}</span>
              </p>
              <div className="absolute top-6 right-6">
                <Button variant="ghost" size="sm" onClick={onClose} className="w-8 h-8 p-0">
                  <X size={16} />
                </Button>
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
        </div>
      </div>
    </div>
  );
}
