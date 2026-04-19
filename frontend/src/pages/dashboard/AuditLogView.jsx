import { useState, useEffect, useRef, useMemo } from 'react';
import { get } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useSocket from '../../hooks/useSocket';
import {
  ChevronLeft, ChevronRight, ChevronDown, RefreshCw, Search,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const ROLE_TONE = {
  admin:      { color: 'text-red-700',     bg: 'bg-red-50'     },
  deo:        { color: 'text-blue-700',    bg: 'bg-blue-50'    },
  principal:  { color: 'text-violet-700',  bg: 'bg-violet-50'  },
  contractor: { color: 'text-amber-700',   bg: 'bg-amber-50'   },
  peon:       { color: 'text-emerald-700', bg: 'bg-emerald-50' },
  default:    { color: 'text-slate-700',   bg: 'bg-slate-100'  },
};

function StatTile({ label, value, tone = 'muted' }) {
  const toneMap = {
    red:   'text-red-600',
    amber: 'text-amber-600',
    green: 'text-emerald-600',
    blue:  'text-blue-700',
    muted: 'text-slate-900',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl mt-1 ${toneMap[tone]}`}>{value}</p>
    </div>
  );
}

function JsonViewer({ data }) {
  return (
    <pre className="mt-2 p-3 bg-slate-900 text-emerald-300 text-xs rounded-md overflow-auto max-h-56 font-mono leading-relaxed">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}
function fmtTime(d) {
  return new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AuditLogView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const socket  = useSocket();

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

  const PAGE_SIZE = 16;

  const fetchLogs = async (p = page, f = applied) => {
    setLoading(true);
    const params = new URLSearchParams({ page: p, limit: PAGE_SIZE });
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

  useEffect(() => { fetchLogs(1, applied); /* eslint-disable-next-line */ }, [applied]);

  useEffect(() => {
    if (!socket) return;
    const handler = ({ log }) => {
      if (!log) return;
      setLogs(prev => [log, ...prev]);
      setTotal(t => t + 1);
      setNewIds(prev => new Set([...prev, log._id]));
      const tm = setTimeout(() => {
        setNewIds(prev => { const n = new Set(prev); n.delete(log._id); return n; });
      }, 2000);
      newIdTimers.current[log._id] = tm;
    };
    socket.on('audit:event', handler);
    return () => {
      socket.off('audit:event', handler);
      Object.values(newIdTimers.current).forEach(clearTimeout);
    };
  }, [socket]);

  // Live DB-driven stats over the currently fetched page of logs.
  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayCount = logs.filter(l => new Date(l.createdAt) >= today).length;
    const actors = new Set(logs.map(l => l.actorName || l.actorId).filter(Boolean));
    const roles  = new Set(logs.map(l => l.actorRole).filter(Boolean));
    return {
      total,
      today: todayCount,
      actors: actors.size,
      roles: roles.size,
    };
  }, [logs, total]);

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-6">
        <div className="bg-white border border-slate-200 rounded-xl px-8 py-10 text-center max-w-md">
          <p className="text-lg text-slate-900">{t('alv.access_denied')}</p>
          <p className="text-sm text-slate-500 mt-2">This view is restricted to system administrators.</p>
        </div>
      </div>
    );
  }

  const handleApply  = () => { setApplied({ ...filters }); };
  const handleReset  = () => {
    const empty = { role: '', action: '', startDate: '', endDate: '' };
    setFilters(empty);
    setApplied(empty);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto pt-8 sm:pt-12 px-4 sm:px-8 space-y-6 pb-12">

        {/* Minimalist header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl text-slate-900">{t('alv.title')}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Immutable record of every action across the platform.
            </p>
          </div>
          <button
            onClick={() => fetchLogs(page, applied)}
            className="h-9 px-3 inline-flex items-center gap-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm self-start sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Total events"      value={stats.total.toLocaleString()} tone="muted" />
          <StatTile label="Today (this page)" value={stats.today}                  tone={stats.today > 0 ? 'blue' : 'muted'} />
          <StatTile label="Distinct actors"   value={stats.actors}                 tone="muted" />
          <StatTile label="Roles seen"        value={stats.roles}                  tone="muted" />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={filters.role}
              onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
              className="appearance-none h-9 pl-3 pr-8 text-sm bg-white border border-slate-200 rounded-md text-slate-700 outline-none focus:border-slate-400 transition-colors"
            >
              <option value="">All roles</option>
              {['PEON', 'PRINCIPAL', 'DEO', 'CONTRACTOR', 'ADMIN'].map(r => (
                <option key={r} value={r.toLowerCase()}>{r}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.action}
              onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
              placeholder="Filter by action…"
              className="w-full h-9 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-700 outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
            />
          </div>

          <input
            type="date"
            value={filters.startDate}
            onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
            className="h-9 px-3 text-sm bg-white border border-slate-200 rounded-md text-slate-700 outline-none focus:border-slate-400 transition-colors"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
            className="h-9 px-3 text-sm bg-white border border-slate-200 rounded-md text-slate-700 outline-none focus:border-slate-400 transition-colors"
          />

          <button
            onClick={handleApply}
            className="h-9 px-4 text-sm rounded-md bg-[#003366] text-white hover:bg-[#002244] transition-colors"
          >
            Apply
          </button>
          <button
            onClick={handleReset}
            className="h-9 px-3 text-sm rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Reset
          </button>

          <span className="ml-auto text-xs text-slate-500">
            Showing {logs.length} of {total.toLocaleString()} events
          </span>
        </div>

        {/* Log list */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading audit log…</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-slate-500">No events match the current filters.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {logs.map(log => {
                const isNew      = newIds.has(log._id);
                const isExpanded = expandedId === log._id;
                const role       = (log.actorRole || 'default').toLowerCase();
                const tone       = ROLE_TONE[role] || ROLE_TONE.default;
                return (
                  <li
                    key={log._id}
                    className={`transition-colors ${isNew ? 'bg-amber-50/60' : 'hover:bg-slate-50/60'}`}
                  >
                    <div className="flex items-center gap-4 px-5 py-3.5">
                      {/* Timestamp */}
                      <div className="hidden sm:flex flex-col w-20 flex-shrink-0">
                        <span className="text-xs text-slate-700">{fmtDate(log.createdAt)}</span>
                        <span className="text-xs text-slate-400">{fmtTime(log.createdAt)}</span>
                      </div>

                      {/* Actor */}
                      <div className="flex items-center gap-2.5 min-w-0 w-56 flex-shrink-0">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 flex-shrink-0">
                          {(log.actorName || 'U')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-800 truncate">
                            {log.actorName || t('alv.unknown_actor')}
                          </p>
                          <p className="sm:hidden text-xs text-slate-400">{fmtDate(log.createdAt)} · {fmtTime(log.createdAt)}</p>
                        </div>
                      </div>

                      {/* Role */}
                      <span className={`hidden md:inline-flex text-xs px-1.5 py-0.5 rounded ${tone.bg} ${tone.color} flex-shrink-0`}>
                        {(log.actorRole || 'unknown').toUpperCase()}
                      </span>

                      {/* Action */}
                      <span className="text-xs font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[180px]">
                        {log.action}
                      </span>

                      {/* Target */}
                      <span className="hidden lg:inline text-xs text-slate-500 truncate flex-1 min-w-0">
                        {log.targetCollection || t('alv.general_system')}
                      </span>

                      {/* Payload toggle */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log._id)}
                        className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors flex-shrink-0"
                      >
                        Payload
                        <ChevronDown
                          size={12}
                          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-4">
                        <JsonViewer data={log.metadata} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Page {page} of {pages} · {total.toLocaleString()} events
              </span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => { const p = page - 1; setPage(p); fetchLogs(p); }}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => { const p = page + 1; setPage(p); fetchLogs(p); }}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
