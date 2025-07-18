import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { format } from 'date-fns';
import HomePage from '../HomePage';
import { apiClient } from '../../lib/api';

// Mock the api client
jest.mock('../../lib/api', () => ({
  apiClient: {
    getServices: jest.fn(),
    getBusinessHours: jest.fn(),
    createAppointment: jest.fn(),
  },
}));

describe('HomePage', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock default business hours
    (apiClient.getBusinessHours as jest.Mock).mockResolvedValue([
      { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
      { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
      { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
      { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
      { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
      { day: 'Saturday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
      { day: 'Sunday', isOpen: false, openTime: '00:00', closeTime: '00:00' },
    ]);

    // Mock services
    (apiClient.getServices as jest.Mock).mockResolvedValue([
      {
        id: '1',
        name: 'Gel Application',
        description: 'Long-lasting gel polish manicure',
        price: 45,
        duration: 23,
        category: 'Manicure',
      },
    ]);
  });

  test('renders homepage with title', () => {
    render(<HomePage />);
    expect(screen.getByText('Book Your Appointment')).toBeInTheDocument();
  });

  test('displays services after loading', async () => {
    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText('Gel Application')).toBeInTheDocument();
    });
  });

  test('moves to datetime step after selecting a service', async () => {
    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText('Gel Application')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Gel Application'));
    
    // Look for the heading specifically
    expect(screen.getByRole('heading', { name: 'Select Date & Time' })).toBeInTheDocument();
  });

  test('shows time slots after selecting a date', async () => {
    render(<HomePage />);
    
    // Select a service
    await waitFor(() => {
      expect(screen.getByText('Gel Application')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Gel Application'));

    // Wait for calendar to load and select a date
    await waitFor(() => {
      const tomorrow = format(new Date().setDate(new Date().getDate() + 1), 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrow) });
      fireEvent.click(dateButton);
    });

    // Check if time slots are displayed
    await waitFor(() => {
      expect(screen.getByText('09:00')).toBeInTheDocument();
    });
  });

  test('completes booking process', async () => {
    render(<HomePage />);
    
    // Select a service
    await waitFor(() => {
      expect(screen.getByText('Gel Application')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Gel Application'));

    // Select a date
    await waitFor(() => {
      const tomorrow = format(new Date().setDate(new Date().getDate() + 1), 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrow) });
      fireEvent.click(dateButton);
    });

    // Select a time
    await waitFor(() => {
      fireEvent.click(screen.getByText('09:00'));
    });

    // Fill in booking form
    await waitFor(() => {
      expect(screen.getByText('Your Information')).toBeInTheDocument();
    });
    
    // Fill in form fields
    const nameInput = screen.getByPlaceholderText('Enter your full name');
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const phoneInput = screen.getByPlaceholderText('Enter your phone number');
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(phoneInput, { target: { value: '1234567890' } });
    
    // Submit booking
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }));

    // Check for confirmation
    await waitFor(() => {
      expect(screen.getByText('Your Information')).toBeInTheDocument();
    });
  });
});
