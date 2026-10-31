const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const db = require('./config/db');
const logger = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');
const simulationService = require('./services/simulationService');
const seedModule = require('./scripts/seed');
const User = require('./models/User');

// Route imports
const authRoutes = require('./routes/authRoutes');
const trafficRoutes = require('./routes/trafficRoutes');
const signalRoutes = require('./routes/signalRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const congestionRoutes = require('./routes/congestionRoutes');
const alertRoutes = require('./routes/alertRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers (Permit OpenStreetMap tiles, Chart.js CDN, Google Fonts, and Cloud APIs)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.jsdelivr.net',
          'https://unpkg.com'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://unpkg.com',
          'https://cdnjs.cloudflare.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org', 'https://unpkg.com'],
        connectSrc: ["'self'", 'https://*.tile.openstreetmap.org', 'http://localhost:*', 'https://*']
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Cross-Origin Resource Sharing
app.use(cors());

// Request Body Parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Serve Frontend Static Files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/emergency-requests', emergencyRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/congestion', congestionRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/system', systemRoutes);
app.use('/api', systemRoutes); // Mounts /api/health, /api/seed directly under /api

// Fallback for SPA routing to frontend
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

let serverInstance = null;
let isInitialized = false;

async function startServer() {
  if (isInitialized && process.env.VERCEL) {
    return app;
  }

  try {
    await db.connectDB();

    // Auto-seed if real database is connected and uninitialized
    if (db.getDbStatus().isConnected) {
      try {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
          logger.info('Connected database has 0 users. Performing initial auto-seed...');
          await seedModule.seedAllData();
        }
      } catch (seedErr) {
        logger.warn(`Auto-seed check deferred: ${seedErr.message}`);
      }
    }

    isInitialized = true;

    // In Vercel serverless environment, do not start background intervals or listen
    if (process.env.VERCEL) {
      return app;
    }

    // Start background simulation ticker if enabled
    if (process.env.AUTO_SIMULATION_ENABLED !== 'false') {
      const interval = parseInt(process.env.SIMULATION_INTERVAL_MS, 10) || 12000;
      simulationService.startSimulation(interval);
    }

    if (!serverInstance) {
      serverInstance = app.listen(PORT, () => {
        logger.success(`========================================================`);
        logger.success(`  Smart Traffic Management System (STMS) Server Running `);
        logger.success(`  Access Website: http://localhost:${PORT}             `);
        logger.success(`  API Base:       http://localhost:${PORT}/api         `);
        logger.success(`  API Health:     http://localhost:${PORT}/api/health  `);
        logger.success(`========================================================`);
      });
    }

    return serverInstance;
  } catch (err) {
    logger.error(`Server Startup: ${err.message}`);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    return app;
  }
}

// Start server if executed directly
if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer
};
