// src/scripts/log-agent/integration.ts
import winston from 'winston';
import axios from 'axios';
import { createLogAgentTransport } from './logger-transport';
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
export function addLogAgentTransport(
  logger: winston.Logger,
  options: {
    agentUrl?: string;
    source?: string;
    runId?: string;
    batchSize?: number;
    batchInterval?: number;
  } = {}
): winston.Logger {
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
  const enhancedLogger = logger as winston.Logger & {
    logAgent: {
      startNewRun: (customRunId?: string) => Promise<string>;
      setRunId: (runId: string) => void;
      askQuestion: (query: string) => Promise<any>;
      getIssues: () => Promise<any>;
    };
  };
  
  // Add special methods for Log Agent integration
  enhancedLogger.logAgent = {
    // Start a new run and update transport
    startNewRun: async (customRunId?: string): Promise<string> => {
      try {
        const response = await axios.post(`${agentUrl}/control/clear`, {
          newRunId: customRunId || generateRunId(),
        });
        
        const newRunId = response.data.newRunId;
        (transport as any).setRunId(newRunId);
        
        return newRunId;
      } catch (error: any) {
        console.error('Failed to start new Log Agent run:', error.message);
        throw error;
      }
    },
    
    // Update the run ID
    setRunId: (runId: string): void => {
      (transport as any).setRunId(runId);
    },
    
    // Ask a question about logs
    askQuestion: async (query: string): Promise<any> => {
      try {
        const response = await axios.post(`${agentUrl}/qna`, {
          query,
          runId: 'latest',
        });
        
        return response.data;
      } catch (error: any) {
        console.error('Failed to ask Log Agent question:', error.message);
        throw error;
      }
    },
    
    // Get detected issues
    getIssues: async (): Promise<any> => {
      try {
        const response = await axios.get(`${agentUrl}/issues`, {
          params: { runId: 'latest' },
        });
        
        return response.data;
      } catch (error: any) {
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
export function createLogAgentLogger(
  options: {
    agentUrl?: string;
    source?: string;
    runId?: string;
    batchSize?: number;
    batchInterval?: number;
    level?: string;
    serviceName?: string;
  } = {}
): winston.Logger & {
  logAgent: {
    startNewRun: (customRunId?: string) => Promise<string>;
    setRunId: (runId: string) => void;
    askQuestion: (query: string) => Promise<any>;
    getIssues: () => Promise<any>;
  };
} {
  // Create base logger
  const logger = winston.createLogger({
    level: options.level || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: {
      service: options.serviceName || 'bazaar-vid',
    },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
  });
  
  // Add Log Agent transport
  return addLogAgentTransport(logger, options) as any;
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