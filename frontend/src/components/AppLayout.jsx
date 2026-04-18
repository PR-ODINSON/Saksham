import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, LogOut, Menu, X, ChevronDown, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ROLE_NAV = {
  peon: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', exact: true },
    { path: '/dashboard/report', label: 'Submit Report', icon: '📋' },
  ],
  principal: [
    { path: '/dashboard', label: 'My School', icon: '🏫', exact: true },
    { path: '/dashboard/report', label: 'Submit Report', icon: '📋' },
  ],
  deo: [
    { path: '/dashboard', label: 'Overview', icon: '📊', exact: true },
    { path: '/dashboard/work-orders', label: 'Work Orders', icon: '🔧' },
  ],
  contractor: [
    { path: '/dashboard', label: 'My Tasks', icon: '🔨', exact: true },
    { path: '/dashboard/work-orders', label: 'All Orders', icon: '📋' },
  ],
  admin: [
    { path: '/dashboard', label: 'Admin Panel', icon: '🛠️', exact: true },
    { path: '/dashboard/work-orders', label: 'All Orders', icon: '📋' },
  ],
};

const ROLE_LABELS = { 
  peon: 'Peon/Watchman', 
  principal: 'Principal', 
  deo: 'DEO', 
  contractor: 'Contractor', 
  admin: 'Admin',
  school: 'School' // For backward compatibility if session persists
};
const ROLE_COLORS = { 
  peon: 'bg-slate-600', 
  principal: 'bg-indigo-600', 
  deo: 'bg-blue-600', 
  contractor: 'bg-orange-600', 
  admin: 'bg-red-600',
  school: 'bg-slate-600'
};

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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
    <div className="min-h-screen bg-slate-50 text-[#0f172a] flex flex-col font-body selection:bg-blue-200">
      {/* Floating Navbar Container */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 sm:px-6 transition-all duration-300">
        <header 
          className={`max-w-7xl mx-auto transition-all duration-300 ${
            isScrolled 
              ? 'bg-white/95 backdrop-blur-xl border-2 border-[#0f172a] shadow-[8px_8px_0_rgba(15,23,42,0.1)] rounded-2xl py-2 px-4' 
              : 'bg-white/80 backdrop-blur-md border-2 border-[#0f172a] shadow-[4px_4px_0_rgba(15,23,42,0.05)] rounded-2xl py-3 px-5'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-4 shrink-0">
              <Link to="/dashboard" className="flex items-center gap-2 group outline-none">
                <div className="w-10 h-10 rounded-xl bg-[#0f172a] flex items-center justify-center border-2 border-[#0f172a] shadow-[2px_2px_0_#2563eb] group-hover:shadow-[4px_4px_0_#2563eb] transition-all group-active:translate-y-0.5 group-active:shadow-none">
                  <Building2 size={20} className="text-white" />
                </div>
                <span className="font-black text-xl tracking-tight hidden sm:block" style={{ fontFamily: 'var(--font-display)' }}>
                  Saksham
                </span>
              </Link>
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                <span className="text-[9px] font-black tracking-widest uppercase text-blue-700">System Ready</span>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-2 flex-1 justify-center">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    isActive(item.path, item.exact)
                      ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-[3px_3px_0_#2563eb]'
                      : 'bg-transparent text-slate-600 border-transparent hover:border-slate-300 hover:bg-slate-100 hover:text-[#0f172a]'
                  }`}
                >
                  <span className={isActive(item.path, item.exact) ? '' : 'opacity-80'}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right: role badge + user */}
            <div className="flex items-center gap-3 shrink-0">
              <span className={`hidden sm:inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 ${ROLE_COLORS[role]}`}>
                {ROLE_LABELS[role]}
              </span>

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-[#0f172a] transition-all outline-none focus:border-[#0f172a] shadow-[2px_2px_0_rgba(15,23,42,0.05)] hover:shadow-[4px_4px_0_#0f172a]"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-xs font-black text-blue-700 uppercase">
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
                        className="absolute right-0 mt-3 w-56 bg-white border-2 border-[#0f172a] rounded-2xl shadow-[8px_8px_0_rgba(15,23,42,0.1)] z-50 overflow-hidden"
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
                className="md:hidden p-2 rounded-xl bg-white border-2 border-slate-200 hover:border-[#0f172a] text-[#0f172a] transition-all"
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
              className="md:hidden mt-2 max-w-7xl mx-auto bg-white border-2 border-[#0f172a] rounded-2xl shadow-[8px_8px_0_rgba(15,23,42,0.1)] p-3 flex flex-col gap-2"
            >
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                    isActive(item.path, item.exact) 
                      ? 'bg-[#0f172a] text-white border-[#0f172a]' 
                      : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-300'
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

      {/* Main content - Add padding top to account for floating fixed navbar */}
      <main className="flex-1 pt-28 pb-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-slate-200 py-6 px-6 text-center text-slate-400 text-xs font-bold uppercase tracking-widest bg-white">
        Saksham © 2026 · Predictive Maintenance Engine · PS-03
      </footer>
    </div>
  );
}
