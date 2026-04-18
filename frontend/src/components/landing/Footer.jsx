import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Activity, Clock, Terminal, ShieldCheck, BarChart3, Radio, Database, Server } from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   MICRO-COMPONENTS (Institutional Dashboard Style)
   ───────────────────────────────────────────────────────── */
const SystemMetric = ({ label, value, color = '#2563eb' }) => (
  <div style={{ padding: '12px 24px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 9, fontWeight: 900, color: '#64748b', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'monospace' }}>[{value}]</span>
  </div>
);

const DigitalClock = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', borderLeft: '1px solid #e2e8f0' }}>
       <Clock size={14} color="#2563eb" />
       <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>{time}</span>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   MAIN SYSTEM FOOTER
   ───────────────────────────────────────────────────────── */
const Footer = () => {
  const [activeSchools, setActiveSchools] = useState(30412);
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSchools(prev => prev + (Math.random() > 0.5 ? 1 : -1));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const navGroups = [
    { title: 'Asset Management', links: ['School Registry', 'Inventory Logs', 'Condition Audit', 'SLA Tracking'] },
    { title: 'Analytics Engine', links: ['Predictive Models', 'Failure Windows', 'Impact Scoring', 'Risk Map'] },
    { title: 'Governance', links: ['DEO Dashboard', 'Policy Docs', 'Audit Reports', 'System Status'] },
  ];

  return (
    <footer style={{ background: '#fff', fontFamily: 'var(--font-body)', position: 'relative', overflow: 'hidden', borderTop: '2px solid #0f172a' }}>
      
      {/* Architectural Frame Base */}
      <div className="grid-lines" style={{ position: 'absolute', inset: 0, opacity: 0.6, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '8%', width: 1, background: '#e2e8f0', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '92%', width: 1, background: '#e2e8f0', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        
        {/* TOP STATUS BAR (Maintenance Network) */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', overflowX: 'auto' }}>
           <SystemMetric label="Total Schools" value={activeSchools.toLocaleString()} />
           <SystemMetric label="Prediction Acc" value="94.2%" color="#2563eb" />
           <SystemMetric label="Active Audits" value="1,204" />
           <SystemMetric label="System Core" value="SAKSHAM_v2.1" />
           <div style={{ flex: 1 }} />
           <DigitalClock />
        </div>

        {/* MAIN NAV SECTION */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', minHeight: 400 }}>
          
          {/* Brand & Stats Block */}
          <div style={{ padding: '80px 60px 80px 0', borderRight: '1px solid #e2e8f0' }}>
             <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 14, textDecoration: 'none', marginBottom: 32 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#0f172a', border: '2px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '4px 4px 0 #2563eb' }}>
                  <Building2 size={24} color="#fff" />
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em' }}>Saksham</span>
             </a>
             <p style={{ fontSize: '1.05rem', color: '#64748b', fontWeight: 600, lineHeight: 1.6, maxWidth: 340, marginBottom: 40 }}>
                AI-powered infrastructure terminal for government schools. Transforming reactive repairs into predictive maintenance cycles.
             </p>
             
             {/* Security Badge Pill */}
             <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 12, border: '2px solid #0f172a', background: '#fff', boxShadow: '6px 6px 0 #2563eb' }}>
                <ShieldCheck size={18} color="#2563eb" />
                <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.05em' }}>AI_PREDICT_CERTIFIED</span>
             </div>
          </div>

          {/* Dynamic Link Groups */}
          {navGroups.map((group, i) => (
            <div key={i} style={{ padding: '80px 0 80px 48px', borderRight: i < navGroups.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
               <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 32 }}>
                  {group.title}
               </h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                 {group.links.map((link, j) => (
                   <motion.a 
                    key={j} href="#" 
                    whileHover={{ x: 6, color: '#2563eb' }}
                    style={{ textDecoration: 'none', color: '#64748b', fontSize: 14, fontWeight: 700, transition: 'color 0.2s' }}
                   >
                     {link}
                   </motion.a>
                 ))}
               </div>
            </div>
          ))}
        </div>

        {/* BOTTOM TERMINAL FOOTNOTE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px 0', borderTop: '1px solid #e2e8f0' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Terminal size={16} color="#2563eb" />
              <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', margin: 0 }}>
                 &copy; {new Date().getFullYear()} Saksham Intelligence Engine. PREDICTIVE_CYCLE_ACTIVE
              </p>
           </div>

           {/* Architectural Social Boxes */}
           <div style={{ display: 'flex', gap: 8 }}>
              {['DISTRICT_HUB', 'STATE_LOGS', 'REPORTS_CSV', 'DEV_CORE'].map((tag, i) => (
                <motion.a 
                  key={i} href="#" 
                  whileHover={{ y: -4, borderColor: '#2563eb', color: '#2563eb', boxShadow: '4px 4px 0 #2563eb' }}
                  style={{ padding: '8px 12px', border: '2px solid #e2e8f0', borderRadius: 8, background: '#fff', textDecoration: 'none', fontSize: 10, fontWeight: 900, color: '#94a3b8', fontFamily: 'monospace', transition: 'all 0.2s' }}
                >
                  {tag}
                </motion.a>
              ))}
           </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;