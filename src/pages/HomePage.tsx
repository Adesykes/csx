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
  const [isLoading, setIsLoading] = useState(true);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Generate time slots based on business hours
  const generateTimeSlots = useCallback(async (dateToUse?: Date) => {
    const targetDate = dateToUse || selectedDate;

    if (!targetDate || selectedServices.length === 0 || businessHours.length === 0) return;

    try {
      const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
      const dayOfWeek = format(targetDate, 'EEEE');
      const daySchedule = businessHours.find(schedule => schedule.day === dayOfWeek);

      if (!daySchedule || !daySchedule.isOpen) {
        setAvailableSlots([]);
        return;
      }

      let dayAppointments: any[] = [];
      try {
        const existingAppointments = await apiClient.getAppointmentAvailability();
        const targetDateString = format(targetDate, 'yyyy-MM-dd');
        dayAppointments = existingAppointments.filter(apt => apt.date === targetDateString);
      } catch (error) {
        console.error('Error fetching appointment availability:', error);
      }

      const slots: TimeSlot[] = [];
      const openTime = daySchedule.openTime;
      const closeTime = daySchedule.closeTime;
      const [openHour, openMinute] = openTime.split(':').map(Number);
      const [closeHour, closeMinute] = closeTime.split(':').map(Number);

      let currentHour = openHour;
      let currentMinute = openMinute;
      const now = new Date();
      const isToday = format(targetDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      const currentTimeMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

      while (currentHour < closeHour || (currentHour === closeHour && currentMinute <= closeMinute)) {
        const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        const slotTimeMinutes = currentHour * 60 + currentMinute;
        let isAvailable = true;

        if (isToday && slotTimeMinutes <= currentTimeMinutes) {
          isAvailable = false;
        }

        if (dayAppointments.length > 0 && isAvailable) {
          isAvailable = !dayAppointments.some(appointment => {
            const appointmentTime = appointment.time;
            const appointmentTimeMinutes = timeToMinutes(appointmentTime);
            const appointmentDuration = appointment.duration ||
              (services.find(s =>
                s.name === appointment.service ||
                s._id === appointment.service ||
                s.id === appointment.service
              )?.duration) || 60;
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

  const timeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  useEffect(() => {
    if (selectedDate && selectedServices.length > 0 && businessHours.length > 0) {
      void generateTimeSlots();
    }
  }, [selectedServices, businessHours, services, generateTimeSlots]);

  const handleServiceSelect = useCallback((service: Service) => {
    setSelectedServices(prev => {
      const serviceId = service._id || service.id;
      const isAlreadySelected = prev.some(s => {
        const existingId = s._id || s.id;
        return existingId === serviceId;
      });

      if (isAlreadySelected) {
        if (serviceId) {
          setServiceQuantities(prevQuantities => {
            const newQuantities = new Map(prevQuantities);
            newQuantities.delete(serviceId);
            return newQuantities;
          });
        }
        return prev.filter(s => {
          const existingId = s._id || s.id;
          return existingId !== serviceId;
        });
      } else {
        const isQuantityService = (service.duration === 0 ||
          service.category?.toLowerCase() === 'nail art' ||
          service.category?.toLowerCase() === 'nail repair') &&
          service.category?.toLowerCase() !== 'block colour';
        if (isQuantityService && serviceId) {
          setServiceQuantities(prevQuantities => {
            const newQuantities = new Map(prevQuantities);
            newQuantities.set(serviceId, 1);
            return newQuantities;
          });
        }
        return [...prev, service];
      }
    });
  }, []);

  const handleQuantityChange = useCallback((service: Service, quantity: number) => {
    const serviceId = service._id || service.id || '';

    if (quantity === 0) {
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
      setServiceQuantities(prevQuantities => {
        const newQuantities = new Map(prevQuantities);
        newQuantities.set(serviceId, quantity);
        return newQuantities;
      });
    }
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    void generateTimeSlots(date);
  }, [generateTimeSlots]);

  const handleBookingComplete = useCallback(() => {
    setBookingSuccess(true);
    setCurrentStep('confirmation');
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
    setAvailableSlots([]);
  }, []);

  // Optimized parallel data fetching with loading spinner
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [servicesData, businessHoursData, closureDatesData] = await Promise.all([
          apiClient.getServices(),
          apiClient.getBusinessHours(),
          apiClient.getClosureDates()
        ]);
        setServices(servicesData);
        setBusinessHours(businessHoursData);
        const closureDatesStrings = closureDatesData.map(closure => closure.date);
        setClosureDates(closureDatesStrings);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    void loadData();
  }, []);

  useEffect(() => {
    setCurrentStep('service');
    setSelectedServices([]);
    setSelectedDate(null);
    setSelectedTime(null);
    setBookingSuccess(false);
  }, [location.pathname]);

  useEffect(() => {
    if (businessHours.length === 0) return;
    const dates: Date[] = [];
    const today = startOfDay(new Date());
    let openDaysCount = 0;
    for (let i = 0; i <= 30; i++) {
      const date = addDays(today, i);
      const dayOfWeek = format(date, 'EEEE');
      const dateString = format(date, 'yyyy-MM-dd');
      if (closureDates.includes(dateString)) {
        continue;
      }
      const daySchedule = businessHours.find(schedule => schedule.day === dayOfWeek);
      if (daySchedule && daySchedule.isOpen) {
        dates.push(date);
        openDaysCount++;
      }
    }
    setAvailableDates(dates);
  }, [businessHours, closureDates]);

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Book Your Appointment</h1>
          <p className="text-gray-600 text-sm sm:text-base">Choose your service and preferred time</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-6 sm:mb-8 overflow-x-auto">
          <div className="flex items-center space-x-2 sm:space-x-4 px-4 sm:px-0">
            {['service', 'datetime', 'details', 'confirmation'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0
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
                    w-8 sm:w-12 h-0.5 mx-1 sm:mx-2
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
              <p className="text-lg text-gray-700">Loading services...</p>
            </div>
          ) : (
            <>
              {currentStep === 'service' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Main Service</h2>
                  <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  {selectedServices.some(service => service.duration > 0) && (
                    <div className="mt-6 sm:mt-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4">SELECT EXTRAS</h3>
                      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      <div className="flex justify-center sm:justify-end">
                        <button
                          onClick={() => setCurrentStep('datetime')}
                          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 sm:py-2 rounded-md hover:bg-blue-700 transition-colors font-medium touch-manipulation"
                        >
                          Continue to Date & Time
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'datetime' && selectedServices.length > 0 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
                    <button
                      onClick={() => {
                        setCurrentStep('service');
                        setSelectedDate(null);
                        setSelectedTime(null);
                        setAvailableSlots([]);
                      }}
                      className="flex items-center justify-center sm:justify-start space-x-2 text-gray-600 hover:text-gray-900 transition-colors p-2 sm:p-0 touch-manipulation"
                    >
                      <ChevronLeft className="h-5 w-5" />
                      <span>Back to Services</span>
                    </button>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 text-center">
                      Select Date & Time for Your Services
                    </h2>
                    <div className="hidden sm:block"></div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;