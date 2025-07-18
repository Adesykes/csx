import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Mail, Phone, MessageCircle, CreditCard, Banknote } from 'lucide-react';
import type { Service } from '../types';

interface BookingFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

type PaymentMethod = 'online' | 'cash';

interface BookingFormProps {
  selectedService: Service;
  selectedDate: Date;
  selectedTime: string;
  onComplete: () => void;
  isLoading?: boolean;
}

const BookingForm: React.FC<BookingFormProps> = ({ 
  selectedService,
  selectedDate,
  selectedTime,
  onComplete,
  isLoading = false
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<BookingFormData>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const handleFormSubmit = async (data: BookingFormData) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const appointmentData = {
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        service: selectedService.name,
        servicePrice: selectedService.price,
        date: selectedDate.toISOString().split('T')[0], // YYYY-MM-DD format
        time: selectedTime,
        status: 'pending' as const,
        paymentMethod,
        paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending',
        notes: data.notes || ''
      };

      console.log('Creating appointment:', appointmentData);
      
      // Import the apiClient
      const { apiClient } = await import('../lib/api');
      await apiClient.createAppointment(appointmentData);
      
      onComplete();
    } catch (error) {
      console.error('Error creating appointment:', error);
      setSubmitError('Failed to create appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Your Information</h3>
      
      {/* Booking Summary */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h4 className="font-medium text-gray-900 mb-2">Booking Summary</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Service:</strong> {selectedService.name}</p>
          <p><strong>Date:</strong> {selectedDate.toLocaleDateString()}</p>
          <p><strong>Time:</strong> {selectedTime}</p>
          <p><strong>Duration:</strong> {selectedService.duration} minutes</p>
          <p><strong>Price:</strong> ${selectedService.price}</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="h-4 w-4 inline mr-2" />
            Full Name
          </label>
          <input
            {...register('customerName', { required: 'Full name is required' })}
            type="text"
            autoComplete="name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your email"
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
                id="payment-online"
                name="paymentMethod"
                type="radio"
                checked={paymentMethod === 'online'}
                onChange={() => setPaymentMethod('online')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="payment-online" className="ml-3 flex items-center text-sm">
                <CreditCard className="h-4 w-4 mr-2 text-blue-600" />
                <div>
                  <span className="font-medium text-gray-900">Pay Online Now</span>
                  <p className="text-gray-500">Secure payment with credit/debit card</p>
                </div>
              </label>
            </div>
            
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
                  <span className="font-medium text-gray-900">Pay Cash on Day</span>
                  <p className="text-gray-500">Pay ${selectedService.price} when you arrive for your appointment</p>
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
          {(submitting || isLoading) ? 'Processing...' : paymentMethod === 'online' ? 'Continue to Payment' : 'Confirm Appointment'}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;