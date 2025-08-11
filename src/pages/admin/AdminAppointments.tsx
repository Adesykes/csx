import React, { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Check, DollarSign, CreditCard, Banknote, X, Trash2, Building2, Mail, Phone, Filter, Search, Calendar, Edit3, Save, XCircle } from 'lucide-react';
import { apiClient } from '../../lib/api';
import type { Appointment } from '../../lib/api';
import PendingReviewsNotification from '../../components/PendingReviewsNotification';

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
  
  // Filter states
  const [filters, setFilters] = useState({
    searchText: '',
    status: '',
    paymentStatus: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Editing states
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    paymentMethod: 'cash' | 'bank_transfer';
    servicePrice: number;
  }>({
    paymentMethod: 'cash',
    servicePrice: 0
  });

  // Filtered appointments using useMemo for performance
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      // Text search (name, email, service)
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesSearch = 
          appointment.customerName.toLowerCase().includes(searchLower) ||
          appointment.customerEmail.toLowerCase().includes(searchLower) ||
          (appointment.service && appointment.service.toLowerCase().includes(searchLower)) ||
          appointment.customerPhone.includes(filters.searchText);
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status && appointment.status !== filters.status) {
        return false;
      }

      // Payment status filter
      if (filters.paymentStatus && appointment.paymentStatus !== filters.paymentStatus) {
        return false;
      }

      // Payment method filter
      if (filters.paymentMethod && appointment.paymentMethod !== filters.paymentMethod) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom) {
        const appointmentDate = new Date(appointment.date);
        const fromDate = new Date(filters.dateFrom);
        if (appointmentDate < fromDate) return false;
      }

      if (filters.dateTo) {
        const appointmentDate = new Date(appointment.date);
        const toDate = new Date(filters.dateTo);
        if (appointmentDate > toDate) return false;
      }

      return true;
    });
  }, [appointments, filters]);

  const clearFilters = () => {
    setFilters({
      searchText: '',
      status: '',
      paymentStatus: '',
      paymentMethod: '',
      dateFrom: '',
      dateTo: ''
    });
  };

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
        await apiClient.updateAppointment(appointmentId, { status });
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

  const startEditing = (appointment: AppointmentData) => {
    setEditingAppointment(appointment._id);
    setEditValues({
      paymentMethod: appointment.paymentMethod,
      servicePrice: appointment.servicePrice
    });
  };

  const cancelEditing = () => {
    setEditingAppointment(null);
    setEditValues({ paymentMethod: 'cash', servicePrice: 0 });
  };

  const savePaymentDetails = async (appointmentId: string) => {
    setLoading(true);
    try {
      await apiClient.updateAppointment(appointmentId, {
        paymentMethod: editValues.paymentMethod,
        servicePrice: editValues.servicePrice
      });
      await fetchAppointments();
      setEditingAppointment(null);
      alert('Payment details updated successfully!');
    } catch (error) {
      console.error('Error updating payment details:', error);
      alert('Failed to update payment details. Please try again.');
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
      <PendingReviewsNotification />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6 border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search (Name, Email, Service, Phone)
              </label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={filters.searchText}
                  onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                  placeholder="Type to search..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status
              </label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Payment Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <div className="relative">
                <Calendar className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <div className="relative">
                <Calendar className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear All Filters
            </button>
            <div className="text-sm text-gray-600">
              Showing {filteredAppointments.length} of {appointments.length} appointments
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {(filters.searchText || filters.status || filters.paymentStatus || filters.paymentMethod || filters.dateFrom || filters.dateTo) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Total Filtered</div>
            <div className="text-xl font-bold text-blue-900">{filteredAppointments.length}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Confirmed/Completed</div>
            <div className="text-xl font-bold text-green-900">
              {filteredAppointments.filter(a => a.status === 'confirmed' || a.status === 'completed').length}
            </div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-sm text-yellow-600 font-medium">Pending Payment</div>
            <div className="text-xl font-bold text-yellow-900">
              {filteredAppointments.filter(a => a.paymentStatus === 'pending').length}
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Total Value</div>
            <div className="text-xl font-bold text-purple-900">
              ${filteredAppointments.reduce((sum, a) => sum + a.servicePrice, 0).toFixed(2)}
            </div>
          </div>
        </div>
      )}

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
            {filteredAppointments.map((appointment) => (
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
                <td className="py-2 px-4 border-b">
                  {editingAppointment === appointment._id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">$</span>
                      <input
                        type="number"
                        value={editValues.servicePrice}
                        onChange={(e) => setEditValues({ ...editValues, servicePrice: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <span>${appointment.servicePrice}</span>
                      <button
                        onClick={() => startEditing(appointment)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-opacity"
                        title="Edit price and payment method"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </td>
                <td className="py-2 px-4 border-b">
                  {editingAppointment === appointment._id ? (
                    <select
                      value={editValues.paymentMethod}
                      onChange={(e) => setEditValues({ ...editValues, paymentMethod: e.target.value as 'cash' | 'bank_transfer' })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  ) : (
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
                  )}
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
                    {editingAppointment === appointment._id ? (
                      <>
                        <button
                          onClick={() => savePaymentDetails(appointment._id)}
                          disabled={loading}
                          className="flex items-center px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={loading}
                          className="flex items-center px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 text-sm"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredAppointments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {appointments.length === 0 ? 'No appointments found.' : 'No appointments match the current filters.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAppointments;