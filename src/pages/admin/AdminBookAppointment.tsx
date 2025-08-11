import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, CreditCard, Plus, Save, AlertCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { apiClient } from '../../lib/api';
import type { Service } from '../../types';

interface Extra {
  _id: string;
  name: string;
  price: number;
  description: string;
  active: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  service: string;
  servicePrice: number;
  date: string;
  time: string;
  paymentMethod: 'cash' | 'bank-transfer';
  extras: { id: string; name: string; price: number }[];
  notes: string;
}

const AdminBookAppointment: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<BookingFormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    service: '',
    servicePrice: 0,
    date: '',
    time: '',
    paymentMethod: 'cash',
    extras: [],
    notes: ''
  });

  // Load services and extras on component mount
  useEffect(() => {
    loadServices();
    loadExtras();
  }, []);

  // Load time slots when date changes
  useEffect(() => {
    if (formData.date) {
      loadTimeSlots(formData.date);
    }
  }, [formData.date]);

  const loadServices = async () => {
    try {
      const data = await apiClient.getServices();
      setServices(data.filter((service: Service) => service.active));
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadExtras = async () => {
    try {
      const data = await apiClient.getExtras();
      setExtras(data.filter((extra: Extra) => extra.active));
    } catch (error) {
      console.error('Error loading extras:', error);
    }
  };

  const loadTimeSlots = async (date: string) => {
    setLoading(true);
    try {
      // Get business hours
      const businessHoursResponse = await fetch('/api/business-hours');
      const businessHours = await businessHoursResponse.json();
      
      // Get day of week for selected date
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Find business hours for the selected day
      const dayHours = businessHours.schedule?.find((day: any) => day.day === dayOfWeek);
      
      if (!dayHours || !dayHours.isOpen) {
        setTimeSlots([]);
        return;
      }

      // Get existing appointments for the date
      const response = await fetch(`/api/appointments?date=${date}`);
      const appointments = await response.json();
      
      // Parse business hours
      const startTime = dayHours.startTime; // e.g., "09:00"
      const endTime = dayHours.endTime; // e.g., "17:00"
      
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      // Generate time slots based on business hours
      const slots: TimeSlot[] = [];
      
      for (let hour = startHour; hour < endHour || (hour === endHour && startMinute < endMinute); hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          // Stop if we've reached the end time
          if (hour === endHour && minute >= endMinute) break;
          
          // Skip if before start time on the start hour
          if (hour === startHour && minute < startMinute) continue;
          
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const isBooked = appointments.some((apt: any) => apt.time === time && apt.status !== 'cancelled');
          slots.push({ time, available: !isBooked });
        }
      }
      
      setTimeSlots(slots);
    } catch (error) {
      console.error('Error loading time slots:', error);
      // Fallback to default hours if business hours fetch fails
      const response = await fetch(`/api/appointments?date=${date}`);
      const appointments = await response.json();
      
      const slots: TimeSlot[] = [];
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const isBooked = appointments.some((apt: any) => apt.time === time && apt.status !== 'cancelled');
          slots.push({ time, available: !isBooked });
        }
      }
      setTimeSlots(slots);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceChange = (serviceId: string) => {
    const selectedService = services.find(s => (s._id || s.id) === serviceId);
    if (selectedService) {
      setFormData(prev => ({
        ...prev,
        service: serviceId,
        servicePrice: selectedService.price
      }));
    }
  };

  const calculateTotalPrice = () => {
    const servicePrice = formData.servicePrice || 0;
    const extrasPrice = formData.extras.reduce((sum, extra) => sum + extra.price, 0);
    return servicePrice + extrasPrice;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.customerName || !formData.customerEmail || !formData.customerPhone || 
          !formData.service || !formData.date || !formData.time) {
        throw new Error('Please fill in all required fields');
      }

      // Create booking data
      const bookingData = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        service: services.find(s => (s._id || s.id) === formData.service)?.name || '',
        servicePrice: formData.servicePrice,
        date: formData.date,
        time: formData.time,
        paymentMethod: formData.paymentMethod,
        paymentStatus: 'pending',
        status: 'confirmed', // Admin bookings are automatically confirmed
        extras: formData.extras,
        notes: formData.notes,
        totalPrice: calculateTotalPrice(),
        bookedBy: 'admin' // Flag to indicate admin booking
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to book appointment');
      }

      // Send confirmation email
      try {
        const emailResponse = await fetch('/api/send-confirmation-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerName: formData.customerName,
            customerEmail: formData.customerEmail,
            services: [{ name: services.find(s => (s._id || s.id) === formData.service)?.name || '', price: formData.servicePrice }],
            serviceQuantities: new Map(),
            date: formData.date,
            time: formData.time,
            totalPrice: calculateTotalPrice(),
            paymentMethod: formData.paymentMethod,
            extras: formData.extras
          }),
        });

        if (!emailResponse.ok) {
          console.warn('Failed to send confirmation email, but appointment was created successfully');
        }
      } catch (emailError) {
        console.warn('Error sending confirmation email:', emailError);
      }

      setSuccess('Appointment booked successfully! Confirmation email sent to customer.');
      
      // Reset form
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        service: '',
        servicePrice: 0,
        date: '',
        time: '',
        paymentMethod: 'cash',
        extras: [],
        notes: ''
      });

      // Reload time slots to show updated availability
      if (formData.date) {
        loadTimeSlots(formData.date);
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const getMinDate = () => {
    return format(new Date(), 'yyyy-MM-dd');
  };

  const getMaxDate = () => {
    return format(addDays(new Date(), 90), 'yyyy-MM-dd');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Plus className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
              <p className="text-gray-600">Create a new appointment for a client</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Service Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Service Selection
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service *
              </label>
              <select
                value={formData.service}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a service</option>
                {services.map((service) => (
                  <option key={service._id || service.id} value={service._id || service.id}>
                    {service.name} - £{service.price.toFixed(2)} ({service.duration} mins)
                  </option>
                ))}
              </select>
            </div>

            {/* Extras with Checkboxes */}
            {extras.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Additional Services (Optional)
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {extras.map((extra) => (
                    <div key={extra._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`extra-${extra._id}`}
                            checked={formData.extras.some(e => e.id === extra._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  extras: [...prev.extras, { id: extra._id, name: extra.name, price: extra.price }]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  extras: prev.extras.filter(e => e.id !== extra._id)
                                }));
                              }
                            }}
                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`extra-${extra._id}`} className="cursor-pointer flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">{extra.name}</h4>
                                {extra.description && (
                                  <p className="text-sm text-gray-600">{extra.description}</p>
                                )}
                              </div>
                              <span className="text-lg font-semibold text-green-600 ml-4">
                                £{extra.price.toFixed(2)}
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Selected Extras Summary */}
                {formData.extras.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Selected Additional Services:</h4>
                    <div className="space-y-1">
                      {formData.extras.map((extra) => (
                        <div key={extra.id} className="flex justify-between text-sm">
                          <span className="text-blue-800">{extra.name}</span>
                          <span className="text-blue-900 font-medium">£{extra.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date and Time Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Date & Time
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value, time: '' }))}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time *
                </label>
                <select
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!formData.date || loading}
                >
                  <option value="">Select a time</option>
                  {timeSlots.map((slot) => (
                    <option 
                      key={slot.time} 
                      value={slot.time} 
                      disabled={!slot.available}
                    >
                      {slot.time} {!slot.available ? '(Booked)' : ''}
                    </option>
                  ))}
                </select>
                {loading && <p className="text-sm text-gray-500 mt-1">Loading available times...</p>}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as 'cash' | 'bank-transfer' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">Cash</option>
                <option value="bank-transfer">Bank Transfer</option>
              </select>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Booking Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Service:</span>
                  <span>£{formData.servicePrice.toFixed(2)}</span>
                </div>
                {formData.extras.map((extra) => (
                  <div key={extra.id} className="flex justify-between">
                    <span>{extra.name}:</span>
                    <span>£{extra.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-1 flex justify-between font-medium">
                  <span>Total:</span>
                  <span>£{calculateTotalPrice().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional notes about the appointment..."
            />
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
              <Save className="h-4 w-4" />
              <span>{success}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Booking...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Book Appointment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminBookAppointment;
