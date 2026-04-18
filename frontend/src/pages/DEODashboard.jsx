import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, animate } from 'framer-motion';
import { useNavigate } from "react-router-dom";
import { get } from "../services/api";
import EvidenceDrawer from "../components/EvidenceDrawer";
import {
  Activity, LayoutList, Wrench, AlertTriangle, Building2, 
  Cpu, ChevronRight, RefreshCw, Zap, ShieldAlert, Radio, 
  Globe, Database, ArrowRight, MapPin
} from 'lucide-react';
// Map no longer used in Dashboard


/* ─────────────────────────────────────────────────────────
   BLUE NEO-BRUTALIST SYSTEM + SMOOTH SCROLLING
   ───────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

  html {
    scroll-behavior: smooth;
  }

  :root {
    --font-display: 'Clash Display', 'Cabinet Grotesk', system-ui, sans-serif;
    --font-mono: 'Space Mono', monospace;
    --blue: #2563eb;
    --blue-light: #eff6ff;
    --dark: #0f172a;
    --slate: #64748b;
    --bg: #ffffff;
  }

  @keyframes scan-line-wipe {
    0% { left: -10%; opacity: 0; }
    5% { opacity: 1; }
    95% { opacity: 1; }
    100% { left: 110%; opacity: 0; }
  }

  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  .grid-lines {
    background-image:
      linear-gradient(rgba(15,23,42,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(15,23,42,0.05) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  /* Core AdminDashboard Shadow System */
  .neo-card {
    background: var(--bg);
    border: 2px solid var(--dark);
    box-shadow: 6px 6px 0 var(--dark);
    transition: box-shadow 0.2s ease, transform 0.2s ease;
  }
  .neo-card:hover {
    box-shadow: 10px 10px 0 var(--blue);
    transform: translate(-2px, -2px);
  }

  /* Left-Aligned Neo Button */
  .neo-btn {
    background: var(--blue);
    color: #fff;
    border: 2px solid var(--dark);
    padding: 12px 24px;
    border-radius: 8px;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    box-shadow: 4px 4px 0 var(--dark);
    cursor: pointer;
    transition: all 0.2s;
  }
  .neo-btn:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0 var(--dark);
  }

  .neo-btn-outline {
    background: #fff;
    color: var(--dark);
    border: 2px solid var(--dark);
    padding: 8px 16px;
    border-radius: 6px;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: 3px 3px 0 var(--dark);
    cursor: pointer;
    transition: all 0.2s;
  }
  .neo-btn-outline:hover {
    background: var(--dark);
    color: #fff;
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0 var(--blue);
  }

  /* Universal Tag (Monochrome Blue) */
  .step-tag {
    display: inline-flex;
    padding: 4px 10px;
    border-radius: 4px;
    background: var(--blue-light);
    border: 1px solid var(--blue);
    color: var(--blue);
    font-size: 9px;
    font-weight: 900;
    font-family: var(--font-mono);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .trow { transition: background 0.18s; }
  .trow:hover { background: var(--blue-light); }

  /* Inputs */
  input, select {
    background: #fff;
    border: 2px solid var(--dark);
    border-radius: 8px;
    padding: 10px 14px;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    color: var(--dark);
    outline: none;
    box-shadow: 3px 3px 0 var(--dark);
    transition: all 0.2s;
  }
  input:focus, select:focus {
    box-shadow: 4px 4px 0 var(--blue);
    transform: translate(-1px, -1px);
  }

  /* Smooth Custom Scrollbar */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--dark); }
`;

const Counter = ({ to, prefix = '', suffix = '' }) => {
  const ref = useRef(null);
  useEffect(() => {
    const ctrl = animate(0, to, {
      duration: 1.5, ease: 'easeOut',
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
  
  // New state for GPS Mismatch feature
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
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-display)' }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── HERO HEADER ── */}
      <div style={{ background: '#0f172a', position: 'relative', overflow: 'hidden', paddingTop: 96, paddingBottom: 80 }}>
        {/* Grid Background */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, transparent, #2563eb, transparent)', opacity: 0.5, left: '15%', animation: 'scan-line-wipe 9s linear infinite' }} />
        
        {/* Watermark */}
        <div style={{ position: 'absolute', bottom: -15, left: 0, fontFamily: 'var(--font-display)', fontSize: '15vw', fontWeight: 900, color: 'rgba(255,255,255,0.03)', letterSpacing: '-0.05em', whiteSpace: 'nowrap', userSelect: 'none', lineHeight: 1 }}>
          COMMAND
        </div>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 40 }}>
            
            {/* Left: Main Title & Action Button */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderRadius: 99, border: '2px solid rgba(37, 99, 235, 0.4)', background: 'rgba(37, 99, 235, 0.1)', marginBottom: 28, backdropFilter: 'blur(10px)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 12px #3b82f6' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#60a5fa', letterSpacing: '0.14em' }}>SYSTEM SECURE & ONLINE</span>
              </div>
              
              <h1 style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 900, color: '#fff', lineHeight: 0.95, letterSpacing: '-0.04em', margin: '0 0 20px' }}>
                Maintenance<br />
                <span style={{ color: '#3b82f6' }}>Command Center</span>
              </h1>
              
              <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: 480, margin: '0 0 32px' }}>
                Live risk intelligence, failure prediction, and automated work-order generation for district infrastructure.
              </p>
              
              {/* Geometric Left-Aligned Button */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  onClick={() => navigate("/dashboard/work-orders")}
                  className="neo-btn"
                >
                  <LayoutList size={18} /> Manage Work Orders
                </button>

                {flaggedOrders.length > 0 && (
                  <button 
                    onClick={() => setActiveTab("flagged")}
                    className="neo-btn"
                    style={{ background: '#ef4444', border: '2px solid #0f172a' }}
                  >
                    <ShieldAlert size={18} /> 
                    <span style={{ marginLeft: 4 }}>{flaggedOrders.length} Flagged Mismatches</span>
                  </button>
                )}
                
                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                    className="neo-btn"
                    style={{ background: alerts.length > 0 ? '#f59e0b' : '#334155' }}
                  >
                    <Radio size={18} className={alerts.length > 0 ? "animate-pulse" : ""} />
                    {alerts.length > 0 && <span style={{ marginLeft: 6, background: '#fff', color: '#f59e0b', padding: '0 6px', borderRadius: 6, fontSize: 10 }}>{alerts.length}</span>}
                  </button>

                  {showNotificationPanel && (
                    <div className="neo-card" style={{ position: 'absolute', top: '120%', right: 0, width: 320, zIndex: 100, padding: 16, maxHeight: 400, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '2px solid #0f172a', paddingBottom: 8 }}>
                        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 900 }}>GPS ALERT FEED</h4>
                        <span className="step-tag">REAL-TIME</span>
                      </div>
                      {alerts.length === 0 ? (
                        <p style={{ fontSize: 11, color: '#64748b', textAlign: 'center', padding: '20px 0' }}>No active GPS alerts</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {alerts.map((a, i) => (
                            <div key={i} style={{ padding: 10, borderRadius: 8, background: '#fff1f2', border: '1px solid #fecaca' }}>
                              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#991b1b' }}>{a.message}</p>
                              <p style={{ margin: '4px 0 0', fontSize: 9, color: '#b91c1c', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{new Date(a.createdAt).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Right: Telemetry */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 20 }}>
              {[
                { label: 'Forecast Acc', value: '98.4%', icon: ShieldAlert },
                { label: 'Sys Uptime', value: '100%', icon: Radio },
                { label: 'API Latency', value: '42ms', icon: Cpu },
              ].map((item, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '16px 20px', backdropFilter: 'blur(12px)', minWidth: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <item.icon size={14} color="#60a5fa" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>{item.value}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── TICKER ── */}
      <div style={{ background: '#0f172a', borderTop: '2px solid #1e293b', borderBottom: '2px solid #0f172a', padding: '12px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', animation: 'marquee 28s linear infinite', width: 'max-content' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 40, paddingRight: 40 }}>
              {['STRUCTURAL INTEGRITY: SYNCED', 'ELECTRICAL: VERIFIED', 'WATER SENSORS: ONLINE', 'THERMAL SCAN: COMPLETE'].map((t, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
                  <Zap size={12} color="#3b82f6" fill="#3b82f6" /> {t}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '56px 32px 100px', position: 'relative' }}>
        <div className="grid-lines" style={{ position: 'absolute', inset: 0, zIndex: -1, opacity: 0.7 }} />

        {/* ── BENTO STAT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 48 }}>
          {[
            { label: 'Target Schools', val: stats.totalSchools, icon: Building2 },
            { label: 'Critical Failure', val: stats.criticalCount, icon: AlertTriangle },
            { label: 'High Priority', val: stats.highRiskCount, icon: Activity },
            { label: 'MTTF Average', val: stats.avgUrgency, icon: Wrench, suffix: ' Days' },
          ].map((s, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ delay: i * 0.1, duration: 0.4 }} 
              className="neo-card" 
              style={{ padding: 28, borderRadius: 20, position: 'relative' }}
            >
              <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, background: '#2563eb', opacity: 0.08, borderRadius: '0 18px 0 60px' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#eff6ff', border: '2px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={22} color="#2563eb" />
                </div>
                <div className="step-tag">LIVE</div>
              </div>
              
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</p>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>
                <Counter to={s.val} suffix={s.suffix} />
              </h3>
            </motion.div>
          ))}
        </div>

        {/* ── DATA DIRECTORY ── */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 0.5 }}
          className="neo-card" 
          style={{ borderRadius: 24, overflow: 'hidden' }}
        >
          {/* Table Header/Filters */}
          <div style={{ padding: '28px 32px', borderBottom: '2px solid #0f172a', background: '#fafafa', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
               <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', border: '2px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '3px 3px 0 #0f172a' }}>
                 <Database size={20} color="#2563eb" />
               </div>
               <div>
                 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>Control Dashboard</h2>
                 <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                   <button 
                     onClick={() => setActiveTab("queue")}
                     style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, color: activeTab === 'queue' ? '#2563eb' : '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: activeTab === 'queue' ? '2px solid #2563eb' : '2px solid transparent' }}
                   >
                     PREDICTIVE QUEUE ({data.length})
                   </button>
                   <button 
                     onClick={() => setActiveTab("flagged")}
                     style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, color: activeTab === 'flagged' ? '#ef4444' : '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: activeTab === 'flagged' ? '2px solid #ef4444' : '2px solid transparent' }}
                   >
                     🚩 FLAGGED MISMATCHES ({flaggedOrders.length})
                   </button>
                 </div>
               </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
               <input placeholder="Search District" value={district} onChange={e => setDistrict(e.target.value)} style={{ width: 140 }} />
               <input placeholder="Search Block" value={block} onChange={e => setBlock(e.target.value)} style={{ width: 140 }} />
               <select value={category} onChange={e => setCategory(e.target.value)}>
                 <option value="">All Vectors</option>
                 <option value="structural">Structural</option>
                 <option value="electrical">Electrical</option>
                 <option value="plumbing">Plumbing</option>
               </select>
               <button onClick={fetchData} className="neo-btn-outline" style={{ padding: '0 16px' }}>
                 <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
               </button>
            </div>
          </div>

          {/* Table Content */}
          <div style={{ overflowX: 'auto', scrollBehavior: 'smooth' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', background: '#fafafa' }}>
                  <th style={{ padding: '16px 32px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Action</th>
                  <th style={{ padding: '16px 32px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Entity Details</th>
                  <th style={{ padding: '16px 32px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Alert Vectors</th>
                  <th style={{ padding: '16px 32px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Forecast Horizon</th>
                  <th style={{ padding: '16px 32px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Impact Weight</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === "queue" ? (
                  loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i}><td colSpan={5} style={{ padding: 32 }}><div style={{ height: 20, width: '100%', background: '#f1f5f9', borderRadius: 4, animation: 'pulse 1.5s infinite' }} /></td></tr>
                    ))
                  ) : data.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 60, textAlign: 'center' }}><Globe size={32} color="#e2e8f0" style={{ margin: '0 auto 12px' }} /><p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>NO RISK NODES DETECTED</p></td></tr>
                  ) : (
                    data.map((s, idx) => (
                      <tr key={idx} onClick={() => setSelectedSchool(s)} className="trow" style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                        <td style={{ padding: '22px 32px' }}>
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/work-orders/new?schoolId=${s.schoolId}&school=${encodeURIComponent(s.schoolName)}&category=${s.highestPriorityCategory}&score=${s.priorityScore}`); }} className="neo-btn-outline"> Deploy <ArrowRight size={14} /> </button>
                        </td>
                        <td style={{ padding: '22px 32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, boxShadow: '2px 2px 0 #2563eb' }}> {s.schoolName.charAt(0)} </div>
                            <div>
                              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#0f172a', lineHeight: 1.2 }}>{s.schoolName}</div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748b', fontWeight: 600 }}>{s.block}, {s.district}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '22px 32px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}> {s.categories.map(cat => <span key={cat} className="step-tag">{cat}</span>)} </div>
                        </td>
                        <td style={{ padding: '22px 32px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{s.daysToFailure} DAYS</div>
                            <div style={{ width: 120, height: 6, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(10, 100 - s.daysToFailure)}%` }} style={{ height: '100%', background: '#2563eb' }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '22px 32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{s.studentImpactScore}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>USERS</span>
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
                      <tr key={idx} className="trow" style={{ borderBottom: '1px solid #fee2e2', background: '#fff1f2' }}>
                        <td style={{ padding: '22px 32px' }}>
                          <button onClick={() => window.open(o.completionProof?.photoUrl, '_blank')} className="neo-btn-outline" style={{ background: '#ef4444', color: '#fff' }}> View Proof </button>
                        </td>
                        <td style={{ padding: '22px 32px' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#991b1b' }}>{o.school?.name || 'Unknown School'}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>By: {o.contractor?.name || 'Unassigned'}</div>
                        </td>
                        <td style={{ padding: '22px 32px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b' }}>SUBMITTED: {o.completionProof?.gpsLocation?.lat?.toFixed(4)}, {o.completionProof?.gpsLocation?.lng?.toFixed(4)}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', marginTop: 4 }}>ACTUAL: {o.school?.location?.lat?.toFixed(4)}, {o.school?.location?.lng?.toFixed(4)}</div>
                        </td>
                        <td style={{ padding: '22px 32px' }}>
                           <span style={{ background: '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 900 }}>🚩 MISMATCH</span>
                        </td>
                        <td style={{ padding: '22px 32px' }}>
                           <div style={{ display: 'flex', flexDirection: 'column' }}>
                             <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, color: '#991b1b' }}>GPS LOCK ERR</span>
                             <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#b91c1c' }}>OUTSIDE RADIUS</span>
                           </div>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div style={{ padding: '16px 32px', borderTop: '2px solid #f1f5f9', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.1em' }}>LAST REFRESH: {lastSync.toLocaleTimeString()}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em' }}>LIVE SYNC</span>
            </div>
          </div>
        </motion.div>
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