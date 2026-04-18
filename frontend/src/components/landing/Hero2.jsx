import React, { useRef, useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue, useTransform, animate } from 'framer-motion';
import { ArrowRight, Building2, AlertTriangle, Activity, BarChart3, ShieldCheck, ChevronRight, Wrench } from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   GLOBAL STYLES (Restored Original Font Design)
   ───────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  :root {
    --font-display: 'Clash Display', 'Cabinet Grotesk', system-ui, sans-serif;
    --font-body:    'Cabinet Grotesk', system-ui, sans-serif;
  }

  @keyframes scan-line-wipe {
    0% { left: -10%; opacity: 0; }
    5% { opacity: 1; }
    95% { opacity: 1; }
    100% { left: 110%; opacity: 0; }
  }

  .animate-scan-wipe { animation: scan-line-wipe 8s linear infinite; }
  
  .glass-card {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(24px);
    border: 2px solid #1e3a8a;
    box-shadow: 12px 12px 0 rgba(30, 58, 138, 0.1);
  }

  .grid-lines {
    background-image: 
      linear-gradient(rgba(30, 58, 138, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(30, 58, 138, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
  }
`;

const Typewriter = ({ words, delay = 2000 }) => {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout;
    const currentWord = words[index];
    if (isDeleting) {
      timeout = setTimeout(() => setDisplayText(currentWord.substring(0, displayText.length - 1)), 50);
    } else {
      timeout = setTimeout(() => setDisplayText(currentWord.substring(0, displayText.length + 1)), 100);
    }
    if (!isDeleting && displayText === currentWord) timeout = setTimeout(() => setIsDeleting(true), delay);
    else if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setIndex((prev) => (prev + 1) % words.length);
    }
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, index, words, delay]);

  return (
    <span style={{ color: '#2563eb', borderRight: '3px solid #2563eb', paddingRight: '4px' }}>
      {displayText}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────
   TS-03 WIDGETS
   ───────────────────────────────────────────────────────── */
const MaintenanceTelemetry = ({ floatX, floatY }) => (
  <motion.div
    style={{ x: floatX, y: floatY, position: 'absolute', left: '-14rem', top: '20%', zIndex: 40 }}
  >
    <div className="glass-card md:block hidden" style={{ padding: '24px', borderRadius: 24, minWidth: 280 }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 12px #2563eb' }} />
          <span style={{ fontSize: 10, fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.12em', fontFamily: 'var(--font-body)' }}>ASSET TELEMETRY</span>
       </div>
       <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { l: 'Structural Health', v: '92%', c: '#2563eb', icon: <Activity size={12} /> },
            { l: 'Plumbing Risk', v: 'High', c: '#e11d48', icon: <BarChart3 size={12} /> }
          ].map((item, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                   <span style={{ color: '#94a3b8' }}>{item.icon}</span>
                   <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', fontFamily: 'var(--font-body)' }}>{item.l}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 900, color: item.c, fontFamily: 'var(--font-body)' }}>{item.v}</span>
              </div>
              <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <motion.div animate={{ width: ['40%', '90%', '60%'] }} transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }} style={{ height: '100%', background: item.c }} />
              </div>
            </div>
          ))}
       </div>
    </div>
  </motion.div>
);

/* ─────────────────────────────────────────────────────────
   DEO DASHBOARD MOCKUP
   ───────────────────────────────────────────────────────── */
const SchoolAppMockup = () => (
  <div style={{ position: 'relative', width: 320, height: 650, borderRadius: 52, border: '16px solid #1e3a8a', background: '#1e3a8a', boxShadow: '32px 32px 0 rgba(30,58,138,0.04)', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 90, height: 26, background: '#000', borderRadius: 99, zIndex: 30 }} />
    <div style={{ width: '100%', height: '100%', background: '#fff', borderRadius: 36, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ height: '55%', position: 'relative', background: '#f8fafc' }}>
        <div className="grid-lines" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />
        <div style={{ position: 'absolute', inset: 0, padding: 20 }}>
           <div style={{ background: '#e11d48', color: 'white', padding: '12px', borderRadius: '16px', fontSize: '10px', fontWeight: 900 }}>
             CRITICAL ALERT: School #402 <br/>
             Girls Toilet Block Failure Predicted
           </div>
        </div>
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ width: 40, height: 4, background: '#e2f8f0', borderRadius: 4, margin: '0 auto 20px' }} />
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>Maintenance Queue</h3>
        <p style={{ color: '#64748b', fontSize: 12, fontFamily: 'var(--font-body)' }}>Impact Prioritized [cite: 109]</p>
        <button style={{ width: '100%', height: 50, marginTop: 30, borderRadius: 16, background: '#1e3a8a', color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          Dispatch Team <ArrowRight size={16} />
        </button>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────
   MAIN HERO SECTION
   ───────────────────────────────────────────────────────── */
const HeroSection = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-10, 10]);
  const floatX = useTransform(springX, [-0.5, 0.5], [-24, 24]);
  const floatY = useTransform(springY, [-0.5, 0.5], [-24, 24]);
  const textX = useTransform(springX, [-0.5, 0.5], [30, -30]);

  useEffect(() => {
    const handleMove = (e) => {
      mouseX.set(e.clientX / window.innerWidth - 0.5);
      mouseY.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <section style={{ position: 'relative', minHeight: '100vh', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', paddingTop: 80 }}>
      <style>{GLOBAL_CSS}</style>
      
      {/* Background Decor */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div className="grid-lines" style={{ position: 'absolute', inset: 0, opacity: 0.8 }} />
        <motion.div 
          style={{ x: textX, y: floatY, position: 'absolute', top: '50%', left: '-5%', transform: 'translateY(-50%)', fontFamily: 'var(--font-display)', fontSize: '20vw', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.05em', whiteSpace: 'nowrap', userSelect: 'none' }}
        >
          PREDICTIVE
        </motion.div>
        <div className="animate-scan-wipe" style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, transparent, #2563eb, transparent)', opacity: 0.5, zIndex: 1 }} />
      </div>

      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 10, width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 80, alignItems: 'center' }}>
          
          {/* Left Side: Content Focused on TS-03 [cite: 101] */}
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderRadius: 99, background: '#eff6ff', border: '2px solid #1e3a8a', marginBottom: 32, alignSelf: 'flex-start', width: 'fit-content' }}>
              <Building2 size={14} className="text-blue-600" />
              <span style={{ fontSize: 11, fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.1em', fontFamily: 'var(--font-body)' }}>SAKSHAM ENGINE READY</span>
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3.5rem, 8vw, 6.5rem)', fontWeight: 800, color: '#0f172a', lineHeight: 0.95, letterSpacing: '-0.04em', margin: '0 0 24px' }}>
              Built To <br/>
              <Typewriter words={["Predict.", "Repair.", "Secure.", "Maintain."]} />
            </h1>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.25rem', color: '#64748b', lineHeight: 1.6, maxWidth: 520, margin: '0 0 40px' }}>
              AI-driven infrastructure intelligence for 30,000+ government schools[cite: 103]. Detect failures 30-60 days ahead [cite: 105, 120] and prioritize student safety first.
            </p>

            <div style={{ display: 'flex', gap: 16 }}>
               <motion.button whileHover={{ y: -4, boxShadow: '12px 12px 0 #2563eb' }} style={{ padding: '18px 36px', borderRadius: 16, background: '#1e3a8a', color: '#fff', border: '2px solid #1e3a8a', fontWeight: 800, fontSize: 16, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>View District Queue</motion.button>
               <motion.button whileHover={{ background: '#f8fafc', y: -2 }} style={{ padding: '18px 36px', borderRadius: 16, background: 'transparent', color: '#1e3a8a', border: '2px solid #1e3a8a', fontWeight: 800, fontSize: 16, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>Asset Reports</motion.button>
            </div>
          </motion.div>

          {/* Right Side: 3D Visualization */}
          <div style={{ position: 'relative', height: 750, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div style={{ rotateX, rotateY, x: floatX, y: floatY, transformStyle: 'preserve-3d', transformPerspective: 1200, position: 'relative' }}>
              <SchoolAppMockup />
              <MaintenanceTelemetry floatX={floatX} floatY={floatY} />
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;