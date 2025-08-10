import { useState, useEffect, useCallback } from 'react';
import { Calendar, AlertCircle, Check, X } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
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
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [closureDates, setClosureDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [canChange, setCanChange] = useState(true);

  useEffect(() => {
    loadServices();
    loadBusinessData();
    checkIfCanChange();
  }, []);

  // Generate available dates when business hours and closure dates are loaded
  useEffect(() => {
    if (businessHours.length === 0) return;
    
    const dates: Date[] = [];
    const today = startOfDay(new Date());
    
    for (let i = 0; i <= 30; i++) { // Next 30 days
      const date = addDays(today, i);
      const dayOfWeek = format(date, 'EEEE'); // Monday, Tuesday, etc.
      const dateString = format(date, 'yyyy-MM-dd');
      
      // Check if date is a closure date
      if (closureDates.includes(dateString)) {
        continue; // Skip closure dates
      }
      
      const daySchedule = businessHours.find((schedule: any) => schedule.day === dayOfWeek);
      
      // Only include dates where the business is open
      if (daySchedule && daySchedule.isOpen) {
        dates.push(date);
      }
    }
    
    setAvailableDates(dates);
  }, [businessHours, closureDates]);

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
      const activeServices = servicesData.filter(service => service.active);
      setServices(activeServices);
      
      // Find and set the current service - try multiple matching strategies
      let currentService = activeServices.find(s => s._id === appointment.serviceId);
      if (!currentService) {
        currentService = activeServices.find(s => s.id === appointment.serviceId);
      }
      if (!currentService) {
        currentService = activeServices.find(s => s.name === appointment.serviceName);
      }
      
      console.log('Current service found:', currentService);
      console.log('Looking for serviceId:', appointment.serviceId, 'serviceName:', appointment.serviceName);
      
      if (currentService) {
        setSelectedService(currentService);
      } else {
        // If no service found, don't pre-select anything but allow user to choose
        console.log('No matching service found, user will need to select manually');
      }
    } catch (err) {
      console.error('Error loading services:', err);
      setError('Failed to load services');
    }
  };

  const loadBusinessData = async () => {
    try {
      // Load business hours
      const businessHoursData = await apiClient.getBusinessHours();
      setBusinessHours(businessHoursData);
      
      // Load closure dates  
      const closureDatesData = await apiClient.getClosureDates();
      const closureDatesStrings = closureDatesData.map((closure: any) => closure.date);
      setClosureDates(closureDatesStrings);
    } catch (err) {
      console.error('Error loading business data:', err);
      setError('Failed to load business hours and closure dates');
    }
  };

  const loadAvailableSlots = useCallback(async () => {
    if (!selectedDate || !selectedService || businessHours.length === 0) return;

    try {
      // Calculate total duration for the selected service
      const totalDuration = selectedService.duration;
      
      // Get the day of the week
      const dayOfWeek = format(selectedDate, 'EEEE'); // Returns Monday, Tuesday, etc.
      
      const daySchedule = businessHours.find((schedule: any) => schedule.day === dayOfWeek);
      
      if (!daySchedule || !daySchedule.isOpen) {
        setAvailableSlots([]);
        return;
      }
      
      // Get existing appointments for the target date
      let dayAppointments: any[] = [];
      try {
        const existingAppointments = await apiClient.getAppointmentAvailability();
        const targetDateString = format(selectedDate, 'yyyy-MM-dd');
        dayAppointments = existingAppointments.filter(apt => apt.date === targetDateString);
      } catch (error) {
        console.error('Error fetching appointment availability:', error);
        // Continue with empty appointments array if API fails
      }
      
      // Generate slots based on business hours
      const slots: any[] = [];
      const openTime = daySchedule.openTime;
      const closeTime = daySchedule.closeTime;
      
      // Parse open and close times
      const [openHour, openMinute] = openTime.split(':').map(Number);
      const [closeHour, closeMinute] = closeTime.split(':').map(Number);
      
      // Generate 2-hour slots up to and including the closing time
      let currentHour = openHour;
      let currentMinute = openMinute;
      
      // Get current time for comparison (only relevant for today)
      const now = new Date();
      const isToday = format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      const currentTimeMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1;
      
      // Helper function to convert time string to minutes
      const timeToMinutes = (timeString: string): number => {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      while (currentHour < closeHour || (currentHour === closeHour && currentMinute <= closeMinute)) {
        const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        const slotTimeMinutes = currentHour * 60 + currentMinute;
        
        // Check if this time slot conflicts with any existing appointment
        let isAvailable = true;
        
        // Skip past time slots for today
        if (isToday && slotTimeMinutes <= currentTimeMinutes) {
          isAvailable = false;
        }
        
        if (dayAppointments.length > 0 && isAvailable) {
          isAvailable = !dayAppointments.some(appointment => {
            const appointmentTime = appointment.time;
            const appointmentTimeMinutes = timeToMinutes(appointmentTime);
            
            // Get the duration of the existing appointment
            const appointmentDuration = appointment.duration || 
              (services.find(s => 
                s.name === appointment.service || 
                s._id === appointment.service || 
                s.id === appointment.service
              )?.duration) || 60; // Default to 60 minutes if duration not found
            
            // Check if the current slot would conflict with the existing appointment
            const currentSlotEnd = slotTimeMinutes + totalDuration;
            const appointmentEnd = appointmentTimeMinutes + appointmentDuration;
            
            return (
              (slotTimeMinutes >= appointmentTimeMinutes && slotTimeMinutes < appointmentEnd) ||
              (currentSlotEnd > appointmentTimeMinutes && slotTimeMinutes < appointmentTimeMinutes)
            );
          });
        }
        
        slots.push({
          time: timeString,
          available: isAvailable
        });
        
        // Add 2 hours (120 minutes)
        currentMinute += 120;
        if (currentMinute >= 60) {
          currentHour += Math.floor(currentMinute / 60);
          currentMinute = currentMinute % 60;
        }
      }
      
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error generating time slots:', error);
      setAvailableSlots([]);
    }
  }, [selectedDate, selectedService, businessHours, services]);

  useEffect(() => {
    if (selectedDate && selectedService) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedService, loadAvailableSlots]);

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
          Service Selection
        </label>
        <select
          value={selectedService?._id || selectedService?.id || ''}
          onChange={(e) => {
            console.log('Service selection changed:', e.target.value);
            const service = services.find(s => s._id === e.target.value || s.id === e.target.value);
            console.log('Found service:', service);
            if (service) handleServiceChange(service);
          }}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a service</option>
          {services.map((service) => (
            <option key={service._id || service.id} value={service._id || service.id}>
              {service.name} - £{service.price} ({service.duration}min)
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Select the service for your new appointment
        </p>
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
          availableDates={availableDates}
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
