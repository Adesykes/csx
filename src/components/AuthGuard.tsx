import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, isAdmin, isClient } from '../lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireClient?: boolean;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireAdmin = false, requireClient = false }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminAccess, setAdminAccess] = useState(false);
  const [clientAccess, setClientAccess] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = isAuthenticated();
      const hasAdminAccess = isAuth && isAdmin();
      const hasClientAccess = isAuth && isClient();
      
      setAuthenticated(isAuth);
      setAdminAccess(hasAdminAccess);
      setClientAccess(hasClientAccess);
      setIsChecking(false);
    };

    checkAuth();
  }, []);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Checking authentication...</span>
          </div>
        </div>
      </div>
    );
  }

  // If admin access is required but user is not authenticated
  if (requireAdmin && !authenticated) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  // If admin access is required but user is not an admin
  if (requireAdmin && authenticated && !adminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">You don't have permission to access this admin area.</p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If client access is required but user is not authenticated
  if (requireClient && !authenticated) {
    // Check if this is an appointment change flow
    const urlParams = new URLSearchParams(location.search);
    const isChangingAppointment = urlParams.get('changing') === 'true';
    const hasChangeData = sessionStorage.getItem('appointmentToChange');
    
    if (isChangingAppointment && hasChangeData) {
      // Store a flag to resume appointment change after login
      sessionStorage.setItem('resumeAppointmentChange', 'true');
    }
    
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If client access is required but user is not a client
  if (requireClient && authenticated && !clientAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">Please log in as a client to access the booking system.</p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-pink-600 text-white px-6 py-2 rounded-md hover:bg-pink-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If basic authentication is required but user is not authenticated
  if (!requireAdmin && !requireClient && !authenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // User is properly authenticated, render children
  return <>{children}</>;
};

export default AuthGuard;
