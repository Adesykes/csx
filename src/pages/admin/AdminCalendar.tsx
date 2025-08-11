import React, { useEffect, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { apiClient } from '../../lib/api';
import type { Appointment } from '../../lib/api';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User, Phone, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

interface AppointmentEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Appointment;
}

interface AppointmentData extends Appointment {
  _id: string;
  customerName: string;
  service: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentMethod: 'cash' | 'bank_transfer';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'cancelled';
  servicePrice: number;
}

const AdminCalendar: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<AppointmentEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('month');
  const [isMobile, setIsMobile] = useState(false);
  const [date, setDate] = useState(new Date());

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto-switch to agenda view on small screens
      if (window.innerWidth < 640) {
        setCurrentView('day');
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAppointments();
      setAppointments(data as AppointmentData[]);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert appointments to calendar events
  const events: AppointmentEvent[] = appointments.map(appointment => {
    const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
    const endDate = new Date(appointmentDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    return {
      id: appointment._id,
      title: `${appointment.customerName} - ${appointment.service}`,
      start: appointmentDate,
      end: endDate,
      resource: appointment
    };
  });

  // Custom event style based on appointment status - mobile optimized
  const eventStyleGetter = (event: AppointmentEvent) => {
    const appointment = event.resource;
    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';
    
    switch (appointment.status) {
      case 'confirmed':
        backgroundColor = '#10b981';
        borderColor = '#059669';
        break;
      case 'completed':
        backgroundColor = '#6b7280';
        borderColor = '#4b5563';
        break;
      case 'cancelled':
        backgroundColor = '#ef4444';
        borderColor = '#dc2626';
        break;
      case 'pending':
      default:
        backgroundColor = '#f59e0b';
        borderColor = '#d97706';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white',
        fontSize: isMobile ? '10px' : '12px',
        padding: isMobile ? '1px 2px' : '2px 4px',
        borderRadius: '3px',
        border: 'none',
        fontWeight: 'bold'
      }
    };
  };

  // Mobile-optimized formats
  const formats = {
    monthHeaderFormat: isMobile ? 'MMM YYYY' : 'MMMM YYYY',
    dayHeaderFormat: isMobile ? 'ddd M/D' : 'dddd, MMMM Do',
    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) => 
      isMobile 
        ? `${moment(start).format('M/D')} - ${moment(end).format('M/D')}`
        : `${moment(start).format('MMMM Do')} - ${moment(end).format('MMMM Do')}`,
    timeGutterFormat: isMobile ? 'h A' : 'h:mm A',
    eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) => 
      isMobile 
        ? moment(start).format('h:mm A')
        : `${moment(start).format('h:mm A')} - ${moment(end).format('h:mm A')}`,
  };

  const handleSelectEvent = (event: AppointmentEvent) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  // Handle calendar navigation
  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  // Handle view changes
  const handleViewChange = (view: any) => {
    if (view === 'month' || view === 'week' || view === 'day') {
      setCurrentView(view);
    }
  };

  // Custom navigation for mobile
  const navigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    const newDate = new Date(date);
    
    if (currentView === 'month') {
      if (action === 'PREV') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (action === 'NEXT') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else {
        setDate(new Date());
        return;
      }
    } else if (currentView === 'day') {
      if (action === 'PREV') {
        newDate.setDate(newDate.getDate() - 1);
      } else if (action === 'NEXT') {
        newDate.setDate(newDate.getDate() + 1);
      } else {
        setDate(new Date());
        return;
      }
    }
    
    setDate(newDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'pending': default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'refunded': return 'text-blue-600 bg-blue-100';
      case 'pending': default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Appointment Calendar</h1>
                <p className="text-gray-600">Monthly view of all appointments</p>
              </div>
            </div>
            
            {/* Mobile View Toggle */}
            {isMobile && (
              <button
                onClick={() => setCurrentView(currentView === 'month' ? 'day' : 'month')}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              >
                {currentView === 'month' ? 'Day View' : 'Month View'}
              </button>
            )}
          </div>
          
          {/* Mobile Navigation */}
          {isMobile && (
            <div className="flex justify-between items-center mt-4 bg-gray-100 p-2 rounded">
              <button
                onClick={() => navigate('PREV')}
                className="p-2 text-gray-600 hover:text-gray-800"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="font-medium text-gray-800">
                {moment(date).format(currentView === 'month' ? 'MMMM YYYY' : 'MMMM Do, YYYY')}
              </span>
              <button
                onClick={() => navigate('NEXT')}
                className="p-2 text-gray-600 hover:text-gray-800"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 rounded"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Cancelled</span>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="p-6">
          <div style={{ height: isMobile ? '400px' : '600px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              views={isMobile ? ['month', 'day'] : ['month', 'week', 'day']}
              view={currentView}
              onView={handleViewChange}
              date={date}
              onNavigate={handleNavigate}
              formats={formats}
              popup={!isMobile}
              popupOffset={isMobile ? 0 : 10}
              step={30}
              showMultiDayTimes
              components={{
                toolbar: isMobile ? () => null : undefined, // Hide default toolbar on mobile
              }}
              tooltipAccessor={(event: AppointmentEvent) => 
                `${event.resource.customerName} - ${event.resource.service} at ${event.resource.time}`
              }
            />
          </div>
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {showModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">Appointment Details</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Customer Info */}
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedEvent.resource.customerName}</p>
                    <p className="text-sm text-gray-600">{selectedEvent.resource.customerEmail}</p>
                  </div>
                </div>

                {/* Contact */}
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <p className="text-gray-900">{selectedEvent.resource.customerPhone}</p>
                </div>

                {/* Service */}
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <p className="text-gray-900">{selectedEvent.resource.service}</p>
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <p className="text-gray-900">
                    {format(new Date(selectedEvent.resource.date), 'EEEE, MMMM d, yyyy')} at {selectedEvent.resource.time}
                  </p>
                </div>

                {/* Price */}
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                  <p className="text-gray-900">£{selectedEvent.resource.servicePrice?.toFixed(2) || '0.00'}</p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedEvent.resource.status)}`}>
                      {selectedEvent.resource.status.charAt(0).toUpperCase() + selectedEvent.resource.status.slice(1)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedEvent.resource.paymentStatus)}`}>
                      Payment: {selectedEvent.resource.paymentStatus.charAt(0).toUpperCase() + selectedEvent.resource.paymentStatus.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 flex items-center justify-center">
                    <div className="h-3 w-3 rounded bg-gray-400"></div>
                  </div>
                  <p className="text-gray-900">
                    Payment Method: {selectedEvent.resource.paymentMethod === 'cash' ? 'Cash' : 'Bank Transfer'}
                  </p>
                </div>

                {/* Notes if any */}
                {selectedEvent.resource.notes && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-900 mb-2">Notes:</p>
                    <p className="text-sm text-gray-600">{selectedEvent.resource.notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
