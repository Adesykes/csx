import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { addDays, startOfDay, format } from 'date-fns';
import { apiClient } from '../lib/api';
import { Service } from '../types';
import { TimeSlot } from '../lib/api';
import ServiceCard from '../components/ServiceCard';
import Calendar from '../components/Calendar';
import TimeSlotPicker from '../components/TimeSlotPicker';
import BookingForm from '../components/BookingForm';
import { CheckCircle, ChevronLeft } from 'lucide-react';

interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

type BookingStep = 'service' | 'datetime' | 'details' | 'confirmation';

const HomePage = (): JSX.Element => {
  const location = useLocation();
  
  // State management
  const [currentStep, setCurrentStep] = useState<BookingStep>('service');
  const [services, setServices] = useState<Service[]>([]);
  const [businessHours, setBusinessHours] = useState<DaySchedule[]>([]);
  const [closureDates, setClosureDates] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [serviceQuantities, setServiceQuantities] = useState<Map<string, number>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Remove early return for error, move error rendering into main return below

  // Generate time slots based on business hours
  const generateTimeSlots = useCallback(async (dateToUse?: Date) => {
    const targetDate = dateToUse || selectedDate;
    
    if (!targetDate || selectedServices.length === 0 || businessHours.length === 0) return;
    
    try {
      // Calculate total duration for all selected services
      const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
      
      // Get the day of the week
      const dayOfWeek = format(targetDate, 'EEEE'); // Returns Monday, Tuesday, etc.
      
      const daySchedule = businessHours.find(schedule => schedule.day === dayOfWeek);
      
      if (!daySchedule || !daySchedule.isOpen) {
        setAvailableSlots([]);
        return;
      }
      
      // Get existing appointments for the target date
      let dayAppointments: any[] = [];
      try {
        const existingAppointments = await apiClient.getAppointmentAvailability();
        const targetDateString = format(targetDate, 'yyyy-MM-dd');
        dayAppointments = existingAppointments.filter(apt => apt.date === targetDateString);
      } catch (error) {
        console.error('Error fetching appointment availability:', error);
        // Continue with empty appointments array if API fails
      }
      
      // Generate slots based on business hours
      const slots: TimeSlot[] = [];
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
      const isToday = format(targetDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      const currentTimeMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1;
      
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
  }, [selectedDate, selectedServices, businessHours, services]);

  // Helper function to convert time string to minutes
  const timeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Auto-generate time slots when dependencies change (but not when called directly from handleDateSelect)
  useEffect(() => {
    if (selectedDate && selectedServices.length > 0 && businessHours.length > 0) {
      void generateTimeSlots();
    }
  }, [selectedServices, businessHours, services, generateTimeSlots]); // Include services so it refreshes when services are loaded

  // Event handlers
  const handleServiceSelect = useCallback((service: Service) => {
    setSelectedServices(prev => {
      // Use a more robust ID comparison
      const serviceId = service._id || service.id;
      const isAlreadySelected = prev.some(s => {
        const existingId = s._id || s.id;
        return existingId === serviceId;
      });
      
      if (isAlreadySelected) {
        // Remove service and its quantity
        if (serviceId) {
          setServiceQuantities(prevQuantities => {
            const newQuantities = new Map(prevQuantities);
            newQuantities.delete(serviceId);
            return newQuantities;
          });
        }
        // Remove service if already selected
        return prev.filter(s => {
          const existingId = s._id || s.id;
          return existingId !== serviceId;
        });
      } else {
        // Add service to selection and set quantity for quantity-based services
        const isQuantityService = (service.duration === 0 || 
          service.category?.toLowerCase() === 'nail art' || 
          service.category?.toLowerCase() === 'nail repair') &&
          service.category?.toLowerCase() !== 'block colour';
        if (isQuantityService && serviceId) {
          setServiceQuantities(prevQuantities => {
            const newQuantities = new Map(prevQuantities);
            newQuantities.set(serviceId, 1); // Start with quantity 1 when first selected
            return newQuantities;
          });
        }
        return [...prev, service];
      }
    });
  }, []);

  // Quantity change handler for quantity-based services
  const handleQuantityChange = useCallback((service: Service, quantity: number) => {
    const serviceId = service._id || service.id || '';
    
    if (quantity === 0) {
      // Remove service when quantity becomes 0
      setSelectedServices(prev => prev.filter(s => {
        const existingId = s._id || s.id;
        return existingId !== serviceId;
      }));
      setServiceQuantities(prevQuantities => {
        const newQuantities = new Map(prevQuantities);
        newQuantities.delete(serviceId);
        return newQuantities;
      });
    } else {
      // Update quantity
      setServiceQuantities(prevQuantities => {
        const newQuantities = new Map(prevQuantities);
        newQuantities.set(serviceId, quantity);
        return newQuantities;
      });
    }
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    // Generate time slots immediately with the new date
    void generateTimeSlots(date);
  }, [generateTimeSlots]);

  const handleBookingComplete = useCallback(() => {
    setBookingSuccess(true);
    setCurrentStep('confirmation');
    
    // Refresh time slots to reflect the newly booked appointment
    if (selectedDate && selectedServices.length > 0 && businessHours.length > 0) {
      void generateTimeSlots(selectedDate);
    }
  }, [selectedDate, selectedServices, businessHours, generateTimeSlots]);

  const resetBooking = useCallback(() => {
    setCurrentStep('service');
    setSelectedServices([]);
    setSelectedDate(null);
    setSelectedTime(null);
    setBookingSuccess(false);
    setAvailableSlots([]); // Clear available slots when resetting
  }, []);

  // Load services and business hours on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load services
        const servicesData = await apiClient.getServices();
        setServices(servicesData);
        
        // Load business hours
        const businessHoursData = await apiClient.getBusinessHours();
        setBusinessHours(businessHoursData);

        // Load closure dates
        const closureDatesData = await apiClient.getClosureDates();
        const closureDatesStrings = closureDatesData.map(closure => closure.date);
        setClosureDates(closureDatesStrings);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };

    void loadData();
  }, []);

  // Reset booking flow when navigating to homepage (ensures fresh start when clicking "Book Appointment")
  useEffect(() => {
    setCurrentStep('service');
    setSelectedServices([]);
    setSelectedDate(null);
    setSelectedTime(null);
    setBookingSuccess(false);
  }, [location.pathname]); // Reset whenever the path changes to homepage

  // Generate available dates (next 30 days, excluding closed days and closure dates)
  useEffect(() => {
    if (businessHours.length === 0) return;
    
    const dates: Date[] = [];
    const today = startOfDay(new Date());
    let openDaysCount = 0;
    
    for (let i = 0; i <= 30; i++) { // Include today (i=0) and next 30 days
      const date = addDays(today, i);
      const dayOfWeek = format(date, 'EEEE'); // Monday, Tuesday, etc.
      const dateString = format(date, 'yyyy-MM-dd');
      
      // Check if date is a closure date
      if (closureDates.includes(dateString)) {
        continue; // Skip closure dates
      }
      
      const daySchedule = businessHours.find(schedule => schedule.day === dayOfWeek);
      
      // Only include dates where the business is open
      if (daySchedule && daySchedule.isOpen) {
        dates.push(date);
        openDaysCount++;
      }
    }
    
    setAvailableDates(dates);
  }, [businessHours, closureDates]);

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Your Appointment</h1>
          <p className="text-gray-600">Choose your service and preferred time</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {['service', 'datetime', 'details', 'confirmation'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep === step 
                    ? 'bg-blue-600 text-white' 
                    : index < ['service', 'datetime', 'details', 'confirmation'].indexOf(currentStep)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {index + 1}
                </div>
                {index < 3 && (
                  <div className={`
                    w-12 h-0.5 mx-2
                    ${index < ['service', 'datetime', 'details', 'confirmation'].indexOf(currentStep)
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                    }
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {currentStep === 'service' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Main Service</h2>
              
              {/* Main Services (duration > 0) */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {services
                  .filter(service => service.duration > 0)
                  .map((service) => {
                    const serviceId = service._id || service.id || '';
                    const isSelected = selectedServices.some(s => {
                      const selectedId = s._id || s.id;
                      return selectedId === serviceId;
                    });
                    const quantity = serviceQuantities.get(serviceId) || 0;
                    
                    return (
                      <ServiceCard
                        key={service._id || service.id}
                        service={service}
                        onSelect={handleServiceSelect}
                        isSelected={isSelected}
                        quantity={quantity}
                        onQuantityChange={handleQuantityChange}
                      />
                    );
                  })}
              </div>

              {/* Extras Section (duration === 0) - Only show if a main service is selected */}
              {selectedServices.some(service => service.duration > 0) && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">SELECT EXTRAS</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {services
                      .filter(service => service.duration === 0)
                      .map((service) => {
                        const serviceId = service._id || service.id || '';
                        const isSelected = selectedServices.some(s => {
                          const selectedId = s._id || s.id;
                          return selectedId === serviceId;
                        });
                        const quantity = serviceQuantities.get(serviceId) || 0;
                        
                        return (
                          <ServiceCard
                            key={service._id || service.id}
                            service={service}
                            onSelect={handleServiceSelect}
                            isSelected={isSelected}
                            quantity={quantity}
                            onQuantityChange={handleQuantityChange}
                          />
                        );
                      })}
                  </div>
                </div>
              )}
              
              {selectedServices.length > 0 && (
                <div className="mt-6">
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h3 className="font-medium text-gray-900 mb-2">Selected Services:</h3>
                    <div className="space-y-2">
                      {selectedServices.map((service) => {
                        const serviceId = service._id || service.id || '';
                        const quantity = serviceQuantities.get(serviceId) || 1;
                        const isQuantityService = (service.duration === 0 || 
                          service.category?.toLowerCase() === 'nail art' || 
                          service.category?.toLowerCase() === 'nail repair') &&
                          service.category?.toLowerCase() !== 'block colour';
                        const totalPrice = service.price * (isQuantityService ? quantity : 1);
                        
                        return (
                          <div key={service._id || service.id} className="flex justify-between items-center text-sm">
                            <span>
                              {service.name}
                              {isQuantityService && quantity > 1 && (
                                <span className="text-gray-600 ml-1">× {quantity}</span>
                              )}
                            </span>
                            <div className="flex items-center space-x-2">
                              {isQuantityService && (
                                <span className="text-gray-600">Per item</span>
                              )}
                              <span className="font-medium">£{totalPrice.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-medium">
                          <span>Total Price:</span>
                          <span>
                            £{selectedServices.reduce((sum, s) => {
                              const serviceId = s._id || s.id || '';
                              const quantity = serviceQuantities.get(serviceId) || 1;
                              const isQuantityService = (s.duration === 0 || 
                                s.category?.toLowerCase() === 'nail art' || 
                                s.category?.toLowerCase() === 'nail repair') &&
                                s.category?.toLowerCase() !== 'block colour';
                              return sum + (s.price * (isQuantityService ? quantity : 1));
                            }, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={() => setCurrentStep('datetime')}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Continue to Date & Time
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 'datetime' && selectedServices.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => {
                    setCurrentStep('service');
                    // Clear selected date and time when going back
                    setSelectedDate(null);
                    setSelectedTime(null);
                    setAvailableSlots([]);
                  }}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span>Back to Services</span>
                </button>
                <h2 className="text-xl font-semibold text-gray-900">
                  Select Date & Time for Your Services
                </h2>
                <div></div> {/* Spacer for centering */}
              </div>
              
              <div>
                <Calendar
                  selectedDate={selectedDate}
                  availableDates={availableDates}
                  onDateSelect={handleDateSelect}
                />
              </div>

              {selectedDate && availableSlots.length > 0 && (
                <TimeSlotPicker
                  selectedDate={selectedDate}
                  availableSlots={availableSlots}
                  selectedTime={selectedTime}
                  onTimeSelect={setSelectedTime}
                />
              )}

              {selectedTime && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setCurrentStep('details')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 'details' && selectedServices.length > 0 && selectedDate && selectedTime && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Information</h2>
              <BookingForm
                selectedServices={selectedServices}
                serviceQuantities={serviceQuantities}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onComplete={handleBookingComplete}
                onBack={() => {
                  setCurrentStep('service');
                  // Clear date and time when going back to services
                  setSelectedDate(null);
                  setSelectedTime(null);
                  setAvailableSlots([]);
                }}
                isLoading={isLoading}
              />
            </div>
          )}

          {currentStep === 'confirmation' && bookingSuccess && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
              <p className="text-gray-600 mb-6">
                Your appointment has been successfully booked. You will receive a confirmation email shortly.
              </p>
              <div className="flex justify-center">
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