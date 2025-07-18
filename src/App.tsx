import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
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
          <Route path="/admin/appointments" element={<AdminAppointments />} />
          <Route path="/admin/services" element={<AdminServices />} />
          <Route path="/admin/revenue" element={<AdminRevenue />} />
          <Route path="/admin/business-hours" element={<AdminBusinessHours />} />
          <Route path="/admin/closure-dates" element={<AdminClosureDates />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;