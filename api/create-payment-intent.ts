import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { getDatabase } from '../lib/mongodb-simple';
import { ObjectId } from 'mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, appointmentId } = req.body;

    if (!amount || !appointmentId) {
      return res.status(400).json({ error: 'Amount and appointment ID are required' });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        appointmentId: appointmentId
      }
    });

    // Update appointment with payment intent ID
    const db = await getDatabase();
    const appointmentsCollection = db.collection('appointments');
    
    await appointmentsCollection.updateOne(
      { _id: new ObjectId(appointmentId) },
      { 
        $set: { 
          paymentIntentId: paymentIntent.id,
          updatedAt: new Date()
        }
      }
    );

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return res.status(500).json({ error: 'Failed to create payment intent' });
  }
}