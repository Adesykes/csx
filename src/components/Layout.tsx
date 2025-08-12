import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, DollarSign, Settings, Menu, X, Clock, XCircle, LogOut, Star, Instagram, CalendarDays, Plus } from 'lucide-react';
import { clearAuthToken, isAuthenticated, isClient, getUser, getUserInfo, logout } from '../lib/auth';
import { apiClient } from '../lib/api';
import { usePendingReviews } from '../hooks/usePendingReviews';

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
  
  // Authentication state
  const userIsAuthenticated = isAuthenticated();
  const userIsClient = userIsAuthenticated && isClient();
  const currentUser = getUser();
  const userInfo = getUserInfo();
  
  // Get display name - prefer user's name, fallback to email
  const displayName = userInfo?.name || currentUser?.email;

  // Pending reviews for admin notification
  const { pendingCount } = usePendingReviews();

  // Track previous route to detect admin -> customer navigation
  const [wasAdminRoute, setWasAdminRoute] = useState(false);

  const handleLogout = (reason: string) => {
    clearAuthToken();
    console.log(`Auto-logout: ${reason}`);
    setShowLogoutNotification(true);
    setTimeout(() => setShowLogoutNotification(false), 3000); // Hide after 3 seconds
  };

  useEffect(() => {
    // Only logout admin users when they navigate from admin to customer routes
    // Check if the user is actually an admin AND was on admin route AND now on customer route
    const currentUser = getUser();
    const isCurrentUserAdmin = currentUser?.role === 'admin';
    
    if (wasAdminRoute && !isAdminRoute && !location.pathname.startsWith('/admin') && isCurrentUserAdmin) {
      handleLogout('Admin navigated from admin to customer view');
    }
    
    // Update the tracking state
    setWasAdminRoute(isAdminRoute);
  }, [location.pathname, isAdminRoute, wasAdminRoute]);

  const adminNavLinks = [
    { href: '/admin/appointments', label: 'Appointments', icon: Calendar },
    { href: '/admin/calendar', label: 'Calendar View', icon: CalendarDays },
    { href: '/admin/book-appointment', label: 'Book Appointment', icon: Plus },
    { href: '/admin/services', label: 'Services', icon: Settings },
    { href: '/admin/revenue', label: 'Revenue', icon: DollarSign },
    { href: '/admin/business-hours', label: 'Business Hours', icon: Clock },
    { href: '/admin/closure-dates', label: 'Closure Dates', icon: XCircle },
    { href: '/admin/reviews', label: 'Reviews', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link 
              to="/" 
              className="flex items-center space-x-3"
              onClick={() => {
                const currentUser = getUser();
                const isCurrentUserAdmin = currentUser?.role === 'admin';
                if (isAdminRoute && isCurrentUserAdmin) {
                  handleLogout('Admin clicked logo from admin route');
                }
              }}
            >
              <img 
                src="/logo-cropped.jpeg" 
                alt="CXS Nail Lounge Logo" 
                className="h-32 w-auto object-contain bg-pink-50 border-4 border-pink-600 rounded-lg"
                style={{ background: '#fdf2f8' }}
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {showAdminNavigation ? (
                <>
                  {adminNavLinks.map((link) => {
                    const Icon = link.icon;
                    const isReviewsLink = link.href === '/admin/reviews';
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                          location.pathname === link.href
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{link.label}</span>
                        {isReviewsLink && pendingCount > 0 && (
                          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full animate-pulse">
                            {pendingCount}
                          </span>
                        )}
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
                      logout();
                    }}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-900 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : userIsClient ? (
                <>
                  <Link
                    to="/booking"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === '/booking'
                        ? 'bg-pink-100 text-pink-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Book Appointment
                  </Link>
                  <Link
                    to="/reviews"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === '/reviews'
                        ? 'bg-pink-100 text-pink-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Reviews
                  </Link>
                  <Link
                    to="/cancel"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === '/cancel'
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Manage Appointments
                  </Link>
                  <a
                    href="https://www.instagram.com/cxs.naillounge?igsh=NjBidjUwY2V3cHpi&"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                    <span>Instagram</span>
                  </a>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-700">Welcome, {displayName}</span>
                    <button
                      onClick={() => {
                        logout();
                      }}
                      className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-900 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/reviews"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === '/reviews'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Reviews
                  </Link>
                  <a
                    href="https://www.instagram.com/cxs.naillounge?igsh=NjBidjUwY2V3cHpi&"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                    <span>Instagram</span>
                  </a>
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
                    const isReviewsLink = link.href === '/admin/reviews';
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors relative ${
                          location.pathname === link.href
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{link.label}</span>
                        {isReviewsLink && pendingCount > 0 && (
                          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full animate-pulse">
                            {pendingCount}
                          </span>
                        )}
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
                      logout();
                    }}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-900 hover:bg-red-50 w-full text-left"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : userIsClient ? (
                <>
                  <Link
                    to="/booking"
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      location.pathname === '/booking'
                        ? 'bg-pink-100 text-pink-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Book Appointment
                  </Link>
                  <Link
                    to="/reviews"
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      location.pathname === '/reviews'
                        ? 'bg-pink-100 text-pink-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Reviews
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
                    Manage Appointments
                  </Link>
                  <a
                    href="https://www.instagram.com/cxs.naillounge?igsh=NjBidjUwY2V3cHbi&"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Instagram className="h-5 w-5" />
                    <span>Instagram</span>
                  </a>
                  <div className="px-3 py-2 text-sm text-gray-600">
                    Welcome, {displayName}
                  </div>
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
                    to="/reviews"
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      location.pathname === '/reviews'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Reviews
                  </Link>
                  <a
                    href="https://www.instagram.com/cxs.naillounge?igsh=NjBidjUwY2V3cHpi&"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Instagram className="h-5 w-5" />
                    <span>Instagram</span>
                  </a>
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