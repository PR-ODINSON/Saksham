import React, { useState, useEffect } from 'react';
import { Menu, X, Building2, ChevronRight, Activity, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardPathFor } from '../../utils/roleRoutes.js';
import { useLanguage } from '../../context/LanguageContext';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const isLoggedIn = !!user;

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handler function for redirection
  const handleDashboardRedirect = () => {
    if (isLoggedIn) {
      navigate(dashboardPathFor(user.role));
    } else {
      navigate('/login');
    }
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { name: t('nav.features'),    href: '#features' },
    { name: t('nav.how_it_works'), href: '#how-it-works' },
    { name: t('nav.app_preview'), href: '#preview' },
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
        <motion.div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#2563eb', scaleX, transformOrigin: '0%' }} />

        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <motion.div 
              whileHover={{ rotate: [0, -5, 5, 0] }}
              style={{
                width: 36, height: 36, borderRadius: 10, background: '#0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #0f172a', boxShadow: '2px 2px 0 #2563eb'
              }}>
              <Building2 size={18} color="#fff" />
            </motion.div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em' }}>Saksham</span>
          </a>

          <div className="hidden-mobile" style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginLeft: 8 }}>
            <button 
              onClick={() => setLanguage('en')}
              style={{ fontSize: 9, fontWeight: 900, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, color: language === 'en' ? '#2563eb' : '#64748b', transition: 'all 0.2s' }}
            >EN</button>
            <button 
              onClick={() => setLanguage('hi')}
              style={{ fontSize: 9, fontWeight: 900, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, color: language === 'hi' ? '#2563eb' : '#64748b', transition: 'all 0.2s' }}
            >HI</button>
            <button 
              onClick={() => setLanguage('gu')}
              style={{ fontSize: 9, fontWeight: 900, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, color: language === 'gu' ? '#2563eb' : '#64748b', transition: 'all 0.2s' }}
            >GU</button>
          </div>
        </motion.div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="hidden-mobile" onMouseLeave={() => setHoveredLink(null)}>
          <div style={{ display: 'flex', gap: 2, position: 'relative' }}>
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onMouseEnter={() => setHoveredLink(link.name)}
                style={{
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 800, color: hoveredLink === link.name ? '#2563eb' : '#0f172a',
                  textDecoration: 'none', position: 'relative', padding: '8px 14px', zIndex: 1, transition: 'color 0.2s'
                }}
              >
                {link.name}
                {hoveredLink === link.name && (
                  <motion.div
                    layoutId="nav-pill"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    style={{ position: 'absolute', inset: 0, background: '#f1f5f9', borderRadius: 10, zIndex: -1 }}
                  />
                )}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16 }}>
            <motion.button
              variants={itemVariants}
              whileHover={{ y: -1, boxShadow: '6px 6px 0 #2563eb' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDashboardRedirect}
              style={{
                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 900, color: '#fff',
                background: '#0f172a', border: '2px solid #0f172a', cursor: 'pointer',
                padding: '8px 18px', borderRadius: 10, boxShadow: '3px 3px 0 #2563eb',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.05em'
              }}
            >
              {isLoggedIn ? t("nav.dashboard") : t("nav.login")} <ChevronRight size={12} />
            </motion.button>
          </div>
        </nav>

        <motion.button 
          variants={itemVariants} 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          style={{ 
            background: mobileMenuOpen ? '#f1f5f9' : 'none', 
            border: mobileMenuOpen ? '1px solid #e2e8f0' : 'none', 
            cursor: 'pointer', 
            color: '#0f172a', 
            padding: 8,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} 
          className="show-mobile"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
      </motion.div>

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
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', marginBottom: '8px' }}>
                  <button onClick={() => { setLanguage('en'); setMobileMenuOpen(false); }} style={{ fontSize: 14, fontWeight: 900, background: 'none', border: 'none', color: language === 'en' ? '#2563eb' : '#64748b' }}>EN</button>
                  <button onClick={() => { setLanguage('hi'); setMobileMenuOpen(false); }} style={{ fontSize: 14, fontWeight: 900, background: 'none', border: 'none', color: language === 'hi' ? '#2563eb' : '#64748b' }}>HI</button>
                  <button onClick={() => { setLanguage('gu'); setMobileMenuOpen(false); }} style={{ fontSize: 14, fontWeight: 900, background: 'none', border: 'none', color: language === 'gu' ? '#2563eb' : '#64748b' }}>GU</button>
                </div>
                <button 
                  onClick={handleDashboardRedirect} // Added Click Handler to Mobile Menu
                  style={{ width: '100%', padding: '16px', borderRadius: 16, border: '2px solid #0f172a', background: '#0f172a', fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 16, color: '#fff', cursor: 'pointer', boxShadow: '6px 6px 0 #2563eb', textTransform: 'uppercase' }}
                >
                  {isLoggedIn ? t("nav.dashboard") : t("nav.login")}
                </button>
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
