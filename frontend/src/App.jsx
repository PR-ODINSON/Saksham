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
import './App.css';

// Role-based default dashboard redirect
function DashboardIndex() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'peon') return <WeeklyInputForm />;
  if (user.role === 'principal' || user.role === 'school') return <SchoolView />;
  if (user.role === 'deo' || user.role === 'admin') return <DEODashboard />;
  if (user.role === 'contractor') return <WorkOrders />;
  return <SchoolView />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
         {/* Landing page without app layout */}
        <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DashboardIndex />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route index element={<DashboardIndex />} />
                    <Route path="report" element={<WeeklyInputForm />} />
                    <Route path="reports" element={<ConditionLogView />} />
                    <Route path="map" element={<GeospatialMap />} />
                    <Route path="work-orders" element={<WorkOrders />} />
                    <Route path="work-orders/new" element={<WorkOrders />} />
                    <Route path="audit" element={<AuditLogView />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
