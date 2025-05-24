// @ts-nocheck
// src/scripts/log-agent/services/pattern.service.ts
import { type LogEntry, type LogPattern, type Issue } from '../types.js';

/**
 * Pattern matching service for log analysis
 * Uses regex patterns to identify common issues
 */
export class PatternService {
  private patterns: LogPattern[];

  constructor() {
    this.patterns = this.definePatterns();
  }

  /**
   * Define the regex patterns for common issues
   * @returns Array of log patterns
   */
  private definePatterns(): LogPattern[] {
    return [
      // Connection refused errors
      {
        id: 'connection-refused',
        name: 'Connection Refused',
        regex: /ECONNREFUSED|connection\s+refused|unable\s+to\s+connect|connection\s+failed/i,
        level: 'error',
        type: 'network',
        fingerprint: (match, log) => {
          // Extract the host/port if present
          const hostMatch = /(\d+\.\d+\.\d+\.\d+|localhost):?(\d+)?/.exec(log.message);
          const host = hostMatch ? hostMatch[0] : 'unknown-host';
          return `connection-refused-${host}`;
        },
        summary: (match, log) => `Connection refused to ${
          (/(\d+\.\d+\.\d+\.\d+|localhost):?(\d+)?/.exec(log.message))?.[0] || 'a service'
        }`,
      },

      // Task processor errors
      {
        id: 'task-processor-error',
        name: 'Task Processor Error',
        regex: /TaskProcessor.*?(failed|error|exception|crashed)/i,
        level: 'error',
        type: 'service',
        fingerprint: (match, log) => {
          const errorType = (/error:?\s+([^:,\n]+)/i.exec(log.message))?.[1] || 'unknown';
          return `task-processor-error-${errorType.toLowerCase().replace(/\s+/g, '-')}`;
        },
        summary: (match, log) => {
          const errorType = (/error:?\s+([^:,\n]+)/i.exec(log.message))?.[1] || 'unknown';
          return `TaskProcessor encountered an error: ${errorType}`;
        },
      },

      // Agent initialization failures
      {
        id: 'agent-init-failure',
        name: 'Agent Initialization Failure',
        regex: /(failed|error|unable)\s+to\s+(initialize|create|start)\s+agent/i,
        level: 'error',
        type: 'agent',
        fingerprint: (match, log) => {
          const agentType = log.agentId || 
            (/agent\s+['"]?([a-zA-Z0-9_-]+)['"]?/i.exec(log.message))?.[1] || 
            'unknown';
          return `agent-init-failure-${agentType}`;
        },
        summary: (match, log) => {
          const agentType = log.agentId || 
            (/agent\s+['"]?([a-zA-Z0-9_-]+)['"]?/i.exec(log.message))?.[1] || 
            'unknown';
          return `Failed to initialize agent "${agentType}"`;
        },
      },

      // Memory leaks or high memory usage
      {
        id: 'memory-issue',
        name: 'Memory Issue',
        regex: /(memory leak|high memory usage|out of memory|heap\s+(?:usage|allocation|size))/i,
        level: 'warn',
        type: 'resource',
        fingerprint: (match, log) => 'memory-issue',
        summary: (match, log) => {
          const memValue = (/(\d+(?:\.\d+)?\s*(?:MB|GB))/i.exec(log.message))?.[1] || '';
          return `Potential memory issue detected${memValue ? ` (${memValue})` : ''}`;
        },
      },

      // Database connection issues
      {
        id: 'db-connection-issue',
        name: 'Database Connection Issue',
        regex: /(database|db|postgres(?:ql)?)\s+(?:connection|query)\s+(?:failed|timeout|error)/i,
        level: 'error',
        type: 'database',
        fingerprint: (match, log) => {
          const errorType = (/(?:error|failed):\s+([^:,\n]+)/i.exec(log.message))?.[1] || 'connection-issue';
          return `db-issue-${errorType.toLowerCase().replace(/\s+/g, '-')}`;
        },
        summary: (match, log) => {
          const errorType = (/(?:error|failed):\s+([^:,\n]+)/i.exec(log.message))?.[1] || 'connection issue';
          return `Database ${errorType}`;
        },
      },

      // A2A Message Errors
      {
        id: 'a2a-message-error',
        name: 'A2A Message Error',
        regex: /a2a.*?message.*?(failed|error|invalid|malformed)/i,
        level: 'error',
        type: 'communication',
        fingerprint: (match, log) => {
          const fromAgent = log.metadata?.from || 'unknown';
          const toAgent = log.metadata?.to || 'unknown';
          return `a2a-message-error-${fromAgent}-to-${toAgent}`;
        },
        summary: (match, log) => {
          const fromAgent = log.metadata?.from || 'unknown';
          const toAgent = log.metadata?.to || 'unknown';
          return `A2A message error from ${fromAgent} to ${toAgent}`;
        },
      },

      // TypeErrors and SyntaxErrors
      {
        id: 'code-error',
        name: 'Code Error',
        regex: /(TypeError|SyntaxError|ReferenceError|RangeError):\s/i,
        level: 'error',
        type: 'code',
        fingerprint: (match, log) => {
          const errorType = match[1];
          const errorMsg = log.message.substring(log.message.indexOf(errorType)).split('\n')[0];
          return `${errorType.toLowerCase()}-${this.hashString(errorMsg).substring(0, 8)}`;
        },
        summary: (match, log) => {
          const errorType = match[1];
          const errorMsg = log.message.substring(log.message.indexOf(errorType)).split('\n')[0];
          return errorMsg;
        },
      },

      // Timeouts
      {
        id: 'timeout',
        name: 'Timeout',
        regex: /timeout\s+(?:occurred|exceeded|error)|timed?\s*out/i,
        level: 'warn',
        type: 'performance',
        fingerprint: (match, log) => {
          const operation = (/(\w+(?:\s+\w+)?)\s+timeout/i.exec(log.message))?.[1] || 'operation';
          return `timeout-${operation.toLowerCase().replace(/\s+/g, '-')}`;
        },
        summary: (match, log) => {
          const operation = (/(\w+(?:\s+\w+)?)\s+timeout/i.exec(log.message))?.[1] || 'operation';
          return `Timeout occurred during ${operation}`;
        },
      },

      // Render/Media Processing Errors
      {
        id: 'render-error',
        name: 'Render Error',
        regex: /(render|rendering|media\s+processing)\s+(?:failed|error)/i,
        level: 'error',
        type: 'rendering',
        fingerprint: (match, log) => {
          const errorDetail = (/error:?\s+([^:,\n]+)/i.exec(log.message))?.[1] || 'unknown';
          return `render-error-${errorDetail.toLowerCase().replace(/\s+/g, '-')}`;
        },
        summary: (match, log) => {
          const errorDetail = (/error:?\s+([^:,\n]+)/i.exec(log.message))?.[1] || '';
          return `Rendering failed${errorDetail ? `: ${errorDetail}` : ''}`;
        },
      },

      // OpenAI API Errors
      {
        id: 'openai-error',
        name: 'OpenAI API Error',
        regex: /openai.*?(api|request|rate\s*limit|error)/i,
        level: 'error',
        type: 'external-api',
        fingerprint: (match, log) => {
          const errorType = (/(?:error|failed):\s+([^:,\n]+)/i.exec(log.message))?.[1] || 'api-error';
          return `openai-error-${errorType.toLowerCase().replace(/\s+/g, '-')}`;
        },
        summary: (match, log) => {
          const errorDetail = (/(?:error|failed):\s+([^:,\n]+)/i.exec(log.message))?.[1] || 'API error';
          return `OpenAI ${errorDetail}`;
        },
      },
    ];
  }

  /**
   * Create a simple hash of a string for fingerprinting
   * @param str The string to hash
   * @returns A hash string
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Check a log entry against all patterns
   * @param log The log entry to check
   * @returns The detected issue or null if no pattern matches
   */
  checkLog(log: LogEntry): Issue | null {
    // Skip pattern matching if message is empty, null or undefined
    if (!log?.message) {
      return null;
    }
    
    const message = String(log.message); // Ensure message is a string
    
    for (const pattern of this.patterns) {
      try {
        const match = message.match(pattern.regex);
        if (match) {
          const fingerprint = pattern.fingerprint(match, log);
          return {
            fingerprint,
            type: pattern.type,
            level: pattern.level,
            summary: pattern.summary(match, log),
            source: log.source || 'unknown',
            count: 1,
            firstSeen: log.timestamp,
            lastSeen: log.timestamp,
            notified: false,
            runId: log.runId,
            relatedLogs: [],
          };
        }
      } catch (error: unknown) {
        // Log the error but continue processing other patterns
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error matching pattern ${pattern.id}: ${errorMessage}`, {
          pattern: pattern.name,
          logContent: message.substring(0, 100) + (message.length > 100 ? '...' : '')
        });
      }
    }
    return null;
  }

  /**
   * Get all available patterns
   * @returns Array of patterns
   */
  getPatterns(): LogPattern[] {
    return this.patterns;
  }
}

// Export singleton instance
export const patternService = new PatternService(); 