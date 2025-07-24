import { Request, Response } from 'express';
import { EmailService } from '../lib/emailService';

export async function sendBookingConfirmationEmail(req: Request, res: Response) {
  try {
    const {
      customerName,
      customerEmail,
      services,
      serviceQuantities,
      date,
      time,
      totalPrice,
      paymentMethod
    } = req.body;

    // Convert serviceQuantities array back to Map for EmailService
    const quantitiesMap = new Map();
    if (serviceQuantities) {
      Object.entries(serviceQuantities).forEach(([key, value]) => {
        quantitiesMap.set(key, value as number);
      });
    }

    const bookingDetails = {
      customerName,
      customerEmail,
      services,
      serviceQuantities: quantitiesMap,
      date,
      time,
      totalPrice,
      paymentMethod
    };

    // Send confirmation email to customer
    const customerEmailSent = await EmailService.sendBookingConfirmation(bookingDetails);
    
    // Send notification to admin
    const adminEmailSent = await EmailService.sendAdminNotification(bookingDetails);

    res.json({
      success: true,
      customerEmailSent,
      adminEmailSent,
      message: 'Booking confirmation emails processed'
    });

  } catch (error) {
    console.error('Error in sendBookingConfirmationEmail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send confirmation emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
