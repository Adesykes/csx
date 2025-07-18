import React, { useState, useEffect } from 'react';
import { format, addDays, startOfDay } from 'date-fns';
import { apiClient } from '../lib/api';
import { Service } from '../types';
import ServiceCard from '../components/ServiceCard';
import Calendar from '../components/Calendar';
import TimeSlotPicker from '../components/TimeSlotPicker';
import BookingForm from '../components/BookingForm';
import { CheckCircle, Clock, DollarSign, Calendar as CalendarIcon } from 'lucide-react';

interface BookingStep {
  step: 'service' | 'datetime' | 'details' | 'confirmation';
}

const HomePage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<BookingStep['step']>('service');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [availableSlots, setAvailableSlots] = useState<{time: string, available: boolean}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    fetchServices();
    generateAvailableDates();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedService) {
      generateTimeSlots();
    }
  }, [selectedDate, selectedService]);

  const fetchServices = async () => {
    try {
      const data = await apiClient.getServices();
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      // Set mock services data as fallback
      setServices([
        {
          id: '1',
          name: 'Classic Manicure',
          description: 'Traditional nail care with polish application',
          price: 35,
          duration: 45,
          category: 'Manicure',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Gel Manicure',
          description: 'Long-lasting gel polish manicure',
          price: 50,
          duration: 60,
          category: 'Manicure',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Classic Pedicure',
          description: 'Relaxing foot care with polish',
          price: 45,
          duration: 60,
          category: 'Pedicure',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          name: 'Spa Pedicure',
          description: 'Luxurious spa treatment for your feet',
          price: 65,
          duration: 75,
          category: 'Pedicure',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
    }
  };

  const generateAvailableDates = () => {
    const dates: Date[] = [];
    const today = startOfDay(new Date());
    
    // Generate next 30 days (excluding Sundays for example)
    for (let i = 1; i <= 30; i++) {
      const date = addDays(today, i);
      if (date.getDay() !== 0) { // Exclude Sundays
        dates.push(date);
      }
    }
    
    setAvailableDates(dates);
  };

  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({ time, available: true });
      }
    }
    
    setAvailableSlots(slots);
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setCurrentStep('datetime');
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setCurrentStep('details');
  };

  const handleBookingSubmit = async (formData: any) => {
    setIsLoading(true);
    try {
      // Create appointment record
      const appointmentData = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        serviceId: selectedService?.id,
        serviceName: selectedService?.name,
        servicePrice: selectedService?.price,
        appointmentDate: format(selectedDate!, 'yyyy-MM-dd'),
        startTime: selectedTime,
        endTime: format(new Date(`2000-01-01T${selectedTime}:00`).getTime() + (selectedService?.duration || 60) * 60000, 'HH:mm'),
        status: 'pending',
        paymentStatus: 'pending',
        notes: formData.notes,
      };

      const data = await apiClient.createAppointment(appointmentData);

      // For demo purposes, we'll skip payment and mark as successful
      setBookingSuccess(true);
      setCurrentStep('confirmation');
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('There was an error creating your appointment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetBooking = () => {
    setCurrentStep('service');
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setBookingSuccess(false);
  };

  const steps = [
    { id: 'service', name: 'Choose Service', completed: currentStep !== 'service' },
    { id: 'datetime', name: 'Select Date & Time', completed: currentStep === 'details' || currentStep === 'confirmation' },
    { id: 'details', name: 'Your Details', completed: currentStep === 'confirmation' },
    { id: 'confirmation', name: 'Confirmation', completed: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Book Your Appointment
          </h1>
          <p className="text-xl text-gray-600">
            Experience premium nail care at CSX Nail Lounge
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.completed || currentStep === step.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-12 h-0.5 bg-gray-200 mx-4" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {currentStep === 'service' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                Choose Your Service
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(service => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isSelected={selectedService?.id === service.id}
                    onSelect={handleServiceSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {currentStep === 'datetime' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                Select Date & Time
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  availableDates={availableDates}
                />
                {selectedDate && (
                  <TimeSlotPicker
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    onTimeSelect={handleTimeSelect}
                    availableSlots={availableSlots}
                  />
                )}
              </div>
            </div>
          )}

          {currentStep === 'details' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                Complete Your Booking
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <BookingForm
                  onSubmit={handleBookingSubmit}
                  isLoading={isLoading}
                />
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Booking Summary
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-medium">{selectedService?.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">
                        {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{selectedService?.duration} minutes</span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between text-lg font-semibold">
                        <span>Total:</span>
                        <span className="text-green-600">${selectedService?.price}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'confirmation' && (
            <div className="text-center">
              <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Booking Confirmed!
                </h2>
                <p className="text-gray-600 mb-6">
                  Your appointment has been successfully booked. You'll receive a confirmation email shortly.
                </p>
                <button
                  onClick={resetBooking}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Book Another Appointment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;