import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { apiClient } from '../../lib/api';
import { Appointment } from '../../types';
import { Calendar, Clock, User, Phone, Mail, DollarSign, CheckCircle, X } from 'lucide-react';

const AdminAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAppointments();
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      await apiClient.updateAppointment({ id: appointmentId, status });
      
      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status } : apt
        )
      );
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const filteredAppointments = appointments.filter(apt => 
    selectedStatus === 'all' || apt.status === selectedStatus
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
        <p className="mt-2 text-gray-600">Manage all customer appointments</p>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      {format(new Date(appointment.appointmentDate), 'MMM d, yyyy')}
            <p className="mt-1 text-sm text-gray-500">
              {selectedStatus === 'all' 
                ? 'No appointments found.' 
                : `No ${selectedStatus} appointments found.`}
            </p>
                      {appointment.startTime} - {appointment.endTime}
        ) : (
          filteredAppointments.map(appointment => (
            <div key={appointment.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                      {appointment.customerPhone}
                    <User className="h-10 w-10 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {appointment.customerName}
                      {appointment.customerEmail}
                    <p className="text-sm text-gray-600">{appointment.serviceName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    ${appointment.servicePrice}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {appointment.start_time} - {appointment.end_time}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {appointment.customer_phone}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {appointment.customer_email}
                  </span>
                </div>
              </div>

              {appointment.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700">
                    <strong>Notes:</strong> {appointment.notes}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {appointment.status !== 'confirmed' && (
                  <button
                    onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                    className="flex items-center space-x-1 bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Confirm</span>
                  </button>
                )}
                {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                  <button
                    onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                    className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Complete</span>
                  </button>
                )}
                {appointment.status !== 'cancelled' && (
                  <button
                    onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                    className="flex items-center space-x-1 bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminAppointments;