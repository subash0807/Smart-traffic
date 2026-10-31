const mongoose = require('mongoose');
const logger = require('../utils/logger');

let memoryServerInstance = null;
let dbConnectionType = 'DISCONNECTED';

// Global connection cache for serverless environments (e.g. Vercel)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB with automatic failover to in-memory / mock store
 */
async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  const isServerless = !!process.env.VERCEL;
  const isCloudProduction = isServerless || process.env.NODE_ENV === 'production';
  const uri = process.env.MONGODB_URI;

  // If no URI is provided in cloud/serverless, do not crash on localhost or MongoMemoryServer
  if (!uri && isCloudProduction) {
    logger.warn('No MONGODB_URI configured for cloud deployment. Running in Standalone In-Memory Demo Mode.');
    dbConnectionType = 'STANDALONE_DEMO';
    return null;
  }

  const targetUri = uri || 'mongodb://localhost:27017/smart_traffic';

  // If forced in-memory
  if (process.env.USE_IN_MEMORY_DB === 'true') {
    return await connectInMemory();
  }

  try {
    const maskedUri = targetUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    logger.info(`Attempting to connect to MongoDB at: ${maskedUri}`);

    if (!cached.promise) {
      cached.promise = mongoose.connect(targetUri, {
        serverSelectionTimeoutMS: 3000,
        bufferCommands: false // Disable buffering so failed queries don't hang serverless lambdas
      }).then((m) => m);
    }

    cached.conn = await cached.promise;
    dbConnectionType = targetUri.includes('mongodb+srv') ? 'MONGODB_ATLAS' : 'MONGODB_LOCAL';
    logger.success(`MongoDB Connected Successfully [${dbConnectionType}]`);
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    logger.warn(`Primary MongoDB connection unavailable (${err.message}).`);

    // In serverless (Vercel), MongoMemoryServer cannot download binaries; fallback to Standalone Demo
    if (isServerless) {
      logger.info('Vercel serverless environment detected. Activating Standalone Demo Mode with pre-seeded data.');
      dbConnectionType = 'STANDALONE_DEMO';
      return null;
    }

    // On local machine or traditional server, attempt MongoMemoryServer
    if (process.env.USE_IN_MEMORY_DB === 'auto' || !process.env.USE_IN_MEMORY_DB) {
      logger.info('Attempting embedded In-Memory MongoDB...');
      return await connectInMemory();
    } else {
      logger.error(`MongoDB Connection Failed: ${err.message}`);
      dbConnectionType = 'STANDALONE_DEMO';
      return null;
    }
  }
}

async function connectInMemory() {
  // Guard against serverless binary download failure
  if (process.env.VERCEL) {
    dbConnectionType = 'STANDALONE_DEMO';
    return null;
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServerInstance = await MongoMemoryServer.create({
      instance: {
        launchTimeout: 30000
      }
    });
    const memoryUri = memoryServerInstance.getUri();
    await mongoose.connect(memoryUri, { bufferCommands: false });
    dbConnectionType = 'MONGODB_IN_MEMORY';
    logger.success(`Embedded In-Memory MongoDB started at: ${memoryUri}`);
    return mongoose.connection;
  } catch (memErr) {
    logger.warn(`MongoMemoryServer binary launch failed (${memErr.message}). Switching to Standalone Demo Mode.`);
    dbConnectionType = 'STANDALONE_DEMO';
    return null;
  }
}

async function disconnectDB() {
  try {
    if (cached.conn) {
      await mongoose.disconnect();
      cached.conn = null;
      cached.promise = null;
    }
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
      memoryServerInstance = null;
    }
    dbConnectionType = 'DISCONNECTED';
    logger.info('MongoDB disconnected.');
  } catch (err) {
    logger.error(`Error disconnecting MongoDB: ${err.message}`);
  }
}

function getDbStatus() {
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  const readyState = mongoose.connection ? mongoose.connection.readyState : 0;
  return {
    state: states[readyState] || 'Unknown',
    readyState,
    isConnected: readyState === 1,
    connectionType: dbConnectionType,
    host: mongoose.connection && mongoose.connection.host ? mongoose.connection.host : 'standalone',
    name: mongoose.connection && mongoose.connection.name ? mongoose.connection.name : 'smart_traffic'
  };
}

module.exports = {
  connectDB,
  disconnectDB,
  getDbStatus
};
