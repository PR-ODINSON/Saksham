import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/AppLayout.jsx';
import Landing from './pages/Landing.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import SchoolView from './pages/SchoolView.jsx';
import DEODashboard from './pages/DEODashboard.jsx';
import WeeklyInputForm from './pages/WeeklyInputForm.jsx';
import WorkOrders from './pages/WorkOrders.jsx';
import Signup from './pages/Signup.jsx';
import ConditionLogView from './pages/ConditionLogView.jsx';
import GeospatialMap from './pages/GeospatialMap.jsx';
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
