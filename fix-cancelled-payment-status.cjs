require('dotenv').config();
const { MongoClient } = require('mongodb');

async function fixCancelledPaymentStatus() {
  // Use your production MongoDB connection string
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  
  console.log('Using MongoDB URI:', mongoUri.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://***:***@'));
  
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('csx-nail-lounge');
    const appointmentsCollection = db.collection('appointments');

    // Find all cancelled appointments with pending payment status
    const cancelledWithPendingPayment = await appointmentsCollection.find({
      status: 'cancelled',
      paymentStatus: { $ne: 'cancelled' }
    }).toArray();

    console.log(`Found ${cancelledWithPendingPayment.length} cancelled appointments with non-cancelled payment status`);

    if (cancelledWithPendingPayment.length > 0) {
      // Show details of what will be updated
      console.log('Appointments to be updated:');
      cancelledWithPendingPayment.forEach(apt => {
        console.log(`- ID: ${apt._id}, Customer: ${apt.customerName}, Date: ${apt.date}, Payment Status: ${apt.paymentStatus} -> cancelled`);
      });

      // Update all cancelled appointments to have cancelled payment status
      const updateResult = await appointmentsCollection.updateMany(
        {
          status: 'cancelled',
          paymentStatus: { $ne: 'cancelled' }
        },
        {
          $set: {
            paymentStatus: 'cancelled',
            updatedAt: new Date()
          }
        }
      );

      console.log(`\n✅ Successfully updated ${updateResult.modifiedCount} appointments`);
      console.log(`Payment status changed from various statuses to 'cancelled' for cancelled appointments`);
    } else {
      console.log('✅ No cancelled appointments found with non-cancelled payment status. All good!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the migration
fixCancelledPaymentStatus().catch(console.error);
