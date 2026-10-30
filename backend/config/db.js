const mongoose = require('mongoose');
const logger = require('../utils/logger');

let memoryServerInstance = null;
let dbConnectionType = 'DISCONNECTED';

/**
 * Connect to MongoDB with automatic fallback to in-memory server if local instance is offline.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_traffic';
  const forceInMemory = process.env.USE_IN_MEMORY_DB === 'true';

  if (forceInMemory) {
    return await connectInMemory();
  }

  try {
    logger.info(`Attempting to connect to MongoDB at: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500 // Fast failover to in-memory for demo reliability
    });
    dbConnectionType = uri.includes('mongodb+srv') ? 'MONGODB_ATLAS' : 'MONGODB_LOCAL';
    logger.success(`MongoDB Connected Successfully [${dbConnectionType}]`);
    return mongoose.connection;
  } catch (err) {
    if (process.env.USE_IN_MEMORY_DB === 'auto' || !process.env.USE_IN_MEMORY_DB) {
      logger.warn(`Local MongoDB not reachable (${err.message}). Launching embedded In-Memory MongoDB for seamless demonstration...`);
      return await connectInMemory();
    } else {
      logger.error(`MongoDB Connection Failed: ${err.message}`);
      dbConnectionType = 'ERROR';
      throw err;
    }
  }
}

async function connectInMemory() {
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServerInstance = await MongoMemoryServer.create({
      instance: {
        launchTimeout: 60000 // Allow ample time for binary extraction
      }
    });
    const memoryUri = memoryServerInstance.getUri();
    await mongoose.connect(memoryUri);
    dbConnectionType = 'MONGODB_IN_MEMORY';
    logger.success(`Embedded In-Memory MongoDB started at: ${memoryUri}`);
    return mongoose.connection;
  } catch (memErr) {
    logger.error(`Failed to launch MongoMemoryServer: ${memErr.message}`);
    dbConnectionType = 'ERROR';
    throw memErr;
  }
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
    }
    dbConnectionType = 'DISCONNECTED';
    logger.info('MongoDB disconnected.');
  } catch (err) {
    logger.error(`Error disconnecting MongoDB: ${err.message}`);
  }
}

function getDbStatus() {
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  const readyState = mongoose.connection.readyState;
  return {
    state: states[readyState] || 'Unknown',
    readyState,
    isConnected: readyState === 1,
    connectionType: dbConnectionType,
    host: mongoose.connection.host || 'localhost',
    name: mongoose.connection.name || 'smart_traffic'
  };
}

module.exports = {
  connectDB,
  disconnectDB,
  getDbStatus
};
