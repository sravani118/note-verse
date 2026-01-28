import { MongoClient, Db } from 'mongodb';
import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri: string = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _mongooseConnection: Promise<typeof mongoose> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the value across module reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, create a new client for each request
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const client = await clientPromise;
  const db = client.db('noteverse');
  return { client, db };
}

/**
 * Connect to MongoDB using Mongoose
 * Reuses connection in development to prevent multiple connections
 */
export async function connectDB(): Promise<typeof mongoose> {
  try {
    if (mongoose.connection.readyState === 1) {
      // Already connected
      return mongoose;
    }

    if (mongoose.connection.readyState === 2) {
      // Currently connecting
      if (global._mongooseConnection) {
        return await global._mongooseConnection;
      }
    }

    // Create new connection
    const connectionPromise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // Store in global for development
    if (process.env.NODE_ENV === 'development') {
      global._mongooseConnection = connectionPromise;
    }

    await connectionPromise;
    console.log('MongoDB connected successfully');
    
    return mongoose;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

