import { useState, useEffect, useRef } from 'react';
import { get } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useSocket from '../../hooks/useSocket';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { Shield, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

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
        <p className="text-xl text-slate-900">Access Denied</p>
      </div>
    );
  }

  const handleApply = () => { setApplied({ ...filters }); };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title="System Audit Log"
        subtitle="Immutable record of all platform actions"
        icon={Shield}
      />

      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role</label>
            <select
              value={filters.role}
              onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
              className="text-sm border border-slate-200 rounded px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="">All roles</option>
              {['peon','principal','deo','contractor','admin'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</label>
            <input
              type="text"
              value={filters.action}
              onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
              placeholder="e.g. report_submitted"
              className="text-sm border border-slate-200 rounded px-3 py-2 outline-none focus:border-blue-500 w-48"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Start date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
              className="text-sm border border-slate-200 rounded px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">End date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
              className="text-sm border border-slate-200 rounded px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>
          <Button variant="primary" size="sm" onClick={handleApply}>Apply</Button>
        </div>
      </Card>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Timestamp','Actor','Role','Action','Target','Details'].map(h => (
                  <th key={h} className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm italic">No audit logs found.</td></tr>
              ) : (
                logs.flatMap(log => {
                  const isNew      = newIds.has(log._id);
                  const isExpanded = expandedId === log._id;
                  const rows = [
                    <tr
                      key={log._id}
                      className={`border-b border-slate-50 transition-colors duration-1000 ${isNew ? 'bg-yellow-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-5 py-3 text-xs text-slate-600 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="px-5 py-3 text-xs font-semibold text-slate-900">{log.actorName || '—'}</td>
                      <td className="px-5 py-3"><Badge variant="default" size="sm">{log.actorRole || '—'}</Badge></td>
                      <td className="px-5 py-3 text-xs font-mono text-blue-700">{log.action}</td>
                      <td className="px-5 py-3 text-xs text-slate-500 max-w-[120px] truncate">{log.targetCollection || '—'}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : log._id)}
                          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-800"
                        >
                          View <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                    </tr>
                  ];
                  if (isExpanded) {
                    rows.push(
                      <tr key={`${log._id}-detail`} className="bg-slate-50">
                        <td colSpan={6} className="px-5 pb-4">
                          <JsonViewer data={log.metadata} />
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
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Page {page} / {pages} — {total} total records
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); fetchLogs(p); }}>
                <ChevronLeft size={14} />
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= pages}
                onClick={() => { const p = page + 1; setPage(p); fetchLogs(p); }}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
