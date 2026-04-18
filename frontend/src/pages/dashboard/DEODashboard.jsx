import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, animate } from 'framer-motion';
import { useNavigate } from "react-router-dom";
import { get } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { roleSubPath } from "../../utils/roleRoutes.js";
import EvidenceDrawer from "../../components/common/EvidenceDrawer";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import MetricCard from "../../components/common/MetricCard";
import PageHeader from "../../components/common/PageHeader";
import ForwardedReportsPanel from "../../components/deo/ForwardedReportsPanel";
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
  const { t } = useLanguage();

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

  // Determine image based on user district or fallback
  const districtStr = user?.district || "District";
  const imgIndex = (districtStr.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 10;
  const images = [
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80',
    'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=1200&q=80',
    'https://images.unsplash.com/photo-1510531704581-5b2870972060?w=1200&q=80',
    'https://images.unsplash.com/photo-1498075702571-ecb018f3752d?w=1200&q=80',
    'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=1200&q=80',
    'https://images.unsplash.com/photo-1584697964149-14a9386d3b4d?w=1200&q=80',
    'https://images.unsplash.com/photo-1536337005238-94b997371b40?w=1200&q=80',
    'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&q=80',
    'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=1200&q=80'
  ];
  const imageUrl = images[imgIndex];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <style>{GLOBAL_CSS}</style>

      {/* Massive Hero Banner */}
      <div className="relative w-full h-[400px] bg-slate-900">
        <img src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80" alt="District Banner" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        <div className="absolute bottom-24 left-0 right-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
                {t('deo.title')}
              </h1>
              <p className="mt-2 text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <LayoutList size={14} /> {t('deo.subtitle')}
              </p>
            </div>
            
            <div className="flex items-center">
              <Button 
                onClick={() => navigate(roleSubPath(user?.role, "work-orders"))}
                variant="secondary"
                className="font-black uppercase tracking-widest text-[10px] bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md shadow-xl"
              >
                {t('deo.all_work_orders')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-8 pb-12">
        {/* REPORT METRICS - Floating Over Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 -mt-16 relative z-10">
          <MetricCard label={t('deo.assessed_schools')} value={<Counter to={stats.totalSchools} />} icon={Building2} variant="info" />
          <MetricCard label={t('deo.critical_risk')} value={<Counter to={stats.criticalCount} />} icon={AlertTriangle} variant="critical" />
          <MetricCard label={t('deo.high_priority')} value={<Counter to={stats.highRiskCount} />} icon={Activity} variant="high" trend="up" trendValue={t('deo.trending')} />
          <MetricCard label={t('deo.avg_survival')} value={<Counter to={stats.avgUrgency} suffix={` ${t('deo.days')}`} />} icon={Wrench} variant="success" />
        </div>

        {/* FORWARDED-BY-PRINCIPAL bundles — sorted by LR urgency */}
        <ForwardedReportsPanel district={user?.district || district} />

        <Card noPadding variant="gov" title={t('deo.risk_queue_title')} subtitle={t('deo.risk_queue_subtitle')} className="overflow-visible">
          <div className="border-b border-slate-100 px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex gap-1">
              <Button 
                variant={activeTab === 'queue' ? 'primary' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab("queue")}
              >
                {t('deo.risk_queue_tab')}
              </Button>
              <Button 
                variant={activeTab === 'flagged' ? 'danger' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab("flagged")}
              >
                {t('deo.gps_mismatches_tab')}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  placeholder={t('deo.filter_placeholder')} 
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

          <div className="p-6">
            {activeTab === "queue" ? (
              loading ? (
                <div className="py-12 text-center text-slate-400">{t('deo.loading_scans')}</div>
              ) : data.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium text-sm">{t('deo.no_critical_nodes')}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.map((s, idx) => {
                    const imgIndex = (String(s.schoolId).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 10;
                    const images = [
                      'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80',
                      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80',
                      'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=600&q=80',
                      'https://images.unsplash.com/photo-1510531704581-5b2870972060?w=600&q=80',
                      'https://images.unsplash.com/photo-1498075702571-ecb018f3752d?w=600&q=80',
                      'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=600&q=80',
                      'https://images.unsplash.com/photo-1584697964149-14a9386d3b4d?w=600&q=80',
                      'https://images.unsplash.com/photo-1536337005238-94b997371b40?w=600&q=80',
                      'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&q=80',
                      'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80'
                    ];
                    const imageUrl = images[imgIndex];

                    return (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedSchool({...s, coverImage: imageUrl})} 
                        className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
                      >
                        {/* Image Cover */}
                        <div className="h-40 w-full relative overflow-hidden bg-slate-200">
                          <img src={imageUrl} alt={s.schoolName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-[#0f172a]/40 to-transparent" />
                          
                          {/* Badges on Image */}
                          <div className="absolute top-3 left-3 flex gap-2">
                            <span className="bg-red-500/90 backdrop-blur-sm text-white px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm">
                              {t('deo.score')}: {s.priorityScore}
                            </span>
                          </div>
                          
                          <div className="absolute bottom-3 left-4 right-4">
                            <h3 className="text-white font-black text-lg leading-tight truncate drop-shadow-md">{s.schoolName}</h3>
                            <p className="text-slate-200 text-xs font-semibold uppercase tracking-widest mt-0.5">{s.block}, {s.district}</p>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 flex flex-col flex-grow">
                          <div className="flex gap-1.5 flex-wrap mb-4"> 
                            {s.categories.map(cat => (
                              <Badge key={cat} variant="default" size="sm">{cat}</Badge>
                            ))} 
                          </div>

                          <div className="mt-auto space-y-2 mb-4">
                            <div className="flex justify-between items-end">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('deo.failure_horizon')}</span>
                              <span className="text-sm font-black text-slate-800">{s.daysToFailure} {t('deo.days')}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                              <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${Math.max(10, 100 - (s.daysToFailure / 180 * 100))}%` }} 
                                className={`h-full ${s.daysToFailure < 30 ? 'bg-red-500' : s.daysToFailure < 60 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                              />
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('deo.student_impact')}</span>
                              <span className="text-sm font-black text-slate-800">{s.studentImpactScore} <span className="text-slate-400">{t('deo.pts')}</span></span>
                            </div>
                            <Button 
                              variant="primary" 
                              size="sm"
                              className="shadow-md"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                navigate(`${roleSubPath(user?.role, "work-orders/new")}?schoolId=${s.schoolId}&school=${encodeURIComponent(s.schoolName)}&category=${s.highestPriorityCategory}&score=${s.priorityScore}`); 
                              }}
                            >
                              {t('deo.resolve')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              // FLAGGED MISMATCH TAB
              flaggedOrders.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center' }}><ShieldAlert size={32} color="#fecaca" style={{ margin: '0 auto 12px' }} /><p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{t('deo.no_mismatches')}</p></div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[12px] font-bold text-slate-500 uppercase tracking-widest">{t('deo.th.protocol')}</th>
                      <th className="px-6 py-4 text-[12px] font-bold text-slate-500 uppercase tracking-widest">{t('deo.th.contractor')}</th>
                      <th className="px-6 py-4 text-[12px] font-bold text-slate-500 uppercase tracking-widest">{t('deo.th.coordinates')}</th>
                      <th className="px-6 py-4 text-[12px] font-bold text-slate-500 uppercase tracking-widest">{t('deo.th.alert')}</th>
                      <th className="px-6 py-4 text-[12px] font-bold text-slate-500 uppercase tracking-widest">{t('deo.th.variance')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flaggedOrders.map((o, idx) => (
                      <tr key={idx} className="trow border-b border-red-50 bg-red-50/30">
                        <td className="px-6 py-4">
                          <Button variant="danger" size="sm" onClick={() => window.open(o.completionProof?.photoUrl, '_blank')}>{t('deo.verify_proof')}</Button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-bold text-[#b91c1c]">{o.school?.name || t('deo.unknown_school')}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{t('deo.verified_by')}: {o.contractor?.name || t('deo.staff')}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{t('deo.submitted')}: {o.completionProof?.gpsLocation?.lat?.toFixed(4)}, {o.completionProof?.gpsLocation?.lng?.toFixed(4)}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1 opacity-60">{t('deo.registry')}: {o.school?.location?.lat?.toFixed(4)}, {o.school?.location?.lng?.toFixed(4)}</div>
                        </td>
                        <td className="px-6 py-4">
                           <Badge variant="critical" className="text-[9px] font-bold uppercase py-0.5 px-2">{t('deo.location_variance')}</Badge>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest">{t('deo.breach_detected')}</span>
                             <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{t('deo.outside_perimeter')}</span>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-none">{t('deo.last_sync')}: {lastSync.toLocaleTimeString()}</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
              <span className="text-[12px] font-bold text-blue-900 uppercase tracking-widest leading-none">{t('deo.security_registry_operational')}</span>
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
        coverImage={selectedSchool?.coverImage}
      />
    </div>
  );
}
