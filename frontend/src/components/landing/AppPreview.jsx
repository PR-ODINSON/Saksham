import React, { useRef, useEffect } from 'react';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';
import { Navigation, ShieldCheck, Radio, Gauge, Clock, AlertTriangle, LayoutList, Activity } from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   CONDITION METER (High Contrast Blue)
   ───────────────────────────────────────────────────────── */
const ConditionMeter = ({ level = 82 }) => (
  <div style={{ position: 'relative', width: 220, height: 220, borderRadius: '50%', border: '4px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff' }}>
    <div className="animate-spin-slow" style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px dashed #cbd5e1', opacity: 0.5 }} />
    <div style={{ position: 'absolute', inset: 0, background: '#f8fafc' }} />
    
    <motion.div
      initial={{ top: '100%' }}
      animate={{ top: `${100 - level}%` }}
      transition={{ duration: 2, ease: 'easeInOut' }}
      style={{ position: 'absolute', left: '-50%', width: '200%', height: '100%', background: '#2563eb', opacity: 0.2, borderRadius: '40%', animation: 'spin-slow 10s linear infinite' }}
    />
    <motion.div
      initial={{ top: '100%' }}
      animate={{ top: `${100 - level}%` }}
      transition={{ duration: 2.2, ease: 'easeInOut' }}
      style={{ position: 'absolute', left: '-40%', width: '180%', height: '100%', background: '#1d4ed8', opacity: 0.25, borderRadius: '45%', animation: 'spin-reverse 12s linear infinite' }}
    />

    <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 900, color: '#0f172a', margin: 0 }}>{level}%</p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 800, color: '#1e40af', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Asset Health</p>
    </div>
  </div>
);

const AppPreview = () => {
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-10, 10]);
  const floatX = useTransform(springX, [-0.5, 0.5], [-20, 20]);
  const floatY = useTransform(springY, [-0.5, 0.5], [-20, 20]);

  useEffect(() => {
    const handleMove = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      mouseX.set((e.clientX - centerX) / (rect.width / 2));
      mouseY.set((e.clientY - centerY) / (rect.height / 2));
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <section id="preview" ref={containerRef} style={{ padding: '120px 0', background: '#fff', position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>
      <div className="grid-lines" style={{ position: 'absolute', inset: 0, opacity: 0.6 }} />
      
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 100px' }}>
          <motion.div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderRadius: 99, background: '#f8fafc', border: '2px solid #0f172a', color: '#0f172a', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24, boxShadow: '4px 4px 0 #2563eb' }}>
            <Gauge size={14} color="#2563eb" /> Live Prediction Engine
          </motion.div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', fontWeight: 800, color: '#0f172a', lineHeight: 1.05, letterSpacing: '-0.03em' }}>
            Total control.<br/>
            <span style={{ color: '#2563eb' }}>Bespoke telemetry.</span>
          </h2>
        </div>

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 700 }}>
          <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d', transformPerspective: 1200, position: 'relative' }}>
            
            {/* MAIN PHONE MOCKUP (Z-INDEX: 20) */}
            <div style={{ position: 'relative', zIndex: 20, width: 330, height: 680, borderRadius: 52, border: '16px solid #0f172a', background: '#0f172a', boxShadow: '24px 24px 0 rgba(15,23,42,0.04)', overflow: 'hidden' }}>
               <div style={{ width: '100%', height: '100%', background: '#fff', borderRadius: 36, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Top Stats Area */}
                  <div style={{ height: 180, background: '#0f172a', padding: '52px 28px 24px', color: '#fff' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.1em' }}>RISK FACTOR</span>
                        <Radio size={16} color="#3b82f6" />
                     </div>
                     <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, margin: 0 }}>84<span style={{ fontSize: 18, color: '#3b82f6' }}>%</span></h3>
                     <p style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginTop: 4 }}>Infrastructure Zone A-12</p>
                  </div>

                  <div style={{ flex: 1, padding: 32, background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <ConditionMeter level={82} />
                     
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', marginTop: 32 }}>
                        <div style={{ background: '#fff', border: '2px solid #0f172a', padding: 16, borderRadius: 16, boxShadow: '4px 4px 0 rgba(15,23,42,0.08)' }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', display: 'block' }}>REMAINING</span>
                            <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, margin: 0, color: '#0f172a' }}>14d</p>
                        </div>
                        <div style={{ background: '#0f172a', border: '2px solid #0f172a', padding: 16, borderRadius: 16, boxShadow: '4px 4px 0 #2563eb', color: '#fff' }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', display: 'block' }}>STATUS</span>
                            <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, margin: 0 }}>ACTIVE</p>
                        </div>
                     </div>

                     <motion.button style={{ marginTop: 32, width: '100%', height: 60, borderRadius: 16, background: '#fff', border: '3px solid #0f172a', color: '#0f172a', fontWeight: 900, fontSize: 15, boxShadow: '0 8px 0 #0f172a', cursor: 'pointer' }}>
                        DISPATCH TEAM
                     </motion.button>
                  </div>
               </div>
            </div>

            {/* SIDE FLOATING WIDGETS (Z-INDEX: 50 & 60) */}
            
            {/* Widget 1: Map Snippet */}
            <motion.div 
               style={{ x: useTransform(springX, [-0.5, 0.5], [100, -250]), y: useTransform(springY, [-0.5, 0.5], [100, -100]), position: 'absolute', top: '10%', left: '-180px', zIndex: 50 }}
            >
               <div className="glass-card" style={{ width: 220, padding: 20, borderRadius: 24, border: '2px solid #0f172a', boxShadow: '12px 12px 0 rgba(15,23,42,0.06)', background: '#fff' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                     <Navigation size={20} color="#3b82f6" />
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#475569' }}>PRIORITY ZONE</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, margin: '4px 0', color: '#0f172a' }}>Model School #04</p>
               </div>
            </motion.div>

            {/* Widget 2: Safety Audit */}
            <motion.div 
               style={{ x: useTransform(springX, [-0.5, 0.5], [-100, 250]), y: useTransform(springY, [-0.5, 0.5], [-100, 100]), position: 'absolute', bottom: '15%', right: '-180px', zIndex: 60 }}
            >
               <div className="glass-card" style={{ width: 220, padding: 20, borderRadius: 24, border: '2px solid #0f172a', boxShadow: '12px 12px 0 rgba(15,23,42,0.06)', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                     <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldCheck size={18} color="#2563eb" />
                     </div>
                     <span style={{ fontSize: 10, fontWeight: 900, color: '#2563eb' }}>VERIFIED</span>
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#475569' }}>ANNUAL AUDIT</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, margin: '4px 0', color: '#0f172a' }}>Safety Pass</p>
                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, marginTop: 12 }}>
                     <motion.div animate={{ width: '82%' }} style={{ width: '40%', height: '100%', background: '#2563eb' }} />
                  </div>
               </div>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AppPreview;