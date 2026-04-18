import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Activity, Wrench, ShieldAlert, BarChart3, LayoutList, History, ChevronRight, Cpu, CheckCircle2 } from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   MICRO-COMPONENTS (Hardware Aesthetic - Now in Blue)
   ───────────────────────────────────────────────────────── */
const MicroTag = ({ text, top, right, bottom, left, color = '#64748b' }) => (
  <div style={{ position: 'absolute', top, right, bottom, left, fontFamily: 'monospace', fontSize: 9, fontWeight: 800, color, letterSpacing: '0.1em', padding: '4px 8px', borderRadius: 4, zIndex: 20 }}>
    [{text}]
  </div>
);

// Inline SVG noise — no external request, no 403
const NOISE_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E`;

const GrainOverlay = () => (
  <div style={{ position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none', mixBlendMode: 'multiply', backgroundImage: `url("${NOISE_SVG}")` }} />
);

/* ─────────────────────────────────────────────────────────
   MAIN FEATURES SECTION: SAKSHAM (BLUE THEME)
   ───────────────────────────────────────────────────────── */
const FeaturesSection = () => {
  const [activeCard, setActiveCard] = useState(null);

  const cardVariants = {
    hover: { y: -8, scale: 1.01, boxShadow: '24px 24px 0 rgba(30,58,138,0.1)' }
  };

  return (
    <section id="features" style={{ padding: '140px 0', background: '#fff', position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>
      <GrainOverlay />
      
      <div className="grid-lines" style={{ position: 'absolute', inset: 0, opacity: 0.6 }} />
      <div style={{ position: 'absolute', top: '15%', left: 0, right: 0, height: 1, background: '#e2e8f0' }} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 10 }}>

        {/* Header: Institutional Precision */}
        <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 80px' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 99, background: '#f8fafc', border: '2px solid #0f172a', color: '#0f172a', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24, boxShadow: '4px 4px 0 #2563eb' }}>
            <Cpu size={14} color="#2563eb" /> Infrastructure Intelligence
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', fontWeight: 800, color: '#0f172a', lineHeight: 1.05, letterSpacing: '-0.03em' }}>
            Predictive Core.<br/>
            <span style={{ color: '#64748b' }}>Structural Precision.</span>
          </motion.h2>
        </div>

        {/* Bento Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 32 }}>

          {/* LARGE CARD: Category-Specific Prediction [cite: 107] */}
          <motion.div 
            onHoverStart={() => setActiveCard('universal')} onHoverEnd={() => setActiveCard(null)}
            variants={cardVariants} whileHover="hover"
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 32, border: '3px solid #0f172a', padding: '56px 64px', position: 'relative', overflow: 'hidden', boxShadow: '16px 16px 0 #0f172a', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 64, alignItems: 'center' }}
          >
            <MicroTag text="DATA_MOD_v3.2" top={24} right={24} />
            <MicroTag text="60D_FORECAST" bottom={24} left={64} />
            
            <div>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
                <Activity size={32} color="#2563eb" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 20px 0', lineHeight: 1.1 }}>Multi-Factor Forecast</h3>
              <p style={{ fontSize: '1.2rem', color: '#64748b', fontWeight: 500, lineHeight: 1.6, margin: '0 0 40px' }}>
                Forecast failure windows for 30,000+ buildings using building age, material, and weather zone data[cite: 103, 105, 120].
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {['STRUCTURAL', 'PLUMBING', 'ELECTRICAL'].map((tag, i) => (
                  <div key={i} style={{ padding: '8px 14px', borderRadius: 10, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>{tag}</div>
                ))}
              </div>
            </div>

            <div style={{ position: 'relative', width: '100%', height: 400, background: '#f8fafc', borderRadius: 24, border: '2px solid #0f172a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div className="grid-lines" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />
               <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', width: 500, height: 500, border: '1px dashed #cbd5e1', borderRadius: '50%' }} />
               
               <svg width="240" height="240" viewBox="0 0 200 200" style={{ position: 'relative', zIndex: 10 }}>
                 <rect x="40" y="80" width="120" height="80" rx="4" stroke="#0f172a" strokeWidth="4" fill="#fff" />
                 <path d="M40,80 L100,30 L160,80" stroke="#0f172a" strokeWidth="4" fill="none" />
                 <circle cx="80" cy="110" r="10" fill="#2563eb" />
                 <circle cx="120" cy="110" r="10" fill="#2563eb" />
                 <motion.path animate={{ pathLength: [0, 1] }} d="M 100,160 L 100,200" stroke="#0f172a" strokeWidth="8" strokeLinecap="round" />
               </svg>

               <div style={{ position: 'absolute', bottom: 24, right: 24, background: '#2563eb', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 900, fontFamily: 'monospace' }}>30-60D_HORIZON</div>
            </div>
          </motion.div>

          {/* MEDIUM CARD: Impact Prioritization [cite: 107, 119] */}
          <motion.div 
            variants={cardVariants} whileHover="hover"
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            style={{ gridColumn: 'span 7', background: '#0f172a', borderRadius: 32, padding: 48, color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '16px 16px 0 rgba(15,23,42,0.1)' }}
          >
            <MicroTag text="PRIORITY_V1.0" top={24} right={24} color="rgba(255,255,255,0.4)" />
            
            <div style={{ width: 56, height: 56, borderRadius: 16, border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
              <LayoutList size={28} color="#2563eb" />
            </div>
            
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, margin: '0 0 16px 0', lineHeight: 1.1 }}>Impact Bias Queue</h3>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, lineHeight: 1.6, maxWidth: 380, margin: '0 0 40px 0' }}>
              Automatic ranking system: Girls' school toilet repairs rank above cracked storage room walls.
            </p>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, background: '#2563eb', borderRadius: '50%', boxShadow: '0 0 10px #2563eb' }} />
                    <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em' }}>QUEUE_ACTIVE</span>
                 </div>
                 <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b' }}>IMPACT_WEIGHTED</span>
               </div>
               <div style={{ height: 60, display: 'flex', alignItems: 'end', gap: 4 }}>
                 {[90, 85, 40, 95, 30, 70, 20, 80, 100, 60].map((h, i) => (
                   <motion.div key={i} animate={{ height: [`${h}%`, `${Math.max(20, Math.random()*100)}%`, `${h}%`] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.1 }} style={{ flex: 1, background: '#2563eb', borderRadius: 2 }} />
                 ))}
               </div>
            </div>
          </motion.div>

          {/* MEDIUM CARD: Rapid Weekly Audits  */}
          <motion.div 
            variants={cardVariants} whileHover="hover"
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            style={{ gridColumn: 'span 5', background: '#2563eb', borderRadius: 32, border: '3px solid #0f172a', padding: 48, position: 'relative', overflow: 'hidden', boxShadow: '16px 16px 0 #0f172a' }}
          >
            <MicroTag text="UI_SPEED_OPTIM" top={24} right={24} color="#0f172a" />
            
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fff', border: '2px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
              <CheckCircle2 size={28} color="#0f172a" />
            </div>
            
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', lineHeight: 1.1 }}>2-Min Audits</h3>
            <p style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, lineHeight: 1.5, opacity: 0.8, margin: '0 0 40px 0' }}>
              Structured weekly condition forms—completables in under 2 minutes by school staff[cite: 104, 116].
            </p>

            <div style={{ background: '#fff', border: '2px solid #0f172a', borderRadius: 20, padding: 24, boxShadow: '6px 6px 0 rgba(0,0,0,0.05)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                 <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>ENTRY TIME</span>
                 <span style={{ fontSize: 11, fontWeight: 900, color: '#2563eb' }}>&lt; 120s</span>
               </div>
               <p style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, color: '#0f172a', margin: 0 }}>99.8<span style={{ fontSize: 14, color: '#94a3b8' }}>% Compliant</span></p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
