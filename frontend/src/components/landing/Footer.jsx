import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Activity, Clock, Terminal, ShieldCheck, Cpu, Globe, Database, ArrowUpRight, Zap } from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   MICRO-COMPONENTS (Refined Terminal Style)
   ───────────────────────────────────────────────────────── */
const SystemMetric = ({ label, value, color = '#2563eb' }) => (
  <div style={{ padding: '16px 32px', borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
        <span style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
    </div>
    <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>[{value}]</span>
  </div>
);

const DigitalClock = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 32px', borderLeft: '1px solid #f1f5f9', background: '#fff' }}>
       <Clock size={16} color="#2563eb" />
       <span style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '1px' }}>{time}</span>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   MAIN SYSTEM FOOTER
   ───────────────────────────────────────────────────────── */
const Footer = () => {
  const [uptime, setUptime] = useState(99.982);

  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(prev => +(prev + (Math.random() > 0.5 ? 0.001 : -0.001)).toFixed(3));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const navGroups = [
    { title: 'Infrastructure', links: ['District Hub', 'Asset Registry', 'Structural Logs', 'GIS Mapping'] },
    { title: 'Intelligence', links: ['Predictive Models', 'Failure Windows', 'Impact Analysis', 'ML Training'] },
    { title: 'Support', links: ['API Documentation', 'System Status', 'Audit Protocol', 'Security Policy'] },
  ];

  return (
    <footer style={{ background: '#fff', fontFamily: 'var(--font-body)', position: 'relative', overflow: 'hidden', borderTop: '3px solid #0f172a' }}>
      


      <div style={{ maxWidth: 1440, margin: '0 auto', position: 'relative', zIndex: 10 }}>
        
        {/* TOP STATUS BAR (Live Monitoring) */}
        <div style={{ display: 'flex', borderBottom: '2px solid #0f172a', background: '#fff', overflowX: 'auto', whiteSpace: 'nowrap' }}>
           <SystemMetric label="Operational_Mode" value="PREDICTIVE_LIVE" />
           <SystemMetric label="Uptime_Protocol" value={`${uptime}%`} />
           <SystemMetric label="Node_Status" value="GUJARAT_WEST_01" />
           <SystemMetric label="API_Core" value="v2.4.0_STABLE" color="#22c55e" />
           <div style={{ flex: 1 }} />
           <DigitalClock />
        </div>

        {/* MAIN FOOTER CONTENT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', padding: '0 40px' }}>
          
          {/* Brand Block */}
          <div style={{ padding: '80px 60px 80px 0', borderRight: '1px solid #f1f5f9' }}>
             <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 14, textDecoration: 'none', marginBottom: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#0f172a', border: '2px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '4px 4px 0 #2563eb' }}>
                  <Building2 size={24} color="#fff" />
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em' }}>Saksham</span>
             </a>
             <p style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: 600, lineHeight: 1.6, maxWidth: 360, marginBottom: 40 }}>
                The definitive predictive maintenance engine for institutional infrastructure. Data-driven safety for every classroom.
             </p>
             
             {/* Security Badge */}
             <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '12px 24px', borderRadius: 14, border: '2px solid #0f172a', background: '#fff', boxShadow: '6px 6px 0 #0f172a' }}>
                <ShieldCheck size={20} color="#2563eb" />
                <span style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', letterSpacing: '0.05em' }}>ISO_27001_CERTIFIED_CORE</span>
             </div>
          </div>

          {/* Links Sections */}
          {navGroups.map((group, i) => (
            <div key={i} style={{ padding: '80px 0 80px 48px', borderRight: i < navGroups.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
               <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 36 }}>
                  {group.title}
               </h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                 {group.links.map((link, j) => (
                   <motion.a 
                    key={j} href="#" 
                    whileHover={{ x: 6, color: '#2563eb' }}
                    style={{ textDecoration: 'none', color: '#64748b', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                   >
                     {link} <ArrowUpRight size={12} style={{ opacity: 0 }} className="arrow-hover" />
                   </motion.a>
                 ))}
               </div>
            </div>
          ))}
        </div>

        {/* BOTTOM TERMINAL FOOTNOTE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px', borderTop: '2px solid #0f172a', background: '#fff' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Terminal size={18} color="#2563eb" />
              <p style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', fontFamily: 'monospace', margin: 0 }}>
                 &copy; {new Date().getFullYear()} SAKSHAM_INTELLIGENCE // ENCRYPTION_AES_256_ACTIVE
              </p>
           </div>

           {/* System Social Tags */}
           <div style={{ display: 'flex', gap: 10 }}>
              {['SERVER_A1', 'DEO_DASH', 'OPS_LOGS', 'SYS_SEC'].map((tag, i) => (
                <motion.a 
                  key={i} href="#" 
                  whileHover={{ y: -4, borderColor: '#2563eb', color: '#2563eb', boxShadow: '4px 4px 0 #2563eb' }}
                  style={{ padding: '8px 16px', border: '2px solid #e2e8f0', borderRadius: 8, background: '#fff', textDecoration: 'none', fontSize: 10, fontWeight: 900, color: '#94a3b8', fontFamily: 'monospace', transition: 'all 0.2s' }}
                >
                  [{tag}]
                </motion.a>
              ))}
           </div>
        </div>

      </div>

      <style>{`
        .grid-lines {
          background-image: 
            linear-gradient(rgba(30, 58, 138, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30, 58, 138, 0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        a:hover .arrow-hover {
          opacity: 1 !important;
        }
      `}</style>

            {/* Background Decor - Fixed UNDEFINED variables */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div className="grid-lines mb-40" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />
        <div 
          style={{ 
            position: 'absolute', top: '60%', left: '50%', transform: 'translate(-50%, -50%)', 
            fontFamily: 'var(--font-display)', fontSize: '20vw', fontWeight: 900, 
            color: '#f8fafc', letterSpacing: '-0.05em', whiteSpace: 'nowrap', userSelect: 'none', zIndex: 0 
          }}
        >
          SAKSHAM
        </div>
      </div>
    </footer>
  );
};

export default Footer;