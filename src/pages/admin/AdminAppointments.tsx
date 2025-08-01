import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Check, DollarSign, CreditCard, Banknote, X, Trash2, Building2, Mail, Phone } from 'lucide-react';
import { apiClient } from '../../lib/api';
import type { Appointment } from '../../lib/api';

interface AppointmentData extends Appointment {
  _id: string;
  customerName: string;
  service: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentMethod: 'cash' | 'bank_transfer';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  servicePrice: number;
}

const AdminAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const data = await apiClient.getAppointments();
      setAppointments(data as AppointmentData[]);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const markPaymentReceived = async (appointmentId: string) => {
    setLoading(true);
    try {
      await apiClient.markPaymentReceived(appointmentId, 'paid');
      await fetchAppointments();
      alert('Payment marked as received! Remember to refresh the Revenue page to see updated totals.');
    } catch (error) {
      console.error('Error marking payment as received:', error);
      alert('Failed to mark payment as received. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: AppointmentData['status']) => {
    setLoading(true);
    try {
      if (status === 'cancelled') {
        await apiClient.cancelAppointment(appointmentId);
      } else {
        await apiClient.updateAppointment(appointmentId, status);
      }
      await fetchAppointments();
      if (status === 'completed') {
        alert('Appointment marked as completed! Remember to refresh the Revenue page to see updated totals.');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('Failed to update appointment status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId: string, customerName: string) => {
    if (window.confirm(`Are you sure you want to cancel the appointment for ${customerName}?`)) {
      setLoading(true);
      try {
        await apiClient.cancelAppointment(appointmentId);
        await fetchAppointments();
      } catch (error) {
        console.error('Error cancelling appointment:', error);
        alert('Failed to cancel appointment. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const deleteAppointment = async (appointmentId: string, customerName: string, service: string, date: string) => {
    const confirmMessage = `Are you sure you want to PERMANENTLY DELETE this appointment?\n\nCustomer: ${customerName}\nService: ${service}\nDate: ${date}\n\nThis action CANNOT be undone and will remove the appointment completely from the system.`;
    
    if (window.confirm(confirmMessage)) {
      setLoading(true);
      try {
        await apiClient.deleteAppointment(appointmentId);
        await fetchAppointments();
        alert('Appointment permanently deleted from the system.');
      } catch (error) {
        console.error('Error deleting appointment:', error);
        alert('Failed to delete appointment. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Appointments</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b">Customer</th>
              <th className="py-2 px-4 border-b">Contact Details</th>
              <th className="py-2 px-4 border-b">Service</th>
              <th className="py-2 px-4 border-b">Date</th>
              <th className="py-2 px-4 border-b">Time</th>
              <th className="py-2 px-4 border-b">Price</th>
              <th className="py-2 px-4 border-b">Payment Method</th>
              <th className="py-2 px-4 border-b">Payment Status</th>
              <th className="py-2 px-4 border-b">Status</th>
              <th className="py-2 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment._id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b">{appointment.customerName}</td>
                <td className="py-2 px-4 border-b">
                  <div className="flex flex-col gap-1">
                    <a href={`mailto:${appointment.customerEmail}`} 
                       className="flex items-center text-blue-600 hover:text-blue-800 text-sm">
                      <Mail className="h-3 w-3 mr-1" />
                      {appointment.customerEmail}
                    </a>
                    <a href={`tel:${appointment.customerPhone}`} 
                       className="flex items-center text-blue-600 hover:text-blue-800 text-sm">
                      <Phone className="h-3 w-3 mr-1" />
                      {appointment.customerPhone}
                    </a>
                  </div>
                </td>
                <td className="py-2 px-4 border-b">{appointment.service}</td>
                <td className="py-2 px-4 border-b">
                  {format(new Date(appointment.date), 'MMM d, yyyy')}
                </td>
                <td className="py-2 px-4 border-b">{appointment.time}</td>
                <td className="py-2 px-4 border-b">${appointment.servicePrice}</td>
                <td className="py-2 px-4 border-b">
                  <div className="flex items-center">
                    {appointment.paymentMethod === 'cash' ? (
                      <>
                        <Banknote className="h-4 w-4 mr-1 text-green-600" />
                        <span>Cash</span>
                      </>
                    ) : appointment.paymentMethod === 'bank_transfer' ? (
                      <>
                        <Building2 className="h-4 w-4 mr-1 text-blue-600" />
                        <span>Bank Transfer</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-1 text-gray-600" />
                        <span>Other</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="py-2 px-4 border-b">
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    appointment.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                    appointment.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {appointment.paymentStatus}
                  </span>
                </td>
                <td className="py-2 px-4 border-b">
                  <select
                    value={appointment.status}
                    onChange={(e) => updateAppointmentStatus(appointment._id, e.target.value as AppointmentData['status'])}
                    disabled={loading}
                    className="px-2 py-1 rounded border border-gray-300 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td className="py-2 px-4 border-b">
                  <div className="flex items-center gap-2">
                    {(appointment.paymentMethod === 'cash' || appointment.paymentMethod === 'bank_transfer') && appointment.paymentStatus === 'pending' && (
                      <button
                        onClick={() => markPaymentReceived(appointment._id)}
                        disabled={loading}
                        className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        {appointment.paymentMethod === 'cash' ? 'Mark Cash Paid' : 'Mark Transfer Received'}
                      </button>
                    )}
                    {appointment.paymentStatus === 'paid' && (
                      <div className="flex items-center text-green-600 text-sm">
                        <Check className="h-4 w-4 mr-1" />
                        Paid
                      </div>
                    )}
                    {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                      <button
                        onClick={() => cancelAppointment(appointment._id, appointment.customerName)}
                        disabled={loading}
                        className="flex items-center px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => deleteAppointment(
                        appointment._id, 
                        appointment.customerName, 
                        appointment.service, 
                        format(new Date(appointment.date), 'MMM d, yyyy')
                      )}
                      disabled={loading}
                      className="flex items-center px-3 py-1 bg-red-800 text-white rounded hover:bg-red-900 disabled:opacity-50 text-sm border border-red-900"
                      title="Permanently delete this appointment"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {appointments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No appointments found.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAppointments;