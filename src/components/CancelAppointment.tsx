import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Search, Calendar, Clock, User, Phone, Mail, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '../lib/api';
import type { Appointment } from '../lib/api';

interface SearchFormData {
  customerEmail: string;
  customerPhone: string;
}

const CancelAppointment: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<SearchFormData>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelledAppointments, setCancelledAppointments] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearch = async (data: SearchFormData) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const results = await apiClient.findAppointmentsByCustomer(data.customerEmail, data.customerPhone);
      setAppointments(results);
      setSearchPerformed(true);
    } catch (error) {
      console.error('Error searching appointments:', error);
      setErrorMessage('Failed to search appointments. Please try again.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    setCancellingId(appointmentId);
    setErrorMessage(null);
    try {
      await apiClient.cancelAppointment(appointmentId);
      setCancelledAppointments(prev => new Set([...prev, appointmentId]));
      // Remove from the list or update status
      setAppointments(prev => prev.filter(apt => apt._id !== appointmentId));
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      setErrorMessage('Failed to cancel appointment. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const formatAppointmentDate = (date: string) => {
    try {
      return format(new Date(date), 'EEEE, MMMM d, yyyy');
    } catch {
      return date;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cancel Appointment</h1>
          <p className="text-gray-600">
            Enter your email and phone number to find and cancel your appointments
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit(handleSearch)} className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4 inline mr-2" />
                Email Address
              </label>
              <input
                {...register('customerEmail', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
              {errors.customerEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.customerEmail.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="h-4 w-4 inline mr-2" />
                Phone Number
              </label>
              <input
                {...register('customerPhone', { required: 'Phone number is required' })}
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your phone number"
              />
              {errors.customerPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.customerPhone.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Find My Appointments
              </>
            )}
          </button>
        </form>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchPerformed && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Your Appointments ({appointments.length})
            </h2>

            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming appointments found.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Please check your email and phone number are correct.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div
                    key={appointment._id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <User className="h-5 w-5 text-blue-600 mr-2" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {appointment.service}
                          </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {formatAppointmentDate(appointment.date)}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {appointment.time}
                          </div>
                        </div>

                        <div className="mt-3">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        </div>
                      </div>

                      <div className="ml-4">
                        {cancelledAppointments.has(appointment._id) ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            <span className="font-medium">Cancelled</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCancel(appointment._id)}
                            disabled={cancellingId === appointment._id}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {cancellingId === appointment._id ? (
                              <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2 inline-block"></div>
                                Cancelling...
                              </>
                            ) : (
                              'Cancel Appointment'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Important Notice */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-md p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Cancellation Policy</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Appointments can only be cancelled before the scheduled time</li>
                <li>You cannot cancel completed appointments</li>
                <li>For same-day cancellations, please call us directly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelAppointment;
