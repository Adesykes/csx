import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { User, Mail, Phone, MessageCircle, Banknote, Building2, ChevronLeft } from 'lucide-react';
import type { Service } from '../types';

interface BookingFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

type PaymentMethod = 'cash' | 'bank_transfer';

interface BookingFormProps {
  selectedServices: Service[];
  serviceQuantities: Map<string, number>;
  selectedDate: Date;
  selectedTime: string;
  onComplete: () => void;
  onBack?: () => void;
  isLoading?: boolean;
  appointmentToChange?: any;
  isChangingAppointment?: boolean;
}

const BookingForm: React.FC<BookingFormProps> = ({ 
  selectedServices,
  serviceQuantities,
  selectedDate,
  selectedTime,
  onComplete,
  onBack,
  isLoading = false,
  appointmentToChange,
  isChangingAppointment = false
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<BookingFormData>({
    defaultValues: isChangingAppointment && appointmentToChange ? {
      customerName: appointmentToChange.customerName,
      customerEmail: appointmentToChange.customerEmail,
      customerPhone: appointmentToChange.customerPhone,
      notes: ''
    } : {}
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Helper function to calculate end time
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes);
    startDate.setMinutes(startDate.getMinutes() + durationMinutes);
    return startDate.toTimeString().slice(0, 5);
  };
  
  const handleFormSubmit = async (data: BookingFormData) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const totalPrice = selectedServices.reduce((sum, service) => {
        const serviceId = service._id || service.id || '';
        const quantity = serviceQuantities.get(serviceId) || 1;
        const isQuantityService = (service.duration === 0 || 
          service.category?.toLowerCase() === 'nail art' || 
          service.category?.toLowerCase() === 'nail repair') &&
          service.category?.toLowerCase() !== 'block colour';
        return sum + (service.price * (isQuantityService ? quantity : 1));
      }, 0);
      
      const totalDuration = selectedServices.reduce((sum, service) => {
        const isQuantityService = (service.duration === 0 || 
          service.category?.toLowerCase() === 'nail art' || 
          service.category?.toLowerCase() === 'nail repair') &&
          service.category?.toLowerCase() !== 'block colour';
        return sum + (isQuantityService ? 0 : service.duration);
      }, 0);
      
      const serviceNames = selectedServices.map(service => {
        const serviceId = service._id || service.id || '';
        const quantity = serviceQuantities.get(serviceId) || 1;
        const isQuantityService = (service.duration === 0 || 
          service.category?.toLowerCase() === 'nail art' || 
          service.category?.toLowerCase() === 'nail repair') &&
          service.category?.toLowerCase() !== 'block colour';
        return isQuantityService && quantity > 1 ? `${service.name} (×${quantity})` : service.name;
      }).join(', ');
      
      const appointmentData = {
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        service: serviceNames,
        services: selectedServices.map(service => ({
          name: service.name,
          price: service.price,
          duration: service.duration
        })),
        serviceDuration: totalDuration, // Include total duration for conflict checking
        servicePrice: totalPrice,
        date: format(selectedDate, 'yyyy-MM-dd'), // Local date format YYYY-MM-DD
        time: selectedTime,
        status: 'pending' as const,
        paymentMethod,
        paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending',
        notes: data.notes || ''
      };

      console.log('Creating appointment:', appointmentData);
      
      // Import the apiClient
      const { apiClient } = await import('../lib/api');
      
      if (isChangingAppointment && appointmentToChange) {
        // Handle appointment change - call the change API instead of create
        // Use original service info if no new services selected
        const useOriginalService = selectedServices.length === 0;
        
        console.log('🔄 Change appointment debug:', {
          appointmentToChange,
          selectedServices,
          useOriginalService,
          currentService: appointmentToChange.currentService,
          serviceNames,
          totalPrice
        });
        
        const changeData = {
          appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
          startTime: selectedTime,
          endTime: calculateEndTime(selectedTime, totalDuration),
          serviceId: useOriginalService ? undefined : (selectedServices[0]._id || selectedServices[0].id),
          serviceName: useOriginalService ? appointmentToChange.currentService : serviceNames,
          servicePrice: useOriginalService ? undefined : totalPrice
        };
        
        console.log('📤 Sending change request:', changeData);
        
        await apiClient.changeAppointment(appointmentToChange.oldAppointmentId, changeData);
        
        // Clear the appointment change data from sessionStorage
        sessionStorage.removeItem('appointmentToChange');
        
        console.log('Appointment changed successfully');
      } else {
        // Normal appointment creation
        await apiClient.createAppointment(appointmentData);
        console.log('New appointment created');
      }
      
      // Send confirmation email
      try {
        // Convert serviceQuantities Map to plain object for API
        const serviceQuantitiesObj: { [key: string]: number } = {};
        serviceQuantities.forEach((quantity, serviceId) => {
          serviceQuantitiesObj[serviceId] = quantity;
        });

        const emailData = {
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          services: selectedServices,
          serviceQuantities: serviceQuantitiesObj,
          date: format(selectedDate, 'EEEE, MMMM d, yyyy'),
          time: selectedTime,
          totalPrice: totalPrice,
          paymentMethod: paymentMethod
        };

        console.log('Sending confirmation email...');
        await apiClient.sendConfirmationEmail(emailData);
        console.log('Confirmation email sent successfully');
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the booking if email fails
      }
      
      onComplete();
    } catch (error) {
      console.error('Error creating appointment:', error);
      
      // Check for specific error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('48 hours before the scheduled time')) {
        setSubmitError('Sorry, appointments can only be changed up to 48 hours before the scheduled time. Please contact us directly for last-minute changes.');
      } else if (errorMessage.includes('time slot is already booked')) {
        setSubmitError('This time slot is no longer available. Please select a different time.');
      } else {
        setSubmitError('Failed to create appointment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center sm:justify-start space-x-2 text-gray-600 hover:text-gray-900 transition-colors p-2 sm:p-0 touch-manipulation"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>Back to Services</span>
          </button>
        )}
        <h3 className="text-lg font-semibold text-gray-900 text-center">Your Information</h3>
        <div className="hidden sm:block"></div> {/* Spacer for centering */}
      </div>
      
      {/* Booking Summary */}
      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
        <h4 className="font-medium text-gray-900 mb-2">Booking Summary</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>
            <strong>Services:</strong>
            {selectedServices.map((service, index) => {
              const serviceId = service._id || service.id || '';
              const quantity = serviceQuantities.get(serviceId) || 1;
              const isQuantityService = (service.duration === 0 || 
                service.category?.toLowerCase() === 'nail art' || 
                service.category?.toLowerCase() === 'nail repair') &&
                service.category?.toLowerCase() !== 'block colour';
              const totalPrice = service.price * (isQuantityService ? quantity : 1);
              
              return (
                <div key={index} className="ml-2 sm:ml-4 flex justify-between items-start py-1">
                  <span className="flex-1 mr-2">
                    {service.name}
                    {isQuantityService && quantity > 1 && (
                      <span className="text-gray-500 ml-1">× {quantity}</span>
                    )}
                  </span>
                  <span>
                    £{totalPrice.toFixed(2)} 
                    {isQuantityService && ' (per item)'}
                  </span>
                </div>
              );
            })}
          </div>
          <p><strong>Date:</strong> {selectedDate.toLocaleDateString()}</p>
          <p><strong>Time:</strong> {selectedTime}</p>
          <p>
            <strong>Total Price:</strong> £{selectedServices.reduce((sum, s) => {
              const serviceId = s._id || s.id || '';
              const quantity = serviceQuantities.get(serviceId) || 1;
              const isQuantityService = (s.duration === 0 || 
                s.category?.toLowerCase() === 'nail art' || 
                s.category?.toLowerCase() === 'nail repair') &&
                s.category?.toLowerCase() !== 'block colour';
              return sum + (s.price * (isQuantityService ? quantity : 1));
            }, 0).toFixed(2)}
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="h-4 w-4 inline mr-2" />
            Full Name
          </label>
          <input
            {...register('customerName', { required: 'Full name is required' })}
            type="text"
            autoComplete="name"
            className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
            placeholder="Enter your full name"
          />
          {errors.customerName && (
            <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="h-4 w-4 inline mr-2" />
            Email Address
          </label>
          <input
            {...register('customerEmail', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
            type="email"
            autoComplete="email"
            className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
            placeholder="Enter your email address"
          />
          {errors.customerEmail && (
            <p className="mt-1 text-sm text-red-600">{errors.customerEmail.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="h-4 w-4 inline mr-2" />
            Phone Number
          </label>
          <input
            {...register('customerPhone', { required: 'Phone number is required' })}
            type="tel"
            autoComplete="tel"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your phone number"
          />
          {errors.customerPhone && (
            <p className="mt-1 text-sm text-red-600">{errors.customerPhone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MessageCircle className="h-4 w-4 inline mr-2" />
            Additional Notes (Optional)
          </label>
          <textarea
            {...register('notes')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Any special requests or notes for your appointment"
          />
        </div>

        {/* Payment Method Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Payment Method
          </label>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="payment-cash"
                name="paymentMethod"
                type="radio"
                checked={paymentMethod === 'cash'}
                onChange={() => setPaymentMethod('cash')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="payment-cash" className="ml-3 flex items-center text-sm">
                <Banknote className="h-4 w-4 mr-2 text-green-600" />
                <div>
                  <span className="font-medium text-gray-900">Cash Payment</span>
                  <p className="text-gray-500">Pay £{selectedServices.reduce((sum, s) => {
                    const serviceId = s._id || s.id || '';
                    const quantity = serviceQuantities.get(serviceId) || 1;
                    const isQuantityService = (s.duration === 0 || 
                      s.category?.toLowerCase() === 'nail art' || 
                      s.category?.toLowerCase() === 'nail repair') &&
                      s.category?.toLowerCase() !== 'block colour';
                    return sum + (s.price * (isQuantityService ? quantity : 1));
                  }, 0).toFixed(2)} in cash on the day of your appointment</p>
                </div>
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="payment-bank-transfer"
                name="paymentMethod"
                type="radio"
                checked={paymentMethod === 'bank_transfer'}
                onChange={() => setPaymentMethod('bank_transfer')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="payment-bank-transfer" className="ml-3 flex items-center text-sm">
                <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                <div>
                  <span className="font-medium text-gray-900">Bank Transfer After Appointment</span>
                  <p className="text-gray-500">Pay £{selectedServices.reduce((sum, s) => {
                    const serviceId = s._id || s.id || '';
                    const quantity = serviceQuantities.get(serviceId) || 1;
                    const isQuantityService = (s.duration === 0 || 
                      s.category?.toLowerCase() === 'nail art' || 
                      s.category?.toLowerCase() === 'nail repair') &&
                      s.category?.toLowerCase() !== 'block colour';
                    return sum + (s.price * (isQuantityService ? quantity : 1));
                  }, 0).toFixed(2)} via bank transfer after your appointment</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || isLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {(submitting || isLoading) ? 'Processing...' : 'Confirm Appointment'}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;