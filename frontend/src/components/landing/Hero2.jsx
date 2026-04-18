import React, { useRef, useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';
import { ArrowRight, Building2, Activity, BarChart3, Bell, User, LayoutDashboard, ShieldCheck, Wrench, Clock, AlertTriangle } from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   GLOBAL STYLES (Unchanged)
   ───────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  :root {
    --font-display: 'Clash Display', 'Cabinet Grotesk', system-ui, sans-serif;
    --font-body:    'Cabinet Grotesk', system-ui, sans-serif;
  }

  .glass-card-terminal {
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(24px);
    border: 2px solid #0f172a;
    box-shadow: 8px 8px 0 rgba(15, 23, 42, 0.1);
  }

  .grid-lines {
    background-image: 
      linear-gradient(rgba(30, 58, 138, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(30, 58, 138, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
  }
`;

/* ─────────────────────────────────────────────────────────
   TYPEWRITER COMPONENT (For Left Panel)
   ───────────────────────────────────────────────────────── */
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
   RIGHT PANEL: FLOATING WIDGETS (Unchanged)
   ───────────────────────────────────────────────────────── */
const TelemetryWidget = ({ x, y }) => (
  <motion.div style={{ x, y, position: 'absolute', left: '-12rem', top: '15%', zIndex: 60 }}>
    <div className="glass-card-terminal" style={{ padding: '20px', borderRadius: 20, minWidth: 240 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Activity size={14} color="#2563eb" />
        <span style={{ fontSize: 10, fontWeight: 900, color: '#0f172a', letterSpacing: '0.1em' }}>STRUCTURAL_SCAN</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Health Index</span>
          <span style={{ fontSize: 11, fontWeight: 900, color: '#0f172a' }}>92.8%</span>
        </div>
        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <motion.div animate={{ width: ['40%', '92%', '85%'] }} transition={{ duration: 4, repeat: Infinity }} style={{ height: '100%', background: '#2563eb' }} />
        </div>
      </div>
    </div>
  </motion.div>
);

const RiskWidget = ({ x, y }) => (
  <motion.div style={{ x, y, position: 'absolute', right: '-10rem', top: '40%', zIndex: 65 }}>
    <div className="glass-card-terminal" style={{ padding: '16px 20px', borderRadius: 20, borderLeft: '6px solid #ef4444' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={18} color="#ef4444" />
        </div>
        <div>
          <p style={{ fontSize: 9, fontWeight: 900, color: '#ef4444', margin: 0 }}>HIGH RISK</p>
          <p style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', margin: 0 }}>Plumbing Block B</p>
        </div>
      </div>
    </div>
  </motion.div>
);

/* ─────────────────────────────────────────────────────────
   RIGHT PANEL: MOBILE UI (Unchanged)
   ───────────────────────────────────────────────────────── */
const SchoolAppMockup = () => (
  <div style={{ position: 'relative', width: 330, height: 680, borderRadius: 52, border: '14px solid #0f172a', background: '#0f172a', boxShadow: '40px 40px 0 rgba(30,58,138,0.05)', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 90, height: 28, background: '#000', borderRadius: 99, zIndex: 50 }} />
    
    <div style={{ width: '100%', height: '100%', background: '#fff', borderRadius: 32, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '48px 24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: '#0f172a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Building2 size={18} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#0f172a' }}>Saksham</span>
         </div>
         <Bell size={20} color="#64748b" />
      </div>

      <div style={{ flex: 1, padding: '24px', background: '#f8fafc' }}>
         <div style={{ background: '#fff', border: '2px solid #0f172a', padding: 20, borderRadius: 24, marginBottom: 20, boxShadow: '4px 4px 0 #0f172a' }}>
            <p style={{ fontSize: 10, fontWeight: 900, color: '#64748b', marginBottom: 8, letterSpacing: '0.05em' }}>PREDICTION ENGINE</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
               <div style={{ fontSize: 32, fontWeight: 900, color: '#0f172a' }}>60d</div>
               <div style={{ height: 24, width: 2, background: '#e2e8f0' }} />
               <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', lineHeight: 1.2 }}>Forecast <br/> Horizon</p>
            </div>
         </div>

         <div style={{ background: '#0f172a', padding: 20, borderRadius: 24, color: '#fff', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
               <ShieldCheck size={16} color="#3b82f6" />
               <span style={{ fontSize: 9, fontWeight: 900, color: '#3b82f6' }}>PRIORITY_ACTIVE</span>
            </div>
            <h4 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Girls Toilet Block #01</h4>
            <p style={{ fontSize: 11, color: '#94a3b8' }}>Ranked #1 for Student Impact</p>
         </div>
      </div>

      <div style={{ height: 80, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 10 }}>
         <LayoutDashboard size={22} color="#2563eb" />
         <Activity size={22} color="#94a3b8" />
         <div style={{ width: 44, height: 44, borderRadius: 16, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowRight size={20} color="#fff" />
         </div>
         <BarChart3 size={22} color="#94a3b8" />
         <User size={22} color="#94a3b8" />
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

  const rotateX = useTransform(springY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-8, 8]);
  const floatX = useTransform(springX, [-0.5, 0.5], [-20, 20]);
  const floatY = useTransform(springY, [-0.5, 0.5], [-20, 20]);

  useEffect(() => {
    const handleMove = (e) => {
      mouseX.set(e.clientX / window.innerWidth - 0.5);
      mouseY.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <section className="grid-lines" style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', paddingTop: 80 }}>
      <style>{GLOBAL_CSS}</style>
      
      

      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 10, width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 80, alignItems: 'center' }}>
          
          {/* LEFT SIDE CONTENT - Now with Typewriter Headline */}
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 99, background: '#eff6ff', border: '2px solid #0f172a', marginBottom: 32 }}>
               <ShieldCheck size={14} color="#2563eb" />
               <span style={{ fontSize: 11, fontWeight: 900, color: '#0f172a' }}>SECURE_CORE_ACTIVE</span>
            </div>
            
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3.5rem, 8vw, 6.5rem)', fontWeight: 800, color: '#0f172a', lineHeight: 0.95, letterSpacing: '-0.04em', margin: '0 0 24px' }}>
              Built To <br/>
              <Typewriter words={["Predict.", "Repair.", "Secure.", "Maintain."]} />
            </h1>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.25rem', color: '#64748b', lineHeight: 1.6, maxWidth: 500, margin: '0 0 40px' }}>
              AI-driven infrastructure intelligence for 30,000+ schools. Detect failures 60 days ahead with automated impact ranking.
            </p>
            <div style={{ display: 'flex', gap: 16 }}>
               <button style={{ padding: '18px 36px', borderRadius: 16, background: '#0f172a', color: '#fff', fontWeight: 900, border: 'none', boxShadow: '8px 8px 0 #2563eb', cursor: 'pointer' }}>Enter Portal</button>
               <button style={{ padding: '18px 36px', borderRadius: 16, background: 'transparent', color: '#0f172a', fontWeight: 900, border: '2px solid #0f172a', cursor: 'pointer' }}>View Logs</button>
            </div>
          </motion.div>

          {/* RIGHT SIDE (KEEPING EXACTLY AS YOU PROVIDED) */}
          <div style={{ position: 'relative', height: 750, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div style={{ rotateX, rotateY, x: floatX, y: floatY, transformStyle: 'preserve-3d', transformPerspective: 1200, position: 'relative' }}>
              
              <TelemetryWidget x={useTransform(springX, [-0.5, 0.5], [20, -20])} y={useTransform(springY, [-0.5, 0.5], [20, -20])} />
              <RiskWidget x={useTransform(springX, [-0.5, 0.5], [-30, 30])} y={useTransform(springY, [-0.5, 0.5], [-30, 30])} />
              
              <SchoolAppMockup />

              <motion.div style={{ position: 'absolute', bottom: '10%', left: '-5rem', zIndex: 70 }} animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                 <div className="glass-card-terminal" style={{ padding: '14px 24px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Wrench size={18} color="#2563eb" />
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Audit Ready</span>
                 </div>
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
