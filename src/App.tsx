import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
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