import { Resend } from 'resend';
import { Service } from '../src/types';

interface BookingDetails {
  customerName: string;
  customerEmail: string;
  services: Service[];
  serviceQuantities: Map<string, number>;
  date: string;
  time: string;
  totalPrice: number;
  paymentMethod: string;
}

export class EmailService {
  private static resend = new Resend(process.env.RESEND_API_KEY);

  static async sendBookingConfirmation(booking: BookingDetails): Promise<boolean> {
    try {
      const emailHtml = this.generateBookingEmailTemplate(booking);
      const emailText = this.generateBookingEmailText(booking);

      const { data, error } = await this.resend.emails.send({
        from: 'CSX Nail Lounge <bookings@csxnaillounge.co.uk>',
        to: [booking.customerEmail],
        subject: `Booking Confirmation - ${booking.date} at ${booking.time}`,
        html: emailHtml,
        text: emailText,
      });

      if (error) {
        console.error('Error sending confirmation email:', error);
        return false;
      }

      console.log('Email sent successfully:', data?.id);
      return true;
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      return false;
    }
  }

  static async sendAdminNotification(booking: BookingDetails): Promise<boolean> {
    try {
      const emailHtml = this.generateAdminEmailTemplate(booking);

      const { data, error } = await this.resend.emails.send({
        from: 'CSX Booking System <admin@csxnaillounge.co.uk>',
        to: ['sykesade@googlemail.com'], // Changed to your verified email
        subject: `New Booking - ${booking.customerName} on ${booking.date}`,
        html: emailHtml,
      });

      if (error) {
        console.error('Error sending admin notification:', error);
        return false;
      }

      console.log('Admin notification sent:', data?.id);
      return true;
    } catch (error) {
      console.error('Error sending admin notification:', error);
      return false;
    }
  }

  private static generateBookingEmailTemplate(booking: BookingDetails): string {
    const servicesHtml = booking.services.map(service => {
      const serviceId = service._id || service.id || '';
      const quantity = booking.serviceQuantities.get(serviceId) || 1;
      const isQuantityService = (service.duration === 0 || 
        service.category?.toLowerCase() === 'nail art' || 
        service.category?.toLowerCase() === 'nail repair') &&
        service.category?.toLowerCase() !== 'block colour';
      const totalPrice = service.price * (isQuantityService ? quantity : 1);

      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            ${service.name}
            ${isQuantityService && quantity > 1 ? ` (${quantity}x)` : ''}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            £${totalPrice.toFixed(2)}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">CSX Nail Lounge</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Booking Confirmation</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px; margin-bottom: 20px;">Dear ${booking.customerName},</p>
          
          <p>Thank you for booking with CSX Nail Lounge! Your appointment has been confirmed.</p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Appointment Details</h3>
            <p><strong>Date:</strong> ${booking.date}</p>
            <p><strong>Time:</strong> ${booking.time}</p>
            <p><strong>Payment Method:</strong> ${booking.paymentMethod === 'cash' ? 'Cash Payment' : 'Bank Transfer'}</p>
          </div>
          
          <h3 style="color: #374151;">Services Booked</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Service</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${servicesHtml}
              <tr style="background: #f9fafb; font-weight: bold;">
                <td style="padding: 12px; border-top: 2px solid #e5e7eb;">Total</td>
                <td style="padding: 12px; text-align: right; border-top: 2px solid #e5e7eb;">£${booking.totalPrice.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #92400e;">Important Information</h4>
            <p style="margin-bottom: 0; color: #92400e;">
              • Please arrive 5 minutes before your appointment time<br>
              • If you need to cancel or reschedule, please give us at least 24 hours notice<br>
              • ${booking.paymentMethod === 'cash' ? 'Please bring exact cash amount' : 'Bank transfer details will be provided separately'}
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <h4>Contact Us</h4>
            <p>📍 CSX Nail Lounge</p>
            <p>📞 Contact us for inquiries</p>
            <p>✉️ cxsnaillounge@hotmail.com</p>
          </div>
          
          <p style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
            We look forward to seeing you soon!<br>
            <strong>CSX Nail Lounge Team</strong>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private static generateBookingEmailText(booking: BookingDetails): string {
    const servicesText = booking.services.map(service => {
      const serviceId = service._id || service.id || '';
      const quantity = booking.serviceQuantities.get(serviceId) || 1;
      const isQuantityService = (service.duration === 0 || 
        service.category?.toLowerCase() === 'nail art' || 
        service.category?.toLowerCase() === 'nail repair') &&
        service.category?.toLowerCase() !== 'block colour';
      const totalPrice = service.price * (isQuantityService ? quantity : 1);

      return `${service.name}${isQuantityService && quantity > 1 ? ` (${quantity}x)` : ''} - £${totalPrice.toFixed(2)}`;
    }).join('\n');

    return `
CSX NAIL LOUNGE - BOOKING CONFIRMATION

Dear ${booking.customerName},

Thank you for booking with CSX Nail Lounge! Your appointment has been confirmed.

APPOINTMENT DETAILS:
Date: ${booking.date}
Time: ${booking.time}
Payment Method: ${booking.paymentMethod === 'cash' ? 'Cash Payment' : 'Bank Transfer'}

SERVICES BOOKED:
${servicesText}

TOTAL: £${booking.totalPrice.toFixed(2)}

IMPORTANT INFORMATION:
• Please arrive 5 minutes before your appointment time
• If you need to cancel or reschedule, please give us at least 24 hours notice
• ${booking.paymentMethod === 'cash' ? 'Please bring exact cash amount' : 'Bank transfer details will be provided separately'}

CONTACT US:
Address: CSX Nail Lounge
Phone: Contact us for inquiries
Email: cxsnaillounge@hotmail.com

We look forward to seeing you soon!

CSX Nail Lounge Team
    `;
  }

  private static generateAdminEmailTemplate(booking: BookingDetails): string {
    const servicesHtml = booking.services.map(service => {
      const serviceId = service._id || service.id || '';
      const quantity = booking.serviceQuantities.get(serviceId) || 1;
      const isQuantityService = (service.duration === 0 || 
        service.category?.toLowerCase() === 'nail art' || 
        service.category?.toLowerCase() === 'nail repair') &&
        service.category?.toLowerCase() !== 'block colour';
      const totalPrice = service.price * (isQuantityService ? quantity : 1);

      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            ${service.name}
            ${isQuantityService && quantity > 1 ? ` (${quantity}x)` : ''}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            £${totalPrice.toFixed(2)}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Booking Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1f2937; padding: 20px; color: white; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">🎉 New Booking Received!</h2>
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h3>Customer Information</h3>
          <p><strong>Name:</strong> ${booking.customerName}</p>
          <p><strong>Email:</strong> ${booking.customerEmail}</p>
          
          <h3>Appointment Details</h3>
          <p><strong>Date:</strong> ${booking.date}</p>
          <p><strong>Time:</strong> ${booking.time}</p>
          <p><strong>Payment:</strong> ${booking.paymentMethod === 'cash' ? 'Cash Payment' : 'Bank Transfer'}</p>
          
          <h3>Services</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Service</th>
                <th style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${servicesHtml}
              <tr style="font-weight: bold; background: #f9fafb;">
                <td style="padding: 8px; border-top: 1px solid #e5e7eb;">Total</td>
                <td style="padding: 8px; text-align: right; border-top: 1px solid #e5e7eb;">£${booking.totalPrice.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
  }
}
