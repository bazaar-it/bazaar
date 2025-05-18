// src/scripts/log-agent/integration.js
import { createLogger, format, transports } from 'winston';
import { createLogAgentTransport } from './logger-transport.js';
import { generateRunId } from './config.js';

/**
 * Add the Log Agent transport to an existing Winston logger
 * @param {object} logger - The Winston logger instance
 * @param {object} options - Options for the transport
 * @param {string} options.source - Source identifier for the logs
 * @param {string} [options.runId] - Optional run ID, will generate one if not provided
 * @param {string} [options.agentUrl] - URL of the Log Agent server
 * @param {number} [options.batchSize] - Size of log batches (default: 50)
 * @param {number} [options.batchInterval] - Interval between batch sends in ms (default: 5000)
 * @returns {object} The logger with the transport added
 */
export function addLogAgentTransport(logger, options) {
  const runId = options.runId || generateRunId();
  const agentUrl = options.agentUrl || 'http://localhost:3002/';
  
  const logAgentTransport = createLogAgentTransport({
    level: 'debug',
    agentUrl,
    source: options.source,
    runId,
    batchSize: options.batchSize || 50,
    batchInterval: options.batchInterval || 5000,
    onError: (error) => {
      console.error('Log Agent Transport Error:', error.message);
    }
  });
  
  logger.add(logAgentTransport);
  return logger;
}

/**
 * Create a new Winston logger with Log Agent transport
 * @param {object} options - Options for the logger and transport
 * @param {string} options.source - Source identifier for the logs
 * @param {string} [options.runId] - Optional run ID, will generate one if not provided
 * @param {string} [options.agentUrl] - URL of the Log Agent server
 * @param {number} [options.batchSize] - Size of log batches (default: 50)
 * @param {number} [options.batchInterval] - Interval between batch sends in ms (default: 5000)
 * @returns {object} The created Winston logger
 */
export function createLogAgentLogger(options) {
  const runId = options.runId || generateRunId();
  const agentUrl = options.agentUrl || 'http://localhost:3002/';
  
  const logger = createLogger({
    level: 'debug',
    format: format.combine(
      format.timestamp(),
      format.json()
    ),
    defaultMeta: {
      source: options.source,
      runId
    },
    transports: [
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple()
        )
      })
    ]
  });
  
  // Add the Log Agent transport
  const logAgentTransport = createLogAgentTransport({
    level: 'debug',
    agentUrl,
    source: options.source,
    runId,
    batchSize: options.batchSize || 50,
    batchInterval: options.batchInterval || 5000,
    onError: (error) => {
      console.error('Log Agent Transport Error:', error.message);
    }
  });
  
  logger.add(logAgentTransport);
  return logger;
}
