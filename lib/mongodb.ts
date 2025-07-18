import { MongoClient, Db } from 'mongodb';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnvVariables() {
  try {
    // Try to load from project root
    const envPath = resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envConfig = config({ path: envPath });
      console.log('Loaded .env from:', envPath);
      console.log('Environment loaded:', envConfig.parsed ? 'success' : 'failed');
    } else {
      console.error('.env file not found at:', envPath);
    }
  } catch (error) {
    console.error('Error loading .env:', error);
  }
}

// Load environment variables
loadEnvVariables();

// Debug logging
console.log('Environment check:', {
  mongoDB: process.env.MONGODB_URI ? 'present' : 'missing',
  currentDir: process.cwd(),
});

const uri = process.env.MONGODB_URI as string;
if (!uri) {
  throw new Error('MongoDB URI is missing. Check .env file and server logs.');
}

// Validate MongoDB URI
if (!uri.startsWith('mongodb')) {
  console.error('Invalid MongoDB URI format');
  throw new Error('Invalid MongoDB URI format');
}

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db('csx-nail-lounge');
}