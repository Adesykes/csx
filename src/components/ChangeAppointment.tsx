import { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Check, X } from 'lucide-react';
import { apiClient } from '../lib/api';
import { Service } from '../types';
import Calendar_Component from './Calendar';
import TimeSlotPicker from './TimeSlotPicker';

interface ChangeAppointmentProps {
  appointment: {
    _id: string;
    customerName: string;
    customerEmail: string;
    serviceName: string;
    serviceId: string;
    servicePrice: number;
    date: string;
    time: string;
    endTime: string;
    status: string;
  };
  onAppointmentChanged?: () => void;
  onCancel?: () => void;
}

const ChangeAppointment = ({ appointment, onAppointmentChanged, onCancel }: ChangeAppointmentProps): JSX.Element => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [canChange, setCanChange] = useState(true);

  useEffect(() => {
    loadServices();
    checkIfCanChange();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedService]);

  const checkIfCanChange = () => {
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + (48 * 60 * 60 * 1000));
    
    if (appointmentDateTime < fortyEightHoursFromNow) {
      setCanChange(false);
      setError('Appointments can only be changed up to 48 hours before the scheduled time');
    }
  };

  const loadServices = async () => {
    try {
      const servicesData = await apiClient.getServices();
      console.log('Loaded services:', servicesData);
      setServices(servicesData.filter(service => service.active));
      
      // Find and set the current service
      const currentService = servicesData.find(s => s._id === appointment.serviceId || s.name === appointment.serviceName);
      console.log('Current service found:', currentService);
      if (currentService) {
        setSelectedService(currentService);
      }
    } catch (err) {
      console.error('Error loading services:', err);
      setError('Failed to load services');
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || !selectedService) return;

    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const availability = await apiClient.getAppointmentAvailability();
      
      // Filter slots for the selected date and calculate end times
      const slotsForDate = availability
        .filter(slot => slot.date === dateString)
        .map(slot => {
          const startTime = new Date(`${slot.date}T${slot.time}`);
          const endTime = new Date(startTime.getTime() + (selectedService.duration * 60000));
          
          return {
            ...slot,
            available: true, // The API should already filter for available slots
            endTime: endTime.toTimeString().slice(0, 5)
          };
        });

      setAvailableSlots(slotsForDate);
    } catch (err) {
      console.error('Error loading time slots:', err);
      setError('Failed to load available time slots');
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime('');
    setError(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setError(null);
  };

  const handleServiceChange = (service: Service) => {
    setSelectedService(service);
    setSelectedTime('');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !selectedService) {
      setError('Please select a date, time, and service');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const startTime = selectedTime;
      
      // Calculate end time based on service duration
      const startDateTime = new Date(`${dateString}T${startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + (selectedService.duration * 60000));
      const endTime = endDateTime.toTimeString().slice(0, 5);

      await apiClient.changeAppointment(appointment._id, {
        appointmentDate: dateString,
        startTime,
        endTime,
        serviceId: selectedService._id,
        serviceName: selectedService.name,
        servicePrice: selectedService.price
      });

      setSuccess(true);
      if (onAppointmentChanged) {
        onAppointmentChanged();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to change appointment');
      console.error('Error changing appointment:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!canChange) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
          <h3 className="text-lg font-semibold text-red-900">Cannot Change Appointment</h3>
        </div>
        <p className="text-red-700 mb-4">
          Appointments can only be changed up to 48 hours before the scheduled time.
        </p>
        <p className="text-sm text-red-600">
          Your appointment is scheduled for {new Date(`${appointment.date}T${appointment.time}`).toLocaleString()}
        </p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Check className="h-6 w-6 text-green-600 mr-2" />
          <h3 className="text-lg font-semibold text-green-900">Appointment Changed Successfully</h3>
        </div>
        <p className="text-green-700 mb-4">
          Your appointment has been changed and a confirmation email has been sent.
        </p>
        <div className="bg-white rounded-md p-4 border border-green-200">
          <h4 className="font-semibold text-gray-900 mb-2">New Appointment Details:</h4>
          <p><strong>Service:</strong> {selectedService?.name}</p>
          <p><strong>Date:</strong> {selectedDate?.toLocaleDateString()}</p>
          <p><strong>Time:</strong> {selectedTime}</p>
          <p><strong>Price:</strong> £{selectedService?.price}</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Change Appointment</h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Current Appointment Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
        <h4 className="font-semibold text-amber-900 mb-2">Current Appointment:</h4>
        <p><strong>Service:</strong> {appointment.serviceName}</p>
        <p><strong>Date:</strong> {new Date(appointment.date).toLocaleDateString()}</p>
        <p><strong>Time:</strong> {appointment.time}</p>
        <p><strong>Price:</strong> £{appointment.servicePrice}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Service Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Service (optional - keep current service if unchanged)
        </label>
        <select
          value={selectedService?._id || ''}
          onChange={(e) => {
            console.log('Service selection changed:', e.target.value);
            const service = services.find(s => s._id === e.target.value);
            console.log('Found service:', service);
            if (service) handleServiceChange(service);
          }}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a service</option>
          {services.map((service) => (
            <option key={service._id} value={service._id}>
              {service.name} - £{service.price} ({service.duration}min)
            </option>
          ))}
        </select>
        <div className="mt-2 text-sm text-gray-500">
          Debug: {services.length} services loaded, selected: {selectedService?.name || 'None'}
        </div>
      </div>

      {/* Calendar */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select New Date
        </label>
        <Calendar_Component
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          availableDates={[]} // Will be populated with actual available dates
        />
      </div>

      {/* Time Slots */}
      {selectedDate && selectedService && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select New Time
          </label>
          <TimeSlotPicker
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onTimeSelect={handleTimeSelect}
            availableSlots={availableSlots.map(slot => ({
              time: slot.time,
              available: slot.available
            }))}
          />
        </div>
      )}

      {/* Submit Button */}
      <div className="flex space-x-4">
        <button
          onClick={handleSubmit}
          disabled={isLoading || !selectedDate || !selectedTime || !selectedService}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors ${
            isLoading || !selectedDate || !selectedTime || !selectedService
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Changing Appointment...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 mr-2" />
              Change Appointment
            </>
          )}
        </button>
        
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default ChangeAppointment;
