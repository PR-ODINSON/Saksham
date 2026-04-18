import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Landing from './pages/Landing.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import Login from './pages/auth/Login.jsx';
import SchoolView from './pages/dashboard/SchoolView.jsx';
import DEODashboard from './pages/dashboard/DEODashboard.jsx';
import WeeklyInputForm from './pages/dashboard/WeeklyInputForm.jsx';
import WorkOrders from './pages/dashboard/WorkOrders.jsx';
import Signup from './pages/auth/Signup.jsx';
import ConditionLogView from './pages/dashboard/ConditionLogView.jsx';
import GeospatialMap from './pages/dashboard/GeospatialMap.jsx';
import AuditLogView from './pages/dashboard/AuditLogView.jsx';
import { dashboardPathFor } from './utils/roleRoutes.js';
import './App.css';

/**
 * Wrap any dashboard page in ProtectedRoute + AppLayout.
 */
const dash = (Component) => (
  <ProtectedRoute>
    <AppLayout>
      <Component />
    </AppLayout>
  </ProtectedRoute>
);

/**
 * Backward-compat: /dashboard (and /dashboard/*) forward to the role-prefixed
 * dashboard so old links keep working.
 */
function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)   return <Navigate to="/login" replace />;
  return <Navigate to={dashboardPathFor(user.role)} replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/"       element={<Landing />} />
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* ── Peon ────────────────────────────────────────────────────────── */}
          <Route path="/peon/dashboard"        element={dash(WeeklyInputForm)} />

          {/* ── Principal ───────────────────────────────────────────────────── */}
          <Route path="/principal/dashboard"          element={dash(SchoolView)} />
          <Route path="/principal/dashboard/reports"  element={dash(ConditionLogView)} />
          <Route path="/principal/dashboard/report"   element={dash(WeeklyInputForm)} />

          {/* ── DEO ─────────────────────────────────────────────────────────── */}
          <Route path="/deo/dashboard"                  element={dash(DEODashboard)} />
          <Route path="/deo/dashboard/map"              element={dash(GeospatialMap)} />
          <Route path="/deo/dashboard/work-orders"      element={dash(WorkOrders)} />
          <Route path="/deo/dashboard/work-orders/new"  element={dash(WorkOrders)} />
          <Route path="/deo/dashboard/reports"          element={dash(ConditionLogView)} />

          {/* ── Contractor ──────────────────────────────────────────────────── */}
          <Route path="/contractor/dashboard"               element={dash(WorkOrders)} />
          <Route path="/contractor/dashboard/work-orders"   element={dash(WorkOrders)} />

          {/* ── Admin ───────────────────────────────────────────────────────── */}
          <Route path="/admin/dashboard"                element={dash(DEODashboard)} />
          <Route path="/admin/dashboard/map"            element={dash(GeospatialMap)} />
          <Route path="/admin/dashboard/work-orders"    element={dash(WorkOrders)} />
          <Route path="/admin/dashboard/audit"          element={dash(AuditLogView)} />

          {/* ── Backward-compat redirector ──────────────────────────────────── */}
          <Route path="/dashboard"   element={<DashboardRedirect />} />
          <Route path="/dashboard/*" element={<DashboardRedirect />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
