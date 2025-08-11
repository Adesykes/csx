import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import ClientAuth from './pages/ClientAuth';
import HomePage from './pages/HomePage';
import CancelAppointment from './pages/CancelAppointment';
import ReviewsPage from './pages/ReviewsPage';
import AdminLogin from './pages/AdminLogin';
import AdminAppointments from './pages/admin/AdminAppointments';
import AdminServices from './pages/admin/AdminServices';
import AdminRevenue from './pages/admin/AdminRevenue';
import AdminBusinessHours from './pages/admin/AdminBusinessHours';
import AdminClosureDates from './pages/admin/AdminClosureDates';
import AdminReviews from './pages/admin/AdminReviews';
import { setupAutoLogout, startSessionTimeout, resetSessionTimeout, isAuthenticated } from './lib/auth';

function App() {
  useEffect(() => {
    // Setup automatic logout functionality
    const cleanup = setupAutoLogout();
    
    // Start session timeout if user is authenticated
    if (isAuthenticated()) {
      startSessionTimeout();
    }

    // Reset session timeout on user activity
    const handleUserActivity = () => {
      if (isAuthenticated()) {
        resetSessionTimeout();
      }
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });
    
    // Cleanup when component unmounts
    return () => {
      cleanup();
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ClientAuth />} />
          <Route path="/booking" element={
            <AuthGuard requireClient={true}>
              <HomePage />
            </AuthGuard>
          } />
          <Route path="/cancel" element={<CancelAppointment />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/appointments" element={
            <AuthGuard requireAdmin={true}>
              <AdminAppointments />
            </AuthGuard>
          } />
          <Route path="/admin/services" element={
            <AuthGuard requireAdmin={true}>
              <AdminServices />
            </AuthGuard>
          } />
          <Route path="/admin/revenue" element={
            <AuthGuard requireAdmin={true}>
              <AdminRevenue />
            </AuthGuard>
          } />
          <Route path="/admin/business-hours" element={
            <AuthGuard requireAdmin={true}>
              <AdminBusinessHours />
            </AuthGuard>
          } />
          <Route path="/admin/closure-dates" element={
            <AuthGuard requireAdmin={true}>
              <AdminClosureDates />
            </AuthGuard>
          } />
          <Route path="/admin/reviews" element={
            <AuthGuard requireAdmin={true}>
              <AdminReviews />
            </AuthGuard>
          } />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;