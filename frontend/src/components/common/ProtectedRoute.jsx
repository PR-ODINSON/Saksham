import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { dashboardPathFor } from '../../utils/roleRoutes.js';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Optional role gate — used to lock admin-only views (e.g. /admin/dashboard/audit).
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={dashboardPathFor(user.role)} replace />;
  }

  return children;
}
