import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Smartphone, PlayCircle, Building2, ShieldCheck, Download, QrCode, Globe, CheckCircle2 } from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   MICRO-COMPONENTS (Institutional Blue)
   ───────────────────────────────────────────────────────── */
const LiveCounter = () => {
  const [count, setCount] = useState(30412);
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + Math.floor(Math.random() * 2));
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
       <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 12px #2563eb' }} />
       <span style={{ fontSize: 13, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.05em', color: '#0f172a' }}>{count.toLocaleString()} SCHOOLS_MONITORED</span>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   MAIN DOWNLOAD SECTION: SAKSHAM AUDIT APP
   ───────────────────────────────────────────────────────── */
const DownloadSection = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-10, 10]);
  const floatX = useTransform(springX, [-0.5, 0.5], [-20, 20]);
  const floatY = useTransform(springY, [-0.5, 0.5], [-20, 20]);

  const [showQR, setShowQR] = useState(null);

  useEffect(() => {
    const handleMove = (e) => {
      mouseX.set(e.clientX / window.innerWidth - 0.5);
      mouseY.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <section style={{ padding: '160px 0', background: '#fff', position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>
      
      {/* Background Frame Architecture */}
      <div className="grid-lines" style={{ position: 'absolute', inset: 0, opacity: 0.6, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '15%', left: 0, right: 0, height: 1, background: '#e2e8f0' }} />
      <div style={{ position: 'absolute', bottom: '15%', left: 0, right: 0, height: 1, background: '#e2e8f0' }} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          
          {/* Left: Text & UI */}
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div style={{ display: 'inline-flex', padding: '8px 16px', borderRadius: 99, background: '#eff6ff', border: '2px solid #0f172a', color: '#0f172a', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 32, boxShadow: '6px 6px 0 #2563eb' }}>
              Field Terminal Ready
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 24 }}>
              The Audit App.<br/>
              <span style={{ color: '#2563eb' }}>In Every School.</span>
            </h2>
            <p style={{ fontSize: '1.25rem', color: '#475569', fontWeight: 600, lineHeight: 1.5, maxWidth: 480, marginBottom: 48 }}>
              Empower school staff with a structured auditing tool. Submit weekly condition reports in under 2 minutes with real-time sync.
            </p>

            {/* Store Buttons with Hover QR Reveal */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 48 }}>
              {['App Store', 'Google Play'].map((store, i) => (
                <button
                  key={i}
                  onMouseEnter={() => setShowQR(store)}
                  onMouseLeave={() => setShowQR(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: i === 0 ? '#0f172a' : '#fff', 
                    color: i === 0 ? '#fff' : '#0f172a',
                    padding: '18px 36px', borderRadius: 16,
                    border: '2px solid #0f172a', cursor: 'pointer',
                    boxShadow: `8px 8px 0 ${i === 0 ? '#2563eb' : '#0f172a'}`,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative'
                  }}
                >
                  {i === 0 ? <Smartphone size={24} /> : <PlayCircle size={24} color="#2563eb" />}
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 800, opacity: 0.6 }}>{i === 0 ? 'Download on' : 'Get it on'}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 }}>{store}</span>
                  </div>
                </button>
              ))}
            </div>

            <LiveCounter />
          </motion.div>

          {/* Right: 3D ACTION PHONE & QR HUB */}
          <div style={{ position: 'relative', height: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            
            <motion.div style={{ position: 'absolute', width: 340, height: 20, background: 'rgba(30,58,138,0.1)', filter: 'blur(32px)', borderRadius: '50%', bottom: 40 }} />

            <motion.div style={{ rotateX, rotateY, x: floatX, y: floatY, transformStyle: 'preserve-3d', transformPerspective: 1200, position: 'relative' }}>
               {/* 3D Phone Shell (Black stays black) */}
               <div style={{ width: 340, height: 680, borderRadius: 52, border: '16px solid #0f172a', background: '#0f172a', boxShadow: '24px 24px 0 rgba(30,58,138,0.06)', overflow: 'hidden' }}>
                  <div className="grid-lines" style={{ position: 'absolute', inset: 0, opacity: 0.3 }} />
                  <div style={{ width: '100%', height: '100%', background: '#fff', borderRadius: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
                    <div style={{ width: 80, height: 80, borderRadius: 20, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '8px 8px 0 #2563eb' }}>
                      <Building2 size={40} color="#fff" />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, margin: '0 0 12px', color: '#0f172a' }}>Saksham</h3>
                    <p style={{ color: '#475569', fontWeight: 700, fontSize: 12 }}>REPORTER_STABLE_v2.0</p>
                    
                    <div style={{ marginTop: 60, width: '100%', height: 4, background: '#f1f5f9', borderRadius: 2 }}>
                       <motion.div animate={{ width: ['0%', '100%', '0%'] }} transition={{ duration: 3, repeat: Infinity }} style={{ height: '100%', background: '#2563eb' }} />
                    </div>
                  </div>
               </div>

               {/* QR CODE OVERLAY (Z-INDEX FIX: COMES ABOVE PHONE) */}
               <AnimatePresence>
                 {showQR && (
                   <motion.div
                     initial={{ opacity: 0, scale: 0.8, x: 100 }}
                     animate={{ opacity: 1, scale: 1, x: 140 }}
                     exit={{ opacity: 0, scale: 0.8, x: 100 }}
                     style={{ position: 'absolute', top: '20%', zIndex: 100 }}
                   >
                      <div className="glass-card" style={{ padding: 24, borderRadius: 24, textAlign: 'center', minWidth: 200, border: '3px solid #0f172a', background: '#fff' }}>
                         <div style={{ position: 'relative', width: 160, height: 160, background: '#fff', padding: 8, border: '2px solid #0f172a', borderRadius: 12, marginBottom: 16 }}>
                            <QrCode size={144} color="#0f172a" />
                            <div className="animate-scan" style={{ position: 'absolute', left: 0, right: 0, height: 2, background: '#2563eb', boxShadow: '0 0 12px #2563eb', zIndex: 10 }} />
                         </div>
                         <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', color: '#0f172a' }}>SCAN FOR {showQR.toUpperCase()}</span>
                      </div>
                   </motion.div>
                 )}
               </AnimatePresence>

               {/* System Status Tag */}
               <motion.div style={{ position: 'absolute', left: '-6rem', bottom: '8rem', zIndex: 50 }}>
                  <div className="glass-card" style={{ padding: '12px 20px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '2px solid #0f172a' }}>
                     <CheckCircle2 size={18} color="#2563eb" />
                     <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>AUDIT_SYNC_ACTIVE</span>
                  </div>
               </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default DownloadSection;