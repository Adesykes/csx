import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Clock, User, Phone, Mail, X, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { apiClient, Appointment } from '../lib/api';

interface SearchForm {
  email: string;
  phone: string;
}

const CancelAppointment: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<SearchForm>();

  const email = watch('email');
  const phone = watch('phone');

  // Normalize phone number by removing all non-digit characters
  const normalizePhoneNumber = (phoneNumber: string): string => {
    return phoneNumber.replace(/\D/g, '');
  };

  // Check if appointment can be changed (48-hour rule)
  const canChangeAppointment = (appointment: Appointment): boolean => {
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + (48 * 60 * 60 * 1000));
    
    return appointmentDateTime >= fortyEightHoursFromNow;
  };

  const onSearch = async (data: SearchForm) => {
    if (!data.email && !data.phone) {
      setError('Please provide either email or phone number');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setSearchPerformed(true);

    try {
      // Normalize phone number before searching
      const normalizedPhone = data.phone ? normalizePhoneNumber(data.phone) : '';
      
      const foundAppointments = await apiClient.findAppointmentsByCustomer(
        data.email || '', 
        normalizedPhone
      );
      
      console.log('🔍 Found appointments from API:', foundAppointments);
      console.log('📊 Found appointments count:', foundAppointments.length);
      
      // Debug: Log each appointment's service field
      foundAppointments.forEach((apt, index) => {
        console.log(`📋 Appointment ${index + 1}:`, {
          id: apt._id,
          service: apt.service,
          customerName: apt.customerName,
          date: apt.date,
          time: apt.time,
          status: apt.status,
          fullObject: apt
        });
      });
      
      // For testing: show all found appointments, let server handle business rules
      const cancellableAppointments = foundAppointments.filter(apt => {
        // Only filter out already cancelled or completed appointments
        return apt.status !== 'cancelled' && apt.status !== 'completed';
      });

      console.log('✅ Active appointments after filtering:', cancellableAppointments);
      console.log('📈 Active appointments count:', cancellableAppointments.length);

      setAppointments(cancellableAppointments);
      
      if (cancellableAppointments.length === 0) {
        if (foundAppointments.length > 0) {
          setError('All found appointments are already cancelled or completed.');
        } else {
          setError('No appointments found for the provided contact information.');
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search for appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.cancelAppointment(appointmentId);
      
      // Remove the cancelled appointment from the list
      setAppointments(prev => prev.filter(apt => apt._id !== appointmentId));
      setSuccess('Appointment cancelled successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Cancellation error:', err);
      setError('Failed to cancel appointment. Please try again or contact us directly.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAppointment = (appointment: Appointment) => {
    // Store the appointment ID to be replaced and customer details
    const changeData = {
      oldAppointmentId: appointment._id,
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      customerPhone: appointment.customerPhone,
      currentService: appointment.service,
      currentDate: appointment.date,
      currentTime: appointment.time
    };
    
    // Store in sessionStorage so it persists across navigation
    sessionStorage.setItem('appointmentToChange', JSON.stringify(changeData));
    
    // Navigate to booking page with a change indicator using React Router
    navigate('/booking?changing=true');
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE, MMMM do, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Appointments</h1>
          <p className="text-gray-600">
            Enter your email or phone number to find your appointments. You can change or cancel them here.
          </p>
        </div>

        {/* Information Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 rounded-full p-1">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-1">Appointment Change Policy</h3>
              <p className="text-sm text-blue-700">
                Appointments can only be changed up to <strong>48 hours</strong> before your scheduled time. 
                For last-minute changes within 48 hours, please call us directly.
              </p>
            </div>
          </div>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <form onSubmit={handleSubmit(onSearch)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  {...register('email', {
                    pattern: email ? {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email address'
                    } : undefined
                  })}
                  type="email"
                  autoComplete="email"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your.email@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="text-center text-gray-500 font-medium">OR</div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  {...register('phone', {
                    pattern: phone ? {
                      value: /^[\+]?[\s\-\(\)]*[\d][\s\-\(\)\d]{6,19}$/,
                      message: 'Please enter a valid phone number (at least 7 digits)'
                    } : undefined
                  })}
                  type="tel"
                  autoComplete="tel"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="555-123-4567, (555) 123-4567, or +1 555 123 4567"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (!email && !phone)}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Search className="h-5 w-5" />
              <span>{loading ? 'Searching...' : 'Find My Appointments'}</span>
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <X className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="h-5 w-5 text-green-400 mr-2 mt-0.5">✓</div>
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        )}

        {/* Appointments List */}
        {searchPerformed && appointments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Upcoming Appointments</h2>
            {appointments.map((appointment) => (
              <div key={appointment._id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{appointment.service}</h3>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{appointment.customerName}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(appointment.date)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(appointment.time)}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {appointment.status}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {appointment.paymentMethod === 'cash' ? 'Pay cash on day' : 
                           appointment.paymentMethod === 'bank_transfer' ? 'Bank transfer after appointment' : 
                           'Other payment method'}
                        </span>
                      </div>

                      {appointment.notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-600">
                            <strong>Notes:</strong> {appointment.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex space-x-2">
                    {canChangeAppointment(appointment) ? (
                      <button
                        onClick={() => handleChangeAppointment(appointment)}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Change</span>
                      </button>
                    ) : (
                      <div className="flex flex-col">
                        <button
                          disabled
                          className="bg-gray-400 text-white px-4 py-2 rounded-md cursor-not-allowed opacity-50 flex items-center space-x-2"
                          title="Appointments can only be changed up to 48 hours before the scheduled time"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Change</span>
                        </button>
                        <span className="text-xs text-red-600 mt-1 text-center">
                          Within 48h
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => handleCancelAppointment(appointment._id)}
                      disabled={loading}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>{loading ? 'Cancelling...' : 'Cancel'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Appointments Found */}
        {searchPerformed && appointments.length === 0 && !loading && !error && (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming appointments found</h3>
            <p className="text-gray-600">
              We couldn't find any upcoming appointments with the provided contact information.
            </p>
          </div>
        )}

        {/* Contact Information */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Need help? Contact us directly at{' '}
            <a href="mailto:cxsnaillounge1@gmail.com" className="text-blue-600 hover:text-blue-700">
              cxsnaillounge1@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CancelAppointment;
