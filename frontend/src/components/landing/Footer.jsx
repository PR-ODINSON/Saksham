import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Activity, Clock, Terminal, ShieldCheck, Cpu, Globe, Database, ArrowUpRight, Zap, Mail, Send } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

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
  const { t } = useLanguage();
  const [uptime, setUptime] = useState(99.982);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(prev => +(prev + (Math.random() > 0.5 ? 0.001 : -0.001)).toFixed(3));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const navGroups = [
    { 
      title: t('foot.useful_links'), 
      links: [
        { name: t('foot.about'), href: '#about' },
        { name: t('foot.features'), href: '#features' },
        { name: t('foot.app_preview'), href: '#preview' },
        { name: t('foot.pricing'), href: '#pricing' }
      ] 
    },
    { 
      title: t('foot.legal_support'), 
      links: [
        { name: t('foot.privacy'), href: '/privacy' },
        { name: t('foot.terms'), href: '/terms' },
        { name: t('foot.system_status'), href: '/status' },
        { name: t('foot.contact'), href: '/support' }
      ] 
    },
  ];

  return (
    <footer style={{ background: '#fff', color: '#0f172a', fontFamily: 'var(--font-body)', position: 'relative', overflow: 'hidden', borderTop: '3px solid #0f172a' }}>
      
      <div style={{ maxWidth: 1440, margin: '0 auto', position: 'relative', zIndex: 10 }}>
        
        {/* TOP STATUS BAR (Live Monitoring) */}
        <div style={{ display: 'flex', borderBottom: '2px solid #0f172a', background: '#fff', overflowX: 'auto', whiteSpace: 'nowrap' }}>
           <SystemMetric label={t('foot.op_mode')} value={t('foot.predictive_live')} />
           <SystemMetric label={t('foot.uptime')} value={`${uptime}%`} />
           <SystemMetric label={t('foot.node_status')} value={t('foot.gujarat_west')} />
           <SystemMetric label={t('foot.api_core')} value={t('foot.v2_stable')} color="#22c55e" />
           <div style={{ flex: 1 }} />
           <DigitalClock />
        </div>

        {/* MAIN FOOTER CONTENT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 1.2fr', padding: '0 40px' }}>
          
          {/* Brand Block */}
          <div style={{ padding: '80px 40px 80px 0', borderRight: '1px solid #f1f5f9' }}>
             <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 14, textDecoration: 'none', marginBottom: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#0f172a', border: '2px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '4px 4px 0 #2563eb' }}>
                  <Building2 size={24} color="#fff" />
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em' }}>Saksham</span>
             </a>
             <p style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600, lineHeight: 1.6, maxWidth: 300 }}>
                {t('foot.desc')}
             </p>
          </div>

          {/* Links Sections */}
          {navGroups.map((group, i) => (
            <div key={i} style={{ padding: '80px 0 80px 40px', borderRight: '1px solid #f1f5f9' }}>
               <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 36 }}>
                  {group.title}
               </h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                 {group.links.map((link, j) => (
                   <motion.a 
                    key={j} href={link.href} 
                    whileHover={{ x: 6, color: '#2563eb' }}
                    style={{ textDecoration: 'none', color: '#64748b', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                   >
                     {link.name} <ArrowUpRight size={12} style={{ opacity: 0 }} className="arrow-hover" />
                   </motion.a>
                 ))}
               </div>
            </div>
          ))}

          {/* Subscribe Block (Right side) */}
          <div style={{ padding: '80px 0 80px 40px' }}>
             <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 24 }}>
                {t('foot.stay_updated')}
             </h4>
             <p style={{ fontSize: 14, color: '#64748b', fontWeight: 700, marginBottom: 24, lineHeight: 1.5 }}>
                {t('foot.stay_updated_desc')}
             </p>
             <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px', borderRadius: 16, background: '#f8fafc', border: '2px solid #0f172a', boxShadow: '6px 6px 0 #0f172a' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
                      <Mail size={16} color="#64748b" />
                      <input 
                         type="text" 
                         placeholder={t('foot.enter_email')}
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         style={{ background: 'transparent', border: 'none', color: '#0f172a', fontSize: 13, fontWeight: 700, outline: 'none', width: '100%' }}
                      />
                   </div>
                   <motion.button 
                      whileHover={{ scale: 1.02, background: '#1d4ed8' }}
                      whileTap={{ scale: 0.98 }}
                      style={{ padding: '14px', borderRadius: 10, background: '#0f172a', border: 'none', color: '#fff', fontWeight: 900, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                   >
                      {t('foot.subscribe')} <Send size={14} />
                   </motion.button>
                </div>
             </div>
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px', borderTop: '2px solid #0f172a', position: 'relative', zIndex: 10 }}>
           <p style={{ fontSize: 13, fontWeight: 800, color: '#64748b', margin: 0 }}>
              {t('foot.made_in')}
           </p>
           <p style={{ fontSize: 13, fontWeight: 800, color: '#64748b', margin: 0 }}>
              {t('foot.copyright')} {new Date().getFullYear()}, All rights reserved.
           </p>
        </div>

      </div>

      <style>{`
        .grid-lines {
          background-image: 
            linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        a:hover .arrow-hover {
          opacity: 1 !important;
        }
      `}</style>

      {/* Background Decor - Extreme End Clay Saksham Text */}
      <div style={{ position: 'relative', width: '100%', height: 'auto', pointerEvents: 'none', padding: '80px 0' }}>
        <div className="grid-lines" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />
        <div 
          style={{ 
            fontFamily: 'var(--font-display)', fontSize: '18vw', fontWeight: 900, 
            letterSpacing: '-0.05em', whiteSpace: 'nowrap', 
            userSelect: 'none', zIndex: 0, textAlign: 'center', lineHeight: 0.8,
            background: 'linear-gradient(to bottom, #e2e8f0 30%, rgba(226, 232, 240, 0) 95%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 30px rgba(148, 163, 184, 0.1)'
          }}
        >
          SAKSHAM
        </div>
      </div>
    </footer>
  );
};

export default Footer;
