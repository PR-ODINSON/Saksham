import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, LogOut, Menu, X, ChevronDown, Activity, LayoutDashboard, FileText, School, Zap, Crosshair, Hammer, Shield, Globe } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';

const ROLE_NAV = {
  peon: [
    { path: '/dashboard', label: 'Submit Report', icon: <FileText size={18} strokeWidth={2.5} />, exact: true },
  ],
  principal: [
    { path: '/dashboard', label: 'Principal Dashboard', icon: <LayoutDashboard size={18} strokeWidth={2.5} />, exact: true },
    { path: '/dashboard/reports', label: 'View Reports', icon: <FileText size={18} strokeWidth={2.5} /> },
  ],
  deo: [
    { path: '/dashboard', label: 'Predictive Queue', icon: <Zap size={18} strokeWidth={2.5} />, exact: true },
    { path: '/dashboard/map', label: 'Live Map', icon: <Globe size={18} strokeWidth={2.5} /> },
    { path: '/dashboard/work-orders', label: 'Command Center', icon: <Crosshair size={18} strokeWidth={2.5} /> },
  ],
  contractor: [
    { path: '/dashboard', label: 'My Tasks', icon: <Hammer size={18} strokeWidth={2.5} />, exact: true },
    { path: '/dashboard/work-orders', label: 'All Orders', icon: <FileText size={18} strokeWidth={2.5} /> },
  ],
  admin: [
    { path: '/dashboard', label: 'Admin Panel', icon: <Shield size={18} strokeWidth={2.5} />, exact: true },
    { path: '/dashboard/map', label: 'Live Map', icon: <Globe size={18} strokeWidth={2.5} /> },
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

const GLOBAL_STYLES = ``;

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-body selection:bg-blue-100 relative">
      <style>{GLOBAL_STYLES}</style>

      {/* Formal Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Scroll Progress Bar (Added border radius to fit the container without overflow-hidden) */}
          <motion.div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: '#2563eb', scaleX, transformOrigin: '0%', zIndex: 10, borderBottomLeftRadius: '18px', borderBottomRightRadius: '18px' }} />
          
          <div className="flex items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-6 shrink-0">
              <Link to="/dashboard" className="flex items-center gap-3 group outline-none">
                <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center border border-blue-800 shadow-sm">
                  <Building2 size={20} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xl tracking-tight hidden sm:block text-slate-900 leading-tight">
                    Saksham
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 hidden sm:block uppercase tracking-wider">
                    Infrastructure Monitoring
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1 mx-8" onMouseLeave={() => setHoveredLink(null)}>
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    isActive(item.path, item.exact) 
                      ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className={isActive(item.path, item.exact) ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                  {item.label}
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
                  className="flex items-center gap-2 pr-2 pl-1 py-1 rounded-lg border border-slate-200 hover:border-slate-300 transition-all bg-white"
                >
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700 border border-slate-200">
                    {user?.name?.[0] || 'U'}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 max-w-[100px] truncate hidden sm:block">{user?.name}</span>
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
                        className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden"
                      >
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                          <p className="text-slate-900 text-sm font-semibold truncate">{user?.name}</p>
                          <p className="text-slate-500 text-xs font-medium truncate mt-0.5">{user?.email}</p>
                        </div>
                        <div className="p-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-red-600 font-medium hover:bg-red-50 hover:text-red-700 transition-colors text-sm"
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
      <main className="flex-1 pt-24 pb-12 relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6 text-center text-slate-500 text-xs font-medium relative z-10 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-2">
          <p className="font-bold text-slate-700">Digital Infrastructure Maintenance Division</p>
          <p>Saksham © 2026 · Predictive Maintenance Engine · PS-03</p>
        </div>
      </footer>
    </div>
  );
}