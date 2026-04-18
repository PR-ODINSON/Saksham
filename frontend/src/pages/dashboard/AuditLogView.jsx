import { useState, useEffect, useRef } from 'react';
import { get } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useSocket from '../../hooks/useSocket';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { Shield, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

function JsonViewer({ data }) {
  return (
    <pre className="mt-2 p-3 bg-slate-900 text-green-400 text-xs rounded overflow-auto max-h-40 font-mono">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function AuditLogView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const socket   = useSocket();

  const [logs, setLogs]             = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [loading, setLoading]       = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [newIds, setNewIds]         = useState(new Set());
  const newIdTimers                 = useRef({});

  const [filters, setFilters] = useState({ role: '', action: '', startDate: '', endDate: '' });
  const [applied, setApplied] = useState(filters);

  const fetchLogs = async (p = page, f = applied) => {
    setLoading(true);
    const params = new URLSearchParams({ page: p, limit: 50 });
    if (f.role)      params.set('role', f.role);
    if (f.action)    params.set('action', f.action);
    if (f.startDate) params.set('startDate', f.startDate);
    if (f.endDate)   params.set('endDate', f.endDate);
    const res = await get(`/api/admin/audit-logs?${params}`);
    if (res.success) {
      setLogs(res.logs);
      setTotal(res.total);
      setPage(res.page);
      setPages(res.pages);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(1, applied); }, [applied]);

  useEffect(() => {
    if (!socket) return;
    const handler = ({ log }) => {
      if (!log) return;
      setLogs(prev => [log, ...prev]);
      setTotal(t => t + 1);
      setNewIds(prev => new Set([...prev, log._id]));
      const t = setTimeout(() => {
        setNewIds(prev => { const n = new Set(prev); n.delete(log._id); return n; });
      }, 2000);
      newIdTimers.current[log._id] = t;
    };
    socket.on('audit:event', handler);
    return () => {
      socket.off('audit:event', handler);
      Object.values(newIdTimers.current).forEach(clearTimeout);
    };
  }, [socket]);

  if (user?.role !== 'admin') {
    return (
      <div className="p-12 text-center text-slate-500 font-bold">
        <p className="text-xl text-slate-900">{t('alv.access_denied')}</p>
      </div>
    );
  }

  const handleApply = () => { setApplied({ ...filters }); };

  return (
    <div className="pt-10 px-6 pb-12 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title={t('alv.title')}
        subtitle={t('alv.subtitle')}
        icon={Shield}
      />

      <Card className="px-6 py-3 border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('alv.actor_role')}</label>
            <div className="relative">
              <select
                value={filters.role}
                onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
                className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-semibold px-3 py-1.5 pr-10 rounded-lg outline-none focus:border-blue-500 transition-all shadow-sm"
              >
                <option value="">{t('alv.all_roles')}</option>
                {['PEON','PRINCIPAL','DEO','CONTRACTOR','ADMIN'].map(r => (
                  <option key={r} value={r.toLowerCase()}>{r}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 flex-[2] min-w-[200px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('alv.action_sig')}</label>
            <input
              type="text"
              value={filters.action}
              onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
              placeholder={t('alv.filter_action')}
              className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold px-3 py-1.5 rounded-lg outline-none focus:border-blue-500 transition-all shadow-sm placeholder:text-slate-300 placeholder:font-normal"
            />
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('alv.window_start')}</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
              className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold px-3 py-1.5 rounded-lg outline-none focus:border-blue-500 transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('alv.window_end')}</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
              className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold px-3 py-1.5 rounded-lg outline-none focus:border-blue-500 transition-all shadow-sm"
            />
          </div>

          <Button variant="primary" className="text-[11px] h-[36px] font-black uppercase tracking-widest px-8 shadow-md hover:translate-y-[-1px] transition-all active:translate-y-[0px]" onClick={handleApply}>
            {t('alv.apply_filters')}
          </Button>
        </div>
      </Card>

      <Card noPadding className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{t('alv.th_timestamp')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{t('alv.th_actor')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{t('alv.th_role')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{t('alv.th_action')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{t('alv.th_target')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">{t('alv.th_details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs animate-pulse">{t('alv.syncing')}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 text-sm italic">{t('alv.no_events')}</td></tr>
              ) : (
                logs.flatMap(log => {
                  const isNew      = newIds.has(log._id);
                  const isExpanded = expandedId === log._id;
                  const rows = [
                    <tr
                      key={log._id}
                      className={`transition-all duration-1000 ${isNew ? 'bg-amber-50' : 'hover:bg-slate-50/50'}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-[11px] font-bold text-slate-900">{new Date(log.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{new Date(log.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                            {(log.actorName || 'U')[0]}
                          </div>
                          <p className="text-[12px] font-bold text-slate-700">{log.actorName || t('alv.unknown_actor')}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant={log.actorRole === 'admin' ? 'high' : log.actorRole === 'deo' ? 'info' : 'default'} 
                          size="sm"
                          className="font-bold uppercase tracking-widest text-[8px]"
                        >
                          {log.actorRole || t('alv.unknown_role')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-mono text-[11px] font-bold border border-blue-100 shadow-sm">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight truncate max-w-[150px]">{log.targetCollection || t('alv.general_system')}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : log._id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                            isExpanded ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          {t('alv.payload')} <ChevronDown size={12} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                    </tr>
                  ];
                  if (isExpanded) {
                    rows.push(
                      <tr key={`${log._id}-detail`} className="bg-slate-900/5 backdrop-blur-sm">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="relative group/json">
                            <div className="absolute right-3 top-3 opacity-0 group-hover/json:opacity-100 transition-opacity">
                              <Badge variant="low" size="sm" className="bg-slate-800 text-slate-400 border-slate-700">{t('alv.extracted_metadata')}</Badge>
                            </div>
                            <JsonViewer data={log.metadata} />
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return rows;
                })
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              {t('alv.registry_page')} {page} <span className="text-slate-300">/</span> {pages} <span className="ml-2 text-slate-500">({total} {t('alv.events')})</span>
            </span>
            <div className="flex gap-2">
              <button 
                disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); fetchLogs(p); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                disabled={page >= pages}
                onClick={() => { const p = page + 1; setPage(p); fetchLogs(p); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
