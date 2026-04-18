import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, animate } from 'framer-motion';
import { useNavigate } from "react-router-dom";
import { get } from "../../services/api";
import EvidenceDrawer from "../../components/common/EvidenceDrawer";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import MetricCard from "../../components/common/MetricCard";
import PageHeader from "../../components/common/PageHeader";
import {
  Activity, LayoutList, Wrench, AlertTriangle, Building2, 
  Cpu, ChevronRight, RefreshCw, Zap, ShieldAlert, Radio, 
  Globe, Database, ArrowRight, MapPin, Clock, Search
} from 'lucide-react';
// Map no longer used in Dashboard


/* ─────────────────────────────────────────────────────────
   CLEAN DASHBOARD STYLES
   ───────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  html {
    scroll-behavior: smooth;
  }
  .trow { transition: background 0.1s; }
  .trow:hover { background: #f8fafc; }
`;

const Counter = ({ to, prefix = '', suffix = '' }) => {
  const ref = useRef(null);
  useEffect(() => {
    const ctrl = animate(0, to, {
      duration: 1, ease: 'easeOut',
      onUpdate: (v) => { if (ref.current) ref.current.textContent = prefix + Math.round(v).toLocaleString() + suffix; }
    });
    return () => ctrl.stop();
  }, [to]);
  return <span ref={ref}>0</span>;
};

/* ─────────────────────────────────────────────────────────
   MAIN DASHBOARD COMPONENT
   ───────────────────────────────────────────────────────── */
export default function DEODashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState(60);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [lastSync, setLastSync] = useState(new Date());
  
  const [activeTab, setActiveTab] = useState("queue"); 
  const [flaggedOrders, setFlaggedOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [schoolsList, setSchoolsList] = useState([]);
  
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ district, block, category, urgency });
    const [riskRes, flaggedRes, alertsRes, schoolsRes] = await Promise.all([
      get(`/api/risk/queue?${params}`),
      get(`/api/tasks?locationMismatch=true`),
      get(`/api/alerts?type=GPS_MISMATCH`),
      get(`/api/schools`)
    ]);

    if (riskRes.success) {
      setData(riskRes.queue);
      setLastSync(new Date());
    }
    if (flaggedRes.success) {
      setFlaggedOrders(flaggedRes.workOrders);
    }
    if (alertsRes.success) {
      setAlerts(alertsRes.data);
    }
    if (schoolsRes.success) {
      setSchoolsList(schoolsRes.schools);
    }
    setLoading(false);
  }, [district, block, category, urgency]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    totalSchools: data.length,
    criticalCount: data.filter(s => s.priorityScore >= 75).length,
    highRiskCount: data.filter(s => s.priorityScore >= 50 && s.priorityScore < 75).length,
    avgUrgency: data.length ? Math.round(data.reduce((a, s) => a + s.daysToFailure, 0) / data.length) : 0,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <style>{GLOBAL_CSS}</style>

      <div className="max-w-7xl mx-auto space-y-8">
        <PageHeader 
          title="Maintenance Operational Hub"
          subtitle="District infrastructure oversight and predictive risk management"
          icon={LayoutList}
          actions={
            <Button 
              onClick={() => navigate("/dashboard/work-orders")}
              variant="primary"
            >
              Command Center
            </Button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard label="Assessed Schools" value={<Counter to={stats.totalSchools} />} icon={Building2} variant="info" />
          <MetricCard label="Critical Risk" value={<Counter to={stats.criticalCount} />} icon={AlertTriangle} variant="critical" />
          <MetricCard label="High Priority" value={<Counter to={stats.highRiskCount} />} icon={Activity} variant="high" trend="up" trendValue="Trending" />
          <MetricCard label="Avg Survival" value={<Counter to={stats.avgUrgency} suffix=" Days" />} icon={Wrench} variant="success" />
        </div>

        <Card noPadding className="overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex gap-1">
              <Button 
                variant={activeTab === 'queue' ? 'primary' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab("queue")}
              >
                Risk Queue
              </Button>
              <Button 
                variant={activeTab === 'flagged' ? 'danger' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab("flagged")}
              >
                GPS Mismatches
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  placeholder="Filter District..." 
                  value={district} 
                  onChange={e => setDistrict(e.target.value)} 
                  className="text-xs pl-8 pr-4 py-2 border border-slate-200 rounded outline-none focus:border-blue-900 transition-colors" 
                />
              </div>
              <Button variant="secondary" size="sm" onClick={fetchData} className="w-9 h-9 p-0">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Infrastructure Node</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Risk Categories</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Failure Horizon</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Impact</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === "queue" ? (
                  loading ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading...</td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium text-sm">No critical risk nodes identified in current registry scan.</td></tr>
                  ) : (
                    data.map((s, idx) => (
                      <tr key={idx} onClick={() => setSelectedSchool(s)} className="trow border-b border-slate-50 cursor-pointer">
                        <td className="px-6 py-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/work-orders/new?schoolId=${s.schoolId}&school=${encodeURIComponent(s.schoolName)}&category=${s.highestPriorityCategory}&score=${s.priorityScore}`); }}
                          >
                            Resolve
                          </Button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                              {s.schoolName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">{s.schoolName}</div>
                              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{s.block}, {s.district}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5 flex-wrap"> 
                            {s.categories.map(cat => (
                              <Badge key={cat} variant="default" size="sm">
                                {cat}
                              </Badge>
                            ))} 
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-bold text-slate-700 uppercase">{s.daysToFailure} Days Remaining</div>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${Math.max(10, 100 - (s.daysToFailure / 180 * 100))}%` }} 
                                className={`h-full ${s.daysToFailure < 30 ? 'bg-red-600' : s.daysToFailure < 60 ? 'bg-orange-500' : 'bg-blue-600'}`} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{s.studentImpactScore}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impact</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  // FLAGGED MISMATCH TAB
                  flaggedOrders.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 60, textAlign: 'center' }}><ShieldAlert size={32} color="#fecaca" style={{ margin: '0 auto 12px' }} /><p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>NO LOCATION MISMATCHES DETECTED</p></td></tr>
                  ) : (
                    flaggedOrders.map((o, idx) => (
                      <tr key={idx} className="trow border-b border-red-50 bg-red-50/30">
                        <td className="px-6 py-4">
                          <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => window.open(o.completionProof?.photoUrl, '_blank')}
                          >
                            Verify Proof
                          </Button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-red-900">{o.school?.name || 'Unknown School'}</div>
                          <div className="text-[10px] font-semibold text-red-700 uppercase mt-0.5">By: {o.contractor?.name || 'Unassigned'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[10px] font-bold text-red-800 uppercase">SUBMITTED: {o.completionProof?.gpsLocation?.lat?.toFixed(4)}, {o.completionProof?.gpsLocation?.lng?.toFixed(4)}</div>
                          <div className="text-[10px] font-bold text-red-900 uppercase mt-1 opacity-60">ACTUAL: {o.school?.location?.lat?.toFixed(4)}, {o.school?.location?.lng?.toFixed(4)}</div>
                        </td>
                        <td className="px-6 py-4">
                           <Badge variant="critical">Resolution Mismatch</Badge>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                             <span className="text-xs font-bold text-red-900">RADIAL VARIANCE</span>
                             <span className="text-[9px] font-bold text-red-700 uppercase">OUTSIDE SECURITY RADIUS</span>
                           </div>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Last Synchronization: {lastSync.toLocaleTimeString()}</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest leading-none">Security Registry Operational</span>
            </div>
          </div>
        </Card>
      </div>

      <EvidenceDrawer
        isOpen={!!selectedSchool}
        onClose={() => setSelectedSchool(null)}
        schoolName={selectedSchool?.schoolName}
        categories={selectedSchool?.categories}
        evidence={selectedSchool?.topEvidence}
      />
    </div>
  );
}