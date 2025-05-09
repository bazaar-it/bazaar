// src/lib/logger.ts
import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { env } from '~/env';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create formatters
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp(),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

const fileFormat = format.combine(
  format.timestamp(),
  format.json()
);

// Create our transport configurations
const fileTransportConfig = {
  dirname: logsDir,
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d', // Keep logs for 14 days
  format: fileFormat,
};

// Create logger instance
const logger = createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports: [
    // Console transport
    new transports.Console({
      format: consoleFormat,
    }),
    
    // Rotating file transports for different log levels
    new transports.DailyRotateFile({
      ...fileTransportConfig,
      filename: 'error-%DATE%.log',
      level: 'error',
    }),
    new transports.DailyRotateFile({
      ...fileTransportConfig,
      filename: 'combined-%DATE%.log',
    }),
    // Special file for component generation logs
    new transports.DailyRotateFile({
      ...fileTransportConfig,
      filename: 'components-%DATE%.log',
      level: 'debug',
    })
  ],
  exitOnError: false,
});

// Create specialized loggers for different parts of the application
export const componentLogger = {
  start: (jobId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[COMPONENT:START][JOB:${jobId}] ${message}`, { ...meta, component: true });
  },
  plan: (jobId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[COMPONENT:PLAN][JOB:${jobId}] ${message}`, { ...meta, component: true });
  },
  prompt: (jobId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[COMPONENT:PROMPT][JOB:${jobId}] ${message}`, { ...meta, component: true });
  },
  llm: (jobId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[COMPONENT:LLM][JOB:${jobId}] ${message}`, { ...meta, component: true });
  },
  parse: (jobId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[COMPONENT:PARSE][JOB:${jobId}] ${message}`, { ...meta, component: true });
  },
  error: (jobId: string, message: string, meta: Record<string, any> = {}) => {
    logger.error(`[COMPONENT:ERROR][JOB:${jobId}] ${message}`, { ...meta, component: true });
  },
  complete: (jobId: string, message: string, meta: Record<string, any> = {}) => {
    logger.info(`[COMPONENT:COMPLETE][JOB:${jobId}] ${message}`, { ...meta, component: true });
  },
};

export const buildLogger = {
  start: (jobId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[BUILD:START][JOB:${jobId}] ${message}`, { ...meta, build: true });
  },
  compile: (jobId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[BUILD:COMPILE][JOB:${jobId}] ${message}`, { ...meta, build: true });
  },
  upload: (jobId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[BUILD:UPLOAD][JOB:${jobId}] ${message}`, { ...meta, build: true });
  },
  error: (jobId: string, message: string, meta: Record<string, any> = {}) => {
    logger.error(`[BUILD:ERROR][JOB:${jobId}] ${message}`, { ...meta, build: true });
  },
  warn: (jobId: string, message: string, meta: Record<string, any> = {}) => {
    logger.warn(`[BUILD:WARN][JOB:${jobId}] ${message}`, { ...meta, build: true });
  },
  complete: (jobId: string, message: string, meta: Record<string, any> = {}) => {
    logger.info(`[BUILD:COMPLETE][JOB:${jobId}] ${message}`, { ...meta, build: true });
  },
};

export const scenePlannerLogger = {
  start: (planId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[PIPELINE:START][PLAN:${planId}] ${message}`, { ...meta, scenePlanner: true });
  },
  adb: (planId: string, sceneId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[PIPELINE:ADB][PLAN:${planId}][SCENE:${sceneId}] ${message}`, { ...meta, scenePlanner: true });
  },
  component: (planId: string, sceneId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[PIPELINE:COMPONENT][PLAN:${planId}][SCENE:${sceneId}] ${message}`, { ...meta, scenePlanner: true });
  },
  db: (planId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[PIPELINE:DB][PLAN:${planId}] ${message}`, { ...meta, scenePlanner: true });
  },
  error: (planId: string, message: string, meta: Record<string, any> = {}) => {
    logger.error(`[PIPELINE:ERROR][PLAN:${planId}] ${message}`, { ...meta, scenePlanner: true });
  },
  complete: (planId: string, message: string, meta: Record<string, any> = {}) => {
    logger.info(`[PIPELINE:COMPLETE][PLAN:${planId}] ${message}`, { ...meta, scenePlanner: true });
  },
};

export const animationDesignerLogger = {
  start: (sceneId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[ADB:START][SCENE:${sceneId}] ${message}`, { ...meta, animationDesigner: true });
  },
  data: (sceneId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[ADB:DATA][SCENE:${sceneId}] ${message}`, { ...meta, animationDesigner: true });
  },
  validation: (sceneId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[ADB:VALIDATION][SCENE:${sceneId}] ${message}`, { ...meta, animationDesigner: true });
  },
  error: (sceneId: string, message: string, meta: Record<string, any> = {}) => {
    logger.error(`[ADB:ERROR][SCENE:${sceneId}] ${message}`, { ...meta, animationDesigner: true });
  },
  complete: (sceneId: string, message: string, meta: Record<string, any> = {}) => {
    logger.info(`[ADB:COMPLETE][SCENE:${sceneId}] ${message}`, { ...meta, animationDesigner: true });
  },
};

export const chatLogger = {
  start: (messageId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[CHAT:START][MSG:${messageId}] ${message}`, { ...meta, chat: true });
  },
  stream: (messageId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[CHAT:STREAM][MSG:${messageId}] ${message}`, { ...meta, chat: true });
  },
  tool: (messageId: string, tool: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[CHAT:TOOL:${tool}][MSG:${messageId}] ${message}`, { ...meta, chat: true });
  },
  error: (messageId: string, message: string, meta: Record<string, any> = {}) => {
    logger.error(`[CHAT:ERROR][MSG:${messageId}] ${message}`, { ...meta, chat: true });
  },
  complete: (messageId: string, message: string, meta: Record<string, any> = {}) => {
    logger.info(`[CHAT:COMPLETE][MSG:${messageId}] ${message}`, { ...meta, chat: true });
  },
};

// For general logging
export default logger; 