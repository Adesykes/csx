import { MongoClient, Db } from 'mongodb';

// Global is used here to maintain a cached connection across hot reloads
// in development. This prevents connections growing exponentially during API Route usage.
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDatabase(): Promise<Db> {
  // Check if we have cached connections
  if (cachedClient && cachedDb) {
    return cachedDb;
  }

  // Get MongoDB URI from environment variables
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable'
    );
  }

  // Validate MongoDB URI format
  if (!MONGODB_URI.startsWith('mongodb')) {
    throw new Error('Invalid MongoDB URI format');
  }

  // MongoDB connection options
  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxIdleTimeMS: 30000,
    minPoolSize: 0,
  };

  // Create new MongoDB client
  try {
    cachedClient = new MongoClient(MONGODB_URI, options);
    await cachedClient.connect();
    cachedDb = cachedClient.db('csx-nail-lounge'); // Explicit database name
    
    console.log('Connected to MongoDB successfully');
    return cachedDb;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    cachedClient = null;
    cachedDb = null;
    throw error;
  }
}

// Export default for backwards compatibility
export default getDatabase;
