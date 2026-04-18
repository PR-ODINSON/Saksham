import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, LogOut, Menu, X, ChevronDown, Activity, LayoutDashboard, FileText, School, Zap, Crosshair, Hammer, Shield } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';

const ROLE_NAV = {
  peon: [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} strokeWidth={2.5} />, exact: true },
    { path: '/dashboard/report', label: 'Submit Report', icon: <FileText size={18} strokeWidth={2.5} /> },
  ],
  principal: [
    { path: '/dashboard', label: 'My School', icon: <School size={18} strokeWidth={2.5} />, exact: true },
    { path: '/dashboard/report', label: 'Submit Report', icon: <FileText size={18} strokeWidth={2.5} /> },
  ],
  deo: [
    { path: '/dashboard', label: 'Predictive Queue', icon: <Zap size={18} strokeWidth={2.5} />, exact: true },
    { path: '/dashboard/work-orders', label: 'Command Center', icon: <Crosshair size={18} strokeWidth={2.5} /> },
  ],
  contractor: [
    { path: '/dashboard', label: 'My Tasks', icon: <Hammer size={18} strokeWidth={2.5} />, exact: true },
    { path: '/dashboard/work-orders', label: 'All Orders', icon: <FileText size={18} strokeWidth={2.5} /> },
  ],
  admin: [
    { path: '/dashboard', label: 'Admin Panel', icon: <Shield size={18} strokeWidth={2.5} />, exact: true },
    { path: '/dashboard/work-orders', label: 'All Orders', icon: <FileText size={18} strokeWidth={2.5} /> },
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
  .grid-lines-light {
    background-image: 
      linear-gradient(rgba(30, 58, 138, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(30, 58, 138, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
  }
`;

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredLink, setHoveredLink] = useState(null);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const role = user?.role || 'peon';
  const navItems = ROLE_NAV[role] || ROLE_NAV.peon;

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
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col font-body selection:bg-blue-200 relative">
      <style>{GLOBAL_STYLES}</style>
      <div className="absolute inset-0 grid-lines-light pointer-events-none opacity-80" />

      {/* Floating Navbar Container */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 sm:px-6 transition-all duration-300">
        <header 
          /* REMOVED overflow-hidden FROM HERE */
          className={`max-w-7xl mx-auto transition-all duration-500 relative ${
            isScrolled 
              ? 'bg-white/95 backdrop-blur-xl border-2 border-[#0f172a] shadow-[8px_8px_0_rgba(15,23,42,0.15)] rounded-[20px] py-3 px-5' 
              : 'bg-white/80 backdrop-blur-md border-2 border-[#0f172a] shadow-[4px_4px_0_rgba(15,23,42,0.05)] rounded-[20px] py-4 px-6'
          }`}
        >
          {/* Scroll Progress Bar (Added border radius to fit the container without overflow-hidden) */}
          <motion.div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: '#2563eb', scaleX, transformOrigin: '0%', zIndex: 10, borderBottomLeftRadius: '18px', borderBottomRightRadius: '18px' }} />
          
          <div className="flex items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-6 shrink-0">
              <Link to="/dashboard" className="flex items-center gap-3 group outline-none">
                <motion.div 
                  whileHover={{ rotate: [0, -5, 5, 0] }}
                  className="w-10 h-10 rounded-xl bg-[#0f172a] flex items-center justify-center border-2 border-[#0f172a] shadow-[3px_3px_0_#2563eb] group-hover:shadow-[5px_5px_0_#2563eb] transition-all"
                >
                  <Building2 size={20} className="text-white" />
                </motion.div>
                <span className="font-black text-2xl tracking-tight hidden sm:block text-[#0f172a]" style={{ fontFamily: 'var(--font-display)' }}>
                  Saksham
                </span>
              </Link>
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border-2 border-blue-100">
                <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_#3b82f6]"></motion.span>
                <span className="text-[10px] font-black tracking-[0.1em] uppercase text-slate-500" style={{ fontFamily: 'monospace' }}>ENGINE READY // v3.0</span>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-2 flex-1 justify-center" onMouseLeave={() => setHoveredLink(null)}>
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onMouseEnter={() => setHoveredLink(item.path)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors z-10 ${
                    isActive(item.path, item.exact) ? 'text-white' : 'text-[#0f172a]'
                  }`}
                >
                  <span className={isActive(item.path, item.exact) ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  {item.label}
                  {hoveredLink === item.path && !isActive(item.path, item.exact) && (
                    <motion.div
                      layoutId="nav-pill"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      className="absolute inset-0 bg-[#eff6ff] rounded-xl border border-[#dbeafe] -z-10"
                    />
                  )}
                  {isActive(item.path, item.exact) && (
                    <div className="absolute inset-0 bg-[#0f172a] rounded-xl border-2 border-[#0f172a] shadow-[4px_4px_0_#2563eb] -z-10" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Right: role badge + user */}
            <div className="flex items-center gap-4 shrink-0">
              <span className={`hidden sm:inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 border-slate-200 bg-slate-100 text-slate-600`}>
                <Activity size={12} className="inline mr-1 text-blue-600" />
                {ROLE_LABELS[role]}
              </span>

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-[#0f172a] transition-all outline-none shadow-[2px_2px_0_rgba(15,23,42,0.05)] hover:shadow-[4px_4px_0_#0f172a]"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-xs font-black text-blue-700 uppercase border border-blue-200">
                    {user?.name?.[0] || 'U'}
                  </div>
                  <span className="text-sm font-bold text-[#0f172a] max-w-[100px] truncate hidden sm:block">{user?.name}</span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>
                
                <AnimatePresence>
                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-3 w-56 bg-white border-2 border-[#0f172a] rounded-2xl shadow-[8px_8px_0_#0f172a] z-50 overflow-hidden"
                      >
                        <div className="px-4 py-3 bg-slate-50 border-b-2 border-slate-100">
                          <p className="text-[#0f172a] text-sm font-black truncate">{user?.name}</p>
                          <p className="text-slate-500 text-xs font-semibold truncate mt-0.5">{user?.email}</p>
                        </div>
                        <div className="p-2">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 font-bold hover:bg-red-50 hover:text-red-700 transition-colors"
                          >
                            <LogOut size={16} />
                            Sign out
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile menu toggle */}
              <button
                className="md:hidden p-2 rounded-xl bg-white border-2 border-slate-200 text-[#0f172a] transition-all"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile nav dropdown */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="md:hidden mt-2 max-w-7xl mx-auto bg-white border-2 border-[#0f172a] rounded-2xl shadow-[8px_8px_0_#0f172a] p-3 flex flex-col gap-2"
            >
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                    isActive(item.path, item.exact) 
                      ? 'bg-[#0f172a] text-white border-[#0f172a]' 
                      : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-200'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main content */}
      <main className="flex-1 pt-32 pb-12 relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-slate-200 py-6 px-6 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest relative z-10 bg-white">
        Saksham © 2026 · Predictive Maintenance Engine · PS-03
      </footer>
    </div>
  );
}