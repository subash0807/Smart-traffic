/**
 * STMS Application Logger
 * Formats timestamps, log levels, and contextual metadata.
 */

const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS',
  SIMULATION: 'SIMULATION'
};

function formatTimestamp() {
  return new Date().toISOString();
}

const logger = {
  info: (message, meta = '') => {
    console.log(`[${formatTimestamp()}] [INFO] ${message}`, meta ? meta : '');
  },
  warn: (message, meta = '') => {
    console.warn(`[${formatTimestamp()}] [WARN] ${message}`, meta ? meta : '');
  },
  error: (message, meta = '') => {
    console.error(`[${formatTimestamp()}] [ERROR] ${message}`, meta ? meta : '');
  },
  success: (message, meta = '') => {
    console.log(`[${formatTimestamp()}] [SUCCESS] \x1b[32m${message}\x1b[0m`, meta ? meta : '');
  },
  simulation: (message, meta = '') => {
    console.log(`[${formatTimestamp()}] [SIM] \x1b[36m${message}\x1b[0m`, meta ? meta : '');
  }
};

module.exports = logger;
