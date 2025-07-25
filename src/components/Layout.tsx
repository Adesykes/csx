import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, DollarSign, Settings, Menu, X, Clock, XCircle, LogOut } from 'lucide-react';
import { clearAuthToken } from '../lib/auth';
import { apiClient } from '../lib/api';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutNotification, setShowLogoutNotification] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdminLoginPage = location.pathname === '/admin';
  const showAdminNavigation = isAdminRoute && !isAdminLoginPage;

  // Track previous route to detect admin -> customer navigation
  const [wasAdminRoute, setWasAdminRoute] = useState(false);

  const handleLogout = (reason: string) => {
    clearAuthToken();
    console.log(`Auto-logout: ${reason}`);
    setShowLogoutNotification(true);
    setTimeout(() => setShowLogoutNotification(false), 3000); // Hide after 3 seconds
  };

  useEffect(() => {
    // If we were on an admin route and now we're on a customer route, logout
    if (wasAdminRoute && !isAdminRoute && !location.pathname.startsWith('/admin')) {
      handleLogout('Navigated from admin to customer view');
    }
    setWasAdminRoute(isAdminRoute);
  }, [location.pathname, isAdminRoute, wasAdminRoute]);

  const adminNavLinks = [
    { href: '/admin/appointments', label: 'Appointments', icon: Calendar },
    { href: '/admin/services', label: 'Services', icon: Settings },
    { href: '/admin/revenue', label: 'Revenue', icon: DollarSign },
    { href: '/admin/business-hours', label: 'Business Hours', icon: Clock },
    { href: '/admin/closure-dates', label: 'Closure Dates', icon: XCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="flex items-center space-x-2"
                onClick={() => {
                  if (isAdminRoute) {
                    handleLogout('Clicked logo from admin route');
                  }
                }}
              >
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">CXS</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">CXS Nail Lounge</h1>
                  <p className="text-xs text-gray-500">Premium Nail Care</p>
                </div>
              </Link>
              {/* Socials */}
              <a
                href="https://www.instagram.com/cxs.naillounge?igsh=NjBidjUwY2V3cHpi&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-pink-600 hover:text-pink-800"
                aria-label="Instagram"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <circle cx="17" cy="7" r="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor"/>
                </svg>
                <span className="hidden sm:inline">Instagram</span>
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {showAdminNavigation ? (
                <>
                  {adminNavLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          location.pathname === link.href
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                  <Link
                    to="/"
                    onClick={() => {
                      handleLogout('Clicked Customer View from admin');
                    }}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <Users className="h-4 w-4" />
                    <span>Customer View</span>
                  </Link>
                  <button
                    onClick={() => {
                      apiClient.logout();
                    }}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-900 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === '/'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Book Appointment
                  </Link>
                  <Link
                    to="/cancel"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === '/cancel'
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Cancel Appointment
                  </Link>
                  <Link
                    to="/admin"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Admin Login
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              {showAdminNavigation ? (
                <>
                  {adminNavLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                          location.pathname === link.href
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                  <Link
                    to="/"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout('Clicked Customer View from admin mobile menu');
                    }}
                  >
                    <Users className="h-5 w-5" />
                    <span>Customer View</span>
                  </Link>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      apiClient.logout();
                    }}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-900 hover:bg-red-50 w-full text-left"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/"
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      location.pathname === '/'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Book Appointment
                  </Link>
                  <Link
                    to="/cancel"
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      location.pathname === '/cancel'
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Cancel Appointment
                  </Link>
                  <Link
                    to="/admin"
                    className="block bg-blue-600 text-white px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Admin Login
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 CXS Nail Lounge. All rights reserved.</p>
            <p className="mt-2 text-sm">Premium nail care services with online booking</p>
          </div>
        </div>
      </footer>

      {/* Logout Notification */}
      {showLogoutNotification && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          <p className="text-sm font-medium">✓ Logged out from admin session</p>
        </div>
      )}
    </div>
  );
};

export default Layout;
