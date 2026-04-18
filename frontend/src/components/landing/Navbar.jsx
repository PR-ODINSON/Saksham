import React, { useState, useEffect } from 'react';
import { Menu, X, Building2, ChevronRight, Activity, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState(null);
  
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features',    href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'App Preview', href: '#preview' },
  ];

  const containerVariants = {
    hidden: { y: -100, opacity: 0 },
    visible: { 
      y: 0, opacity: 1,
      transition: { 
        duration: 0.8, ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.1, delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, padding: '20px 24px', pointerEvents: 'none', display: 'flex', justifyContent: 'center' }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          width: '100%', maxWidth: 1200,
          background: isScrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 20, border: '2px solid #0f172a',
          boxShadow: isScrolled ? '12px 12px 0 rgba(30, 58, 138, 0.12)' : '6px 6px 0 rgba(15, 23, 42, 0.04)',
          padding: isScrolled ? '12px 24px' : '16px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          pointerEvents: 'auto', transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative', overflow: 'hidden'
        }}
      >
        {/* Scroll Progress Line - Changed to Blue */}
        <motion.div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#2563eb', scaleX, transformOrigin: '0%' }} />

        {/* Left Side: Saksham Logo & System Indicator */}
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <motion.div 
              whileHover={{ rotate: [0, -5, 5, 0] }}
              style={{
                width: 40, height: 40, borderRadius: 12, background: '#0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #0f172a', boxShadow: '3px 3px 0 #2563eb'
              }}>
              <Building2 size={20} color="#fff" />
            </motion.div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em' }}>Saksham</span>
          </a>

          {/* System Heartbeat - Changed to Blue */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderLeft: '1px solid #e2e8f0' }} className="hidden-mobile">
            <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 8px #2563eb' }} />
            <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b', letterSpacing: '0.12em', fontFamily: 'monospace' }}>ENGINE READY // v2.0.4</span>
          </div>
        </motion.div>

        {/* Center: Magnetic Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="hidden-mobile" onMouseLeave={() => setHoveredLink(null)}>
          <div style={{ display: 'flex', gap: 4, position: 'relative' }}>
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onMouseEnter={() => setHoveredLink(link.name)}
                style={{
                  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 800, color: hoveredLink === link.name ? '#2563eb' : '#0f172a',
                  textDecoration: 'none', position: 'relative', padding: '10px 18px', zIndex: 1, transition: 'color 0.2s'
                }}
              >
                {link.name}
                {hoveredLink === link.name && (
                  <motion.div
                    layoutId="nav-pill"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    style={{ position: 'absolute', inset: 0, background: '#eff6ff', borderRadius: 12, border: '1px solid #dbeafe', zIndex: -1 }}
                  />
                )}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 24 }}>
            <motion.button
              variants={itemVariants}
              whileHover={{ y: -2, boxShadow: '8px 8px 0 #2563eb' }}
              whileTap={{ scale: 0.98 }}
              style={{
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 900, color: '#fff',
                background: '#0f172a', border: '2px solid #0f172a', cursor: 'pointer',
                padding: '10px 22px', borderRadius: 12, boxShadow: '4px 4px 0 #2563eb',
                transition: 'box-shadow 0.2s', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em'
              }}
            >
              Dashboard <motion.span whileHover={{ x: 3 }} transition={{ type: 'spring' }}><ChevronRight size={14} /></motion.span>
            </motion.button>
          </div>
        </nav>

        {/* Mobile toggle */}
        <motion.button variants={itemVariants} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a', padding: 4 }} className="show-mobile">
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </motion.button>
      </motion.div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
            style={{ position: 'absolute', top: 100, left: 24, right: 24, background: '#fff', border: '2px solid #0f172a', borderRadius: 24, padding: '24px', boxShadow: '16px 16px 0 rgba(30,58,138,0.1)', zIndex: 90, pointerEvents: 'auto' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {navLinks.map((link) => (
                <a key={link.name} href={link.href} onClick={() => setMobileMenuOpen(false)} style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 800, color: '#0f172a', textDecoration: 'none', padding: '16px 20px', borderRadius: 16, background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                  {link.name} <ChevronRight size={18} color="#2563eb" />
                </a>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                <button style={{ width: '100%', padding: '16px', borderRadius: 16, border: '2px solid #0f172a', background: '#0f172a', fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 16, color: '#fff', cursor: 'pointer', boxShadow: '6px 6px 0 #2563eb', textTransform: 'uppercase' }}>Launch Dashboard</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (min-width: 768px) { .show-mobile { display: none !important; } }
        @media (max-width: 767px) { .hidden-mobile { display: none !important; } }
      `}</style>
    </header>
  );
};

export default Navbar;