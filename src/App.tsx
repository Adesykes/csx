import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import HomePage from './pages/HomePage';
import CancelAppointment from './pages/CancelAppointment';
import AdminLogin from './pages/AdminLogin';
import AdminAppointments from './pages/admin/AdminAppointments';
import AdminServices from './pages/admin/AdminServices';
import AdminRevenue from './pages/admin/AdminRevenue';
import AdminBusinessHours from './pages/admin/AdminBusinessHours';
import AdminClosureDates from './pages/admin/AdminClosureDates';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/cancel" element={<CancelAppointment />} />
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
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;