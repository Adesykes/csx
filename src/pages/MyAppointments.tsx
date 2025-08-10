import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Edit2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { apiClient, Appointment } from '../lib/api';
import { isAuthenticated, isClient, getUserInfo } from '../lib/auth';
import { useNavigate } from 'react-router-dom';

const MyAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const userInfo = getUserInfo();

  // Redirect if not authenticated or not a client
  useEffect(() => {
    if (!isAuthenticated() || !isClient()) {
      navigate('/login');
      return;
    }
    
    loadMyAppointments();
  }, [navigate]);

  const loadMyAppointments = async () => {
    setLoading(true);
    setError(null);

    try {
      const myAppointments = await apiClient.getMyAppointments();
      console.log('📅 Loaded appointments:', myAppointments);
      setAppointments(myAppointments);
    } catch (err: any) {
      console.error('Error loading appointments:', err);
      setError('Failed to load your appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if appointment can be changed or cancelled (48-hour rule)
  const canModifyAppointment = (appointment: Appointment): boolean => {
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      return false;
    }
    
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + (48 * 60 * 60 * 1000));
    
    return appointmentDateTime >= fortyEightHoursFromNow;
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.cancelAppointment(appointmentId);
      
      // Reload appointments to reflect the change
      await loadMyAppointments();
      setSuccess('Appointment cancelled successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Cancellation error:', err);
      setError('Failed to cancel appointment. Please try again or contact us directly.');
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
    
    // Navigate to booking page with a change indicator
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'cancelled':
        return 'Cancelled';
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Group appointments by status
  const groupedAppointments = appointments.reduce((groups, appointment) => {
    const status = appointment.status;
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(appointment);
    return groups;
  }, {} as Record<string, Appointment[]>);

  // Order groups by priority
  const statusOrder = ['pending', 'confirmed', 'completed', 'cancelled'];
  const orderedGroups = statusOrder.map(status => ({
    status,
    appointments: groupedAppointments[status] || []
  })).filter(group => group.appointments.length > 0);

  if (!isAuthenticated() || !isClient()) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Appointments</h1>
              <p className="text-gray-600">
                Welcome back, {userInfo?.name}! Here are all your appointments.
              </p>
            </div>
            <Calendar className="h-12 w-12 text-pink-500" />
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              <span className="ml-2 text-gray-600">Loading your appointments...</span>
            </div>
          </div>
        )}

        {/* No Appointments */}
        {!loading && appointments.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
            <p className="text-gray-600 mb-4">
              You haven't booked any appointments yet.
            </p>
            <button
              onClick={() => navigate('/booking')}
              className="bg-pink-600 text-white px-6 py-2 rounded-md hover:bg-pink-700 transition-colors"
            >
              Book Your First Appointment
            </button>
          </div>
        )}

        {/* Appointments List */}
        {!loading && appointments.length > 0 && (
          <div className="space-y-6">
            {orderedGroups.map(({ status, appointments }) => (
              <div key={status} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 capitalize">
                    {getStatusText(status)} Appointments ({appointments.length})
                  </h2>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {appointments.map((appointment) => (
                    <div key={appointment._id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            {getStatusIcon(appointment.status)}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                              {getStatusText(appointment.status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                <span className="font-medium">{formatDate(appointment.date)}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                <span>{formatTime(appointment.time)}</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Service:</span> {appointment.service}
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Payment:</span> {appointment.paymentMethod === 'cash' ? 'Cash' : 'Bank Transfer'}
                              </div>
                            </div>
                          </div>

                          {appointment.notes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-md">
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">Notes:</span> {appointment.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        {canModifyAppointment(appointment) && (
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleChangeAppointment(appointment)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                              title="Change appointment"
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              Change
                            </button>
                            <button
                              onClick={() => handleCancelAppointment(appointment._id)}
                              className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 transition-colors"
                              title="Cancel appointment"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {!loading && appointments.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <button
                onClick={() => navigate('/booking')}
                className="bg-pink-600 text-white px-6 py-3 rounded-md hover:bg-pink-700 transition-colors font-medium"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAppointments;
