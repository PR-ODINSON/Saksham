import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, LogOut, Menu, X, ChevronDown, Activity, LayoutDashboard, FileText, School, Zap, Crosshair, Hammer, Shield, Globe, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { dashboardPathFor } from '../../utils/roleRoutes.js';
import { useLanguage } from '../../context/LanguageContext';

// Each role's nav uses its own URL prefix (/peon/dashboard, /principal/dashboard, ...)
const ROLE_NAV = {
  peon: [
    // Peons land directly on the weekly input form — no extra nav
  ],
  principal: [
    { path: '/principal/dashboard',         label: 'Principal Dashboard', icon: <LayoutDashboard size={18} strokeWidth={2.5} />, exact: true },
    { path: '/principal/dashboard/reports', label: 'View Reports',        icon: <FileText size={18} strokeWidth={2.5} /> },
  ],
  deo: [
    { path: '/deo/dashboard',              label: 'Predictive Queue',    icon: <Zap size={18} strokeWidth={2.5} />, exact: true },
    { path: '/deo/dashboard/reports',      label: 'Forwarded Reports',   icon: <FileText size={18} strokeWidth={2.5} /> },
    { path: '/deo/dashboard/map',          label: 'Live Map',            icon: <Globe size={18} strokeWidth={2.5} /> },
    { path: '/deo/dashboard/work-orders',  label: 'Command Center',      icon: <Crosshair size={18} strokeWidth={2.5} /> },
  ],
  contractor: [
    { path: '/contractor/dashboard',              label: 'Field Console', icon: <Hammer size={18} strokeWidth={2.5} />, exact: true },
    { path: '/contractor/dashboard/work-orders',  label: 'All Orders',    icon: <FileText size={18} strokeWidth={2.5} /> },
  ],
  admin: [
    { path: '/admin/dashboard',              label: 'Admin Panel', icon: <Shield size={18} strokeWidth={2.5} />, exact: true },
    { path: '/admin/dashboard/map',          label: 'Live Map',    icon: <Globe size={18} strokeWidth={2.5} /> },
    { path: '/admin/dashboard/work-orders',  label: 'All Orders',  icon: <FileText size={18} strokeWidth={2.5} /> },
    { path: '/admin/dashboard/audit',        label: 'Audit Log',   icon: <ClipboardList size={18} strokeWidth={2.5} /> },
  ],
};

const ROLE_LABELS = { 
  peon: 'Peon/Watchman', 
  principal: 'Principal', 
  deo: 'DEO COMMAND', 
  contractor: 'Contractor', 
  admin: 'System Admin',
  school: 'School'
};

const GLOBAL_STYLES = `
  .gov-header-bg {
    background: #ffffff;
  }
  .gov-top-bar {
    background: #fdfdfd;
    border-bottom: 1px solid #e2e8f0;
  }
  .gov-footer {
    background: #111827;
    color: #ffffff;
  }
  .gov-font-formal {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }
  .gov-tricolor-strip {
    height: 4px;
    background: linear-gradient(to right, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%);
    width: 100%;
  }
  .gov-nav-active {
    background: #002244;
    border-bottom: 3px solid #FF9933;
  }
`;

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const role = user?.role || 'peon';
  const navItems = ROLE_NAV[role] || ROLE_NAV.peon;
  const dashboardHome = dashboardPathFor(role);

  const isActive = (path, exact) => exact ? location.pathname === path : location.pathname.startsWith(path);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-900 flex flex-col gov-font-formal relative">
      <style>{GLOBAL_STYLES}</style>

      {/* 1. Top Utility Bar (Accessibility & Language) - Pinned Static */}
      <div className="gov-top-bar hidden sm:block fixed top-0 left-0 right-0 z-[70] h-8">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-full flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
          <div className="flex items-center gap-6">
            <a href="#main-content" className="hover:text-blue-700 transition-colors">Skip to main content</a>
            <div className="flex items-center gap-4 border-l border-slate-300 pl-4 h-4">
              <button className="hover:text-blue-700">Screen Reader Access</button>
              <div className="flex items-center gap-1.5 ml-2">
                <button className="w-5 h-5 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-200 text-[9px]">A-</button>
                <button className="w-5 h-5 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-200 bg-white text-[9px]">A</button>
                <button className="w-5 h-5 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-200 text-[9px]">A+</button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 uppercase font-bold">
            <button 
              onClick={() => setLanguage('en')}
              className={`hover:text-blue-700 transition-colors ${language === 'en' ? 'text-blue-800 border-b-2 border-blue-800' : 'text-slate-500'}`}
            >
              English
            </button>
            <span className="text-slate-300">|</span>
            <button 
              onClick={() => setLanguage('hi')}
              className={`hover:text-blue-700 transition-colors ${language === 'hi' ? 'text-blue-800 border-b-2 border-blue-800' : 'text-slate-500'}`}
            >
              हिन्दी
            </button>
            <span className="text-slate-300">|</span>
            <button 
              onClick={() => setLanguage('gu')}
              className={`hover:text-blue-700 transition-colors text-[11px] ${language === 'gu' ? 'text-blue-800 border-b-2 border-blue-800' : 'text-slate-500'}`}
            >
              ગુજરાતી
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Official Header - Offset by top bar height */}
      <div className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'top-0 sm:top-8 bg-white shadow-lg' : 'top-0 sm:top-8 bg-white'
      } border-b border-slate-200`}>
        {/* Tricolor Strip at very top of header container */}
        <div className="gov-tricolor-strip" />
        
        <header className="max-w-7xl mx-auto px-4 lg:px-8 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Branding Section */}
            <div className="flex items-center gap-6">
              <Link to={dashboardHome} className="flex items-center gap-4 group">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm p-1.5 transition-transform group-hover:scale-105">
                  <div className="w-full h-full rounded-full border border-blue-100 flex items-center justify-center bg-blue-50/30">
                     <Building2 size={24} className="text-[#003366]" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-blue-800 leading-tight">
                      Government of India
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">|</span>
                    <span className="text-[10px] sm:text-[11px] font-medium text-slate-600">भारत सरकार</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-black text-2xl sm:text-3xl tracking-tighter text-[#003366] leading-none">
                      Saksham
                    </span>
                    <span className="font-bold text-lg sm:text-xl text-slate-400 tracking-tighter">
                      सक्षम
                    </span>
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] mt-1">
                    Infrastructure Monitoring System
                  </span>
                </div>
              </Link>
              
              <div className="hidden xl:block h-12 w-px bg-slate-200 mx-2" />
              
              <div className="hidden xl:flex flex-col justify-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">District Administration</span>
                <span className="text-sm font-black text-[#003366] flex items-center gap-2">
                   Kutch, Gujarat <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                </span>
              </div>
            </div>

            {/* Right Side: Role Badge & Profile */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Live Session</span>
                <div className="flex items-center gap-2 mt-0.5 px-3 py-1 rounded-md bg-white border border-slate-200 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-[#003366] uppercase tracking-widest">{ROLE_LABELS[role]}</span>
                </div>
              </div>

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1 rounded-full border border-slate-200 hover:border-blue-400 transition-all bg-white"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#003366] flex items-center justify-center text-[11px] font-bold text-white uppercase">
                    {user?.name?.[0] || 'U'}
                  </div>
                  <ChevronDown size={12} className={`text-slate-400 mr-1 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden"
                      >
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                          <p className="text-[#003366] text-sm font-bold truncate">{user?.name}</p>
                          <p className="text-slate-500 text-[10px] truncate uppercase tracking-tighter mt-0.5">{role} ID: 2026-XQ-42</p>
                        </div>
                        <div className="p-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-red-600 font-bold hover:bg-red-50 transition-colors text-xs uppercase tracking-wide"
                          >
                            <LogOut size={14} />
                            Log Out from Portal
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button className="md:hidden p-2 text-[#003366]" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </header>

        {/* 3. Primary Navigation Bar (Integrated in the fixed header area) */}
        <div className="bg-[#003366] text-white hidden md:block border-t border-white/10 relative">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center h-12">
            <nav className="flex items-center h-full text-[10.5px] font-black uppercase tracking-widest">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`h-full flex items-center px-6 border-r border-white/5 hover:bg-[#002244] transition-all gap-2.5 ${
                    isActive(item.path, item.exact) ? 'gov-nav-active' : ''
                  }`}
                >
                  {item.icon && <span className="opacity-80">{item.icon}</span>} {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-right from-[#FF9933] via-white to-[#138808] opacity-30" />
        </div>
      </div>

      {/* 4. Scroll Progress */}
      <motion.div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: '#ff9933', scaleX, transformOrigin: '0%', zIndex: 100 }} 
      />

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[100] bg-white flex flex-col p-6 md:hidden"
          >
            <div className="flex justify-between items-center mb-10 pb-4 border-b">
              <span className="font-black text-xl text-[#003366]">Saksham Menu</span>
              <button onClick={() => setMobileOpen(false)}><X size={28} className="text-slate-400" /></button>
            </div>
            <nav className="flex flex-col gap-2">
              {navItems.map(item => (
                <Link 
                  key={item.path} 
                  onClick={() => setMobileOpen(false)} 
                  to={item.path} 
                  className="px-4 py-4 rounded-lg hover:bg-slate-50 text-slate-700 font-black uppercase tracking-widest text-xs flex items-center gap-3"
                >
                  {item.icon} {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto pt-6 border-t">
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 py-4 text-red-600 font-bold uppercase tracking-widest text-xs bg-red-50 rounded-lg">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main id="main-content" className={`flex-1 transition-all duration-300 relative z-20 ${
        location.pathname === '/dashboard/map' 
          ? (isScrolled ? 'pt-[120px] sm:pt-[136px]' : 'pt-[120px] sm:pt-[168px]') 
          : (isScrolled ? 'pt-[120px] sm:pt-[136px] pb-16' : 'pt-[120px] sm:pt-[168px] pb-16')
      }`}>
        {children}
      </main>

      {/* 5. Comprehensive Official Footer */}
      {location.pathname !== '/dashboard/map' && (
      <footer className="bg-[#1a1a1a] text-white pt-12 pb-6 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 border-b border-slate-800 pb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1">
                   <Building2 size={24} className="text-[#003366]" />
                </div>
                <span className="font-bold text-lg tracking-tight">Saksham Portal</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                National infrastructure monitoring and predictive maintenance system for government schools and medical centers.
              </p>
            </div>
            
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-400 mb-5">Department Links</h4>
              <ul className="space-y-3 text-xs font-medium text-slate-300">
                <li><Link to="#" className="hover:text-white transition-colors">Ministry of Education</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Digital India Initiative</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">NIC Department</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">State Data Center</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-400 mb-5">Support & Help</h4>
              <ul className="space-y-3 text-xs font-medium text-slate-300">
                <li><Link to="#" className="hover:text-white transition-colors">User Manual (PDF)</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Contact Nodal Officer</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Report Technical Issue</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-400 mb-5">Contact Us</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                District Administration Building, Kutch Bypass Road, Bhuj, Gujarat - 370001
              </p>
              <p className="text-xs font-bold text-white">Helpline: 1800-425-XXXX</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-8 opacity-60">
              <span className="text-[10px] font-bold">Privacy Policy</span>
              <span className="text-[10px] font-bold">Terms of Service</span>
              <span className="text-[10px] font-bold">Sitemap</span>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Managed by National Informatics Centre (NIC)
              </p>
              <p className="text-[10px] text-slate-600 font-medium">
                Saksham © 2026 · Ministry of Electronics & Information Technology · Government of India
              </p>
            </div>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}
