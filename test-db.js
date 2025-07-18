import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config();

async function testConnection() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found in environment variables');
        return;
    }

    const client = new MongoClient(uri);

    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        console.log('Successfully connected to MongoDB!');

        const db = client.db('csx');
        const servicesCollection = db.collection('services');

        // Test inserting a service
        console.log('\nTesting service insertion...');
        const testService = {
            name: 'Test Service',
            description: 'Test Description',
            price: 50.00,
            duration: 60,
            category: 'Test',
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const insertResult = await servicesCollection.insertOne(testService);
        console.log('Insert result:', insertResult);

        // Test reading services
        console.log('\nReading all services...');
        const services = await servicesCollection.find({}).toArray();
        console.log('Found services:', services);

        // Clean up test data
        if (insertResult.insertedId) {
            console.log('\nCleaning up test data...');
            await servicesCollection.deleteOne({ _id: insertResult.insertedId });
            console.log('Test service deleted');
        }

    } catch (error) {
        console.error('Database test failed:', error);
    } finally {
        await client.close();
        console.log('\nDatabase connection closed');
    }
}

testConnection();
