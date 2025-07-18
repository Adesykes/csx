import { loadStripe } from '@stripe/stripe-js';
import { apiClient } from './api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default stripePromise;

export const createPaymentIntent = async (amount: number, appointmentId: string) => {
  return await apiClient.createPaymentIntent(amount, appointmentId);
};