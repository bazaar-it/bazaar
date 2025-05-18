import winston from 'winston';
import axios from 'axios';
import { createLogAgentTransport } from './logger-transport.js';
import { config, generateRunId } from './config.js';
/**
 * Integration with existing Winston logger
 * Adds the Log Agent transport to the logger
 */
/**
 * Add Log Agent transport to an existing Winston logger
 * @param logger The Winston logger instance
 * @param options Configuration options
 * @returns The updated logger instance
 */
export function addLogAgentTransport(logger, options = {}) {
    const agentUrl = options.agentUrl || `http://localhost:${config.port}`;
    const source = options.source || 'bazaar-app';
    const runId = options.runId || 'latest';
    // Create the transport
    const transport = createLogAgentTransport({
        agentUrl,
        source,
        runId,
        batchSize: options.batchSize,
        batchInterval: options.batchInterval,
        onError: (error) => {
            // Log error to console but don't break the app
            console.error('Log Agent Transport Error:', error.message);
        },
    });
    // Add transport to logger
    logger.add(transport);
    // Enhanced logger with Log Agent methods
    const enhancedLogger = logger;
    // Add special methods for Log Agent integration
    enhancedLogger.logAgent = {
        // Start a new run and update transport
        startNewRun: async (customRunId) => {
            try {
                const response = await axios.post(`${agentUrl}/control/clear`, {
                    newRunId: customRunId || generateRunId(),
                });
                const newRunId = response.data.newRunId;
                transport.setRunId(newRunId);
                return newRunId;
            }
            catch (error) {
                console.error('Failed to start new Log Agent run:', error.message);
                throw error;
            }
        },
        // Update the run ID
        setRunId: (runId) => {
            transport.setRunId(runId);
        },
        // Ask a question about logs
        askQuestion: async (query) => {
            try {
                const response = await axios.post(`${agentUrl}/qna`, {
                    query,
                    runId: 'latest',
                });
                return response.data;
            }
            catch (error) {
                console.error('Failed to ask Log Agent question:', error.message);
                throw error;
            }
        },
        // Get detected issues
        getIssues: async () => {
            try {
                const response = await axios.get(`${agentUrl}/issues`, {
                    params: { runId: 'latest' },
                });
                return response.data;
            }
            catch (error) {
                console.error('Failed to get Log Agent issues:', error.message);
                throw error;
            }
        },
    };
    return enhancedLogger;
}
/**
 * Create a standalone Log Agent logger
 * @param options Configuration options
 * @returns A Winston logger with Log Agent transport
 */
export function createLogAgentLogger(options = {}) {
    // Create base logger
    const logger = winston.createLogger({
        level: options.level || 'info',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        defaultMeta: {
            service: options.serviceName || 'bazaar-vid',
        },
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
            }),
        ],
    });
    // Add Log Agent transport
    return addLogAgentTransport(logger, options);
}
/**
 * Example usage:
 *
 * Import and use in your application:
 *
 * ```typescript
 * // Add to existing logger:
 * import { logger } from '../lib/logger';
 * import { addLogAgentTransport } from '../scripts/log-agent/integration';
 *
 * const enhancedLogger = addLogAgentTransport(logger, {
 *   source: 'main-app',
 * });
 *
 * // Or create a new logger:
 * import { createLogAgentLogger } from '../scripts/log-agent/integration';
 *
 * const logger = createLogAgentLogger({
 *   source: 'component-generator',
 * });
 *
 * // Use enhanced methods:
 * await logger.logAgent.startNewRun();
 * logger.info('Application started');
 * const analysis = await logger.logAgent.askQuestion('What errors occurred?');
 * ```
 */ 
