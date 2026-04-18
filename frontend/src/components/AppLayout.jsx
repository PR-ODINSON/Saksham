import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_NAV = {
  school: [
    { path: '/dashboard', label: 'My School', icon: '🏫', exact: true },
    { path: '/dashboard/report', label: 'Weekly Report', icon: '📋' },
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
    { path: '/dashboard', label: 'Dashboard', icon: '📊', exact: true },
    { path: '/dashboard/work-orders', label: 'Work Orders', icon: '🔧' },
  ],
};

const ROLE_LABELS = { school: 'School', deo: 'DEO', contractor: 'Contractor', admin: 'Admin' };
const ROLE_COLORS = { school: 'bg-blue-600', deo: 'bg-purple-600', contractor: 'bg-amber-600', admin: 'bg-red-600' };

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const role = user?.role || 'school';
  const navItems = ROLE_NAV[role] || ROLE_NAV.school;

  const isActive = (path, exact) => exact ? location.pathname === path : location.pathname.startsWith(path);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top nav */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="font-bold text-sm leading-tight hidden sm:block">
              <span className="text-white">Saksham</span>
              <span className="text-blue-400"> PS-03</span>
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path, item.exact)
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right: role badge + user */}
          <div className="flex items-center gap-3 shrink-0">
            <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[role]} text-white`}>
              {ROLE_LABELS[role]}
            </span>

            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm text-slate-300 max-w-24 truncate hidden sm:block">{user?.name}</span>
                <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-700">
                      <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                      <p className="text-slate-400 text-xs truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-slate-700 text-sm transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-800 px-4 py-3 flex flex-col gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive(item.path, item.exact) ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-3 px-6 text-center text-slate-600 text-xs">
        Saksham — Predictive Maintenance Engine · School Infrastructure · PS-03
      </footer>
    </div>
  );
}
