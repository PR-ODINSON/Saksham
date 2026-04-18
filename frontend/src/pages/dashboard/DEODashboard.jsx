import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, animate } from 'framer-motion';
import { useNavigate } from "react-router-dom";
import { get } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { roleSubPath } from "../../utils/roleRoutes.js";
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
  const { user } = useAuth();

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
    <div className="min-h-screen bg-[#f8fafc]">
      <style>{GLOBAL_CSS}</style>

      <div className="max-w-7xl mx-auto pt-10 sm:pt-16 px-4 sm:px-8 space-y-8 pb-12">
        <PageHeader 
          title="Administrative Oversight Center"
          subtitle="District Infrastructure Health & Predictive Maintenance Management"
          icon={LayoutList}
          actions={
            <Button 
              onClick={() => navigate(roleSubPath(user?.role, "work-orders"))}
              variant="outline"
              className="font-bold uppercase tracking-widest text-[10px] border-[#003366] text-[#003366] hover:bg-blue-50"
            >
              All Work Orders
            </Button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard label="Assessed Schools" value={<Counter to={stats.totalSchools} />} icon={Building2} variant="info" />
          <MetricCard label="Critical Risk" value={<Counter to={stats.criticalCount} />} icon={AlertTriangle} variant="critical" />
          <MetricCard label="High Priority" value={<Counter to={stats.highRiskCount} />} icon={Activity} variant="high" trend="up" trendValue="Trending" />
          <MetricCard label="Avg Survival" value={<Counter to={stats.avgUrgency} suffix=" Days" />} icon={Wrench} variant="success" />
        </div>

        <Card noPadding variant="gov" title="Risk Management Queue" subtitle="Real-time predictive analysis of infrastructure nodes" className="overflow-visible">
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
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status/Action</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">School Details</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Risk Category</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Predicted Failure</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Service Impact</th>
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
                        <td className="px-6 py-4 text-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-[10px] font-bold uppercase tracking-wider py-1.5"
                            onClick={(e) => { e.stopPropagation(); navigate(`${roleSubPath(user?.role, "work-orders/new")}?schoolId=${s.schoolId}&school=${encodeURIComponent(s.schoolName)}&category=${s.highestPriorityCategory}&score=${s.priorityScore}`); }}
                          >
                            Assign Task
                          </Button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded border border-slate-200 bg-white text-[#003366] flex items-center justify-center font-bold text-[12px] shadow-sm">
                              {s.schoolName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 leading-tight">{s.schoolName}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{s.block}, {s.district}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5 flex-wrap"> 
                            {s.categories.map(cat => (
                              <Badge key={cat} variant="default" size="sm" className="bg-slate-100 text-slate-600 border-none font-bold text-[9px] uppercase">
                                {cat}
                              </Badge>
                            ))} 
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{s.daysToFailure} Days Remaining</div>
                            <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${Math.max(10, 100 - (s.daysToFailure / 180 * 100))}%` }} 
                                className={`h-full ${s.daysToFailure < 30 ? 'bg-red-500' : s.daysToFailure < 60 ? 'bg-orange-400' : 'bg-blue-500'}`} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">{s.studentImpactScore}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Students</span>
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
                      <tr key={idx} className="trow border-b border-slate-50">
                        <td className="px-6 py-4 text-center">
                          <Button 
                            variant="danger" 
                            size="sm"
                            className="text-[10px] font-bold uppercase tracking-wider py-1.5"
                            onClick={() => window.open(o.completionProof?.photoUrl, '_blank')}
                          >
                            Verify
                          </Button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-bold text-[#b91c1c]">{o.school?.name || 'Unknown School'}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Verified By: {o.contractor?.name || 'Staff'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">SUBMITTED: {o.completionProof?.gpsLocation?.lat?.toFixed(4)}, {o.completionProof?.gpsLocation?.lng?.toFixed(4)}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1 opacity-60">REGISTRY: {o.school?.location?.lat?.toFixed(4)}, {o.school?.location?.lng?.toFixed(4)}</div>
                        </td>
                        <td className="px-6 py-4">
                           <Badge variant="critical" className="text-[9px] font-bold uppercase py-0.5 px-2">Location Variance</Badge>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Breach Detected</span>
                             <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Outside Security Perimeter</span>
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
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-none">Last Synchronization: {lastSync.toLocaleTimeString()}</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
              <span className="text-[12px] font-bold text-blue-900 uppercase tracking-widest leading-none">Security Registry Operational</span>
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
