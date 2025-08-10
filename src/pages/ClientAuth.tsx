import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { isAuthenticated } from '../lib/auth';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';

const ClientAuth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Helper function to navigate after authentication
  const navigateAfterAuth = () => {
    // Check if user was trying to change an appointment
    const shouldResumeChange = sessionStorage.getItem('resumeAppointmentChange');
    const hasChangeData = sessionStorage.getItem('appointmentToChange');
    
    if (shouldResumeChange === 'true' && hasChangeData) {
      // Remove the resume flag and navigate to booking with change parameter
      sessionStorage.removeItem('resumeAppointmentChange');
      navigate('/booking?changing=true');
    } else {
      // Normal navigation to booking page
      navigate('/booking');
    }
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigateAfterAuth();
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Login
        const response = await apiClient.clientLogin(email, password);
        console.log('Login successful:', response);
        navigateAfterAuth();
      } else {
        // Sign up
        const response = await apiClient.clientSignup(name, email, password);
        console.log('Signup successful:', response);
        navigateAfterAuth();
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message || `${isLogin ? 'Login' : 'Signup'} failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Appointment Change Banner - only show if resuming appointment change */}
        {sessionStorage.getItem('resumeAppointmentChange') === 'true' && sessionStorage.getItem('appointmentToChange') && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-4 text-white text-center border-2 border-blue-300">
            <div className="text-sm font-medium">🔄 Changing Your Appointment</div>
            <div className="text-xs opacity-90 mt-1">
              Please sign in to complete your appointment change
            </div>
          </div>
        )}
        
        {/* Booking Access Banner */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg p-4 text-white text-center">
          <div className="text-sm font-medium">🎯 Booking System Access Required</div>
          <div className="text-xs opacity-90 mt-1">
            {isLogin ? 'Please sign in to continue' : 'Create your account to get started'}
          </div>
        </div>

        <div>
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin ? 'Sign in to access our booking system' : 'Join CXS Nail Lounge to book appointments'}
          </p>
          
          {/* Booking System Preview */}
          <div className="mt-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4 border border-pink-200">
            <h3 className="text-center text-lg font-semibold text-gray-800 mb-3">
              🌟 What's Inside Our Booking System
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                <span className="text-gray-700">Premium Nail Services</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-700">Real-time Availability</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                <span className="text-gray-700">Instant Booking</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-700">Manage Appointments</span>
              </div>
            </div>
            <p className="text-center text-xs text-gray-600 mt-3">
              {isLogin ? 'Sign in now to book your next appointment!' : 'Create your account to get started!'}
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={!isLogin}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your full name"
                  />
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your email address"
                />
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500 focus:z-10 sm:text-sm"
                  placeholder={isLogin ? "Enter your password" : "Create a password (min 6 characters)"}
                />
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required={!isLogin}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-3 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm your password"
                  />
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setPassword('');
                setConfirmPassword('');
                setName('');
              }}
              className="text-sm text-pink-600 hover:text-pink-500 font-medium"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </form>

        {/* Popular Services Preview */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-center text-lg font-semibold text-gray-900 mb-4">
            💅 Popular Services Available
          </h3>
          <div className="grid grid-cols-1 gap-4 text-sm">
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-3 border border-pink-100">
              <div className="font-medium text-gray-900">Gel Polish</div>
              <div className="text-gray-600">Long-lasting gel polish application</div>
              <div className="text-pink-600 font-semibold mt-1">From £25</div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-100">
              <div className="font-medium text-gray-900">Builder Gel</div>
              <div className="text-gray-600">Strengthening gel overlay</div>
              <div className="text-purple-600 font-semibold mt-1">From £35</div>
            </div>
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg p-3 border border-rose-100">
              <div className="font-medium text-gray-900">Nail Art</div>
              <div className="text-gray-600">Custom designs & creativity</div>
              <div className="text-rose-600 font-semibold mt-1">From £15</div>
            </div>
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-100">
              <div className="font-medium text-gray-900">Builder Gel with Nail Art</div>
              <div className="text-gray-600">Strengthening gel + custom art</div>
              <div className="text-indigo-600 font-semibold mt-1">From £45</div>
            </div>
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-100">
              <div className="font-medium text-gray-900">Soak Off and New Set</div>
              <div className="text-gray-600">Remove old set + fresh application</div>
              <div className="text-emerald-600 font-semibold mt-1">From £40</div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-500 mt-4">
            {isLogin ? 'Sign in to see full pricing and book instantly!' : 'Create account to access our full service menu!'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientAuth;
