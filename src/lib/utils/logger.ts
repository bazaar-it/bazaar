// src/lib/logger.ts
import { createLogger, format, transports, type Logger } from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { env } from '~/env';

// Fix for function parameters that allow null taskId
type StringOrNull = string | null;

// Extend the Winston Logger type with custom A2A methods
declare module 'winston' {
  interface Logger {
    // Add buildLogger method signatures
    start(jobId: string, message: string, meta?: Record<string, any>): Logger;
    compile(jobId: string, message: string, meta?: Record<string, any>): Logger;
    upload(jobId: string, message: string, meta?: Record<string, any>): Logger;
    complete(jobId: string, message: string, meta?: Record<string, any>): Logger;
  }
}

// Check if we're running on the server or in the browser
const isServer = typeof window === 'undefined';

// Check if we're in a production serverless environment
const isServerlessProduction = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;

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

// Track if system file transport has been initialized to prevent duplicates
let systemFileTransportInitialized = false;

// Create either a server logger or a console logger
let logger: Logger;

// Safe directory creation function
const safeCreateDir = (dir: string): boolean => {
  if (isServerlessProduction) {
    // console.log(`[LOGGER] Skipping directory creation in serverless environment: ${dir}`);
    return false;
  }
  
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      // console.log(`Created log directory: ${dir}`);
    }
    return true;
  } catch (error) {
    // console.warn(`[LOGGER] Could not create directory ${dir}: ${error}. Continuing without file logging.`);
    return false;
  }
};

// Initialize both server-side and client-side loggers
if (isServer) {
  // Get log directories from environment variables or use defaults
  const logsDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
  const errorLogsDir = process.env.ERROR_LOG_DIR || logsDir;
  const combinedLogsDir = process.env.COMBINED_LOG_DIR || logsDir;
  const componentsLogsDir = process.env.COMPONENTS_LOG_DIR || logsDir;

  // Log the directories being used
  // console.log(`Logger initialization with: LOG_DIR=${logsDir}, ERROR_DIR=${errorLogsDir}`);

  // Create base transports (always include console)
  const baseTransports: any[] = [
    new transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'info'
    })
  ];

  // Only add file transports if we can create directories
  if (!isServerlessProduction) {
    // Ensure logs directories exist
    const dirsCreated = [logsDir, errorLogsDir, combinedLogsDir, componentsLogsDir].map(safeCreateDir);
    
    // Only add file transports if directories were created successfully
    if (dirsCreated.some(created => created)) {
      if (safeCreateDir(logsDir)) {
        baseTransports.push(
          new transports.DailyRotateFile({
            dirname: logsDir,
            filename: 'components-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: fileFormat
          })
        );
      }
      
      if (safeCreateDir(errorLogsDir)) {
        baseTransports.push(
          new transports.DailyRotateFile({
            dirname: errorLogsDir,
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error',
            format: fileFormat
          })
        );
      }
      
      if (safeCreateDir(combinedLogsDir)) {
        baseTransports.push(
          new transports.DailyRotateFile({
            dirname: combinedLogsDir,
            filename: 'combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: fileFormat
          })
        );
      }
    }
  }

  // Create the main logger with safe transports
  logger = createLogger({
    level: 'debug',
    format: fileFormat,
    defaultMeta: {},
    transports: baseTransports
  });

  // Set up components logger with safe transports
  const componentsTransports: any[] = [
    new transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'info'
    })
  ];

  if (!isServerlessProduction && safeCreateDir(componentsLogsDir)) {
    componentsTransports.push(
      new transports.DailyRotateFile({
        dirname: componentsLogsDir,
        filename: 'components-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat
      })
    );
  }

  const componentsLogger = createLogger({
    level: 'debug',
    format: fileFormat,
    defaultMeta: {},
    transports: componentsTransports
  });

  // Log the environment variables affecting logger console level
  // console.log(`[DEBUG_LOGGER] LOGGING_MODE: ${process.env.LOGGING_MODE}, LOG_LEVEL: ${process.env.LOG_LEVEL}`)
  
  // console.log(`Logger initialized with log directories: main=${logsDir}, error=${errorLogsDir}, combined=${combinedLogsDir}`);

} else {
  // Simple console logger for client-side
  logger = createLogger({
    level: 'info',
    format: fileFormat,
    transports: [
      new transports.Console({
        format: consoleFormat,
      }),
    ],
  });

  // Create a separate system logger
  const systemLogger = createLogger({
    level: 'info',
    format: fileFormat,
    defaultMeta: { system: true },
    transports: [
      new transports.Console({
        format: consoleFormat,
      }),
    ],
  });

  // Create a separate components logger
  const componentsLogger = createLogger({
    level: 'info',
    format: fileFormat,
    defaultMeta: {},
    transports: [
      new transports.Console({
        format: consoleFormat,
      }),
    ],
  });

}

// Function to initialize system file transport if requested
export const initializeSystemFileTransport = (): void => {
  // Skip file transport initialization in serverless production environments
  if (isServerlessProduction) {
    // console.log('[LOGGER] Skipping system file transport initialization in serverless environment');
    systemFileTransportInitialized = true;
    return;
  }

  if (systemFileTransportInitialized) {
    // console.log('[LOGGER] System file transport already initialized, skipping...');
    return;
  }

  const isTestMode = process.env.NODE_ENV === 'test';
  const systemLogsDir = isTestMode 
    ? path.join(process.cwd(), 'tmp', 'system-test-logs')
    : path.join(process.cwd(), 'logs', 'system');
  
  // Ensure directory exists - but only in non-serverless environments
  try {
    if (!fs.existsSync(systemLogsDir)) {
      fs.mkdirSync(systemLogsDir, { recursive: true });
      // console.log(`Created system log directory: ${systemLogsDir}`);
    }
  } catch (error) {
    // console.warn(`[LOGGER] Could not create system log directory: ${error}. Continuing without file logging.`);
    systemFileTransportInitialized = true;
    return;
  }
  
  // Add file transport to the logger
  systemLogger.add(
    new transports.DailyRotateFile({
      level: process.env.LOG_LEVEL || 'debug',
      dirname: systemLogsDir,
      filename: 'system-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat
    })
  );
  
  systemFileTransportInitialized = true;
  
  systemLogger.info(`System file transport initialized in ${isTestMode ? 'TEST' : 'NORMAL'} mode`);
  systemLogger.info(`System file transport initialized with logs at: ${systemLogsDir}`);
};

// Allow processes to explicitly check if the file transport is initialized
export function isSystemFileTransportInitialized(): boolean {
  return systemFileTransportInitialized;
}

const chatLogger = logger.child({ module: 'chat' });
const origChatInfo = chatLogger.info.bind(chatLogger);
const origChatError = chatLogger.error.bind(chatLogger);

chatLogger.error = (messageOrInfo: string | object, ...args: any[]): Logger => {
  let msg: string;
  let meta: Record<string, any> = {};
  if (typeof messageOrInfo === 'string') {
    msg = messageOrInfo;
    if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
      meta = args[0];
    } else if (args.length > 0) {
      meta = { splat: args };
    }
  } else {
    const infoObj = messageOrInfo as Record<string, any>;
    msg = infoObj.message || '';
    const { message: _msg, level: _lvl, timestamp: _ts, ...restInfo } = infoObj;
    meta = restInfo;
  }
  const messageId = meta?.messageId || 'unknown-message';
  const fullMessage = `[CHAT:ERROR][MSG:${messageId}] ${msg}`;
  const { messageId: _mId, ...metaForOrigCall } = meta;
  const finalMetaForOrigCall = { ...metaForOrigCall, taskId: messageId, chat: true };
  origChatError(fullMessage, finalMetaForOrigCall);
  return chatLogger;
};

chatLogger.info = (messageOrInfo: string | object, ...args: any[]): Logger => {
  let msg: string;
  let meta: Record<string, any> = {};
  if (typeof messageOrInfo === 'string') {
    msg = messageOrInfo;
    if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
      meta = args[0];
    } else if (args.length > 0) {
      meta = { splat: args };
    }
  } else {
    const infoObj = messageOrInfo as Record<string, any>;
    msg = infoObj.message || '';
    const { message: _msg, level: _lvl, timestamp: _ts, ...restInfo } = infoObj;
    meta = restInfo;
  }
  const messageId = meta?.messageId || 'unknown-message';
  const fullMessage = `[CHAT:INFO][MSG:${messageId}] ${msg}`;
  const { messageId: _mId, ...metaForOrigCall } = meta;
  const finalMetaForOrigCall = { ...metaForOrigCall, taskId: messageId, chat: true };
  origChatInfo(fullMessage, finalMetaForOrigCall);
  return chatLogger;
};

const buildLogger = logger.child({ module: 'build' });
const origBuildInfo = buildLogger.info.bind(buildLogger);
const origBuildError = buildLogger.error.bind(buildLogger);

buildLogger.error = (messageOrInfo: string | object, ...args: any[]): Logger => {
  let msg: string;
  let meta: Record<string, any> = {};
  if (typeof messageOrInfo === 'string') {
    msg = messageOrInfo;
    if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
      meta = args[0];
    } else if (args.length > 0) {
      meta = { splat: args };
    }
  } else {
    const infoObj = messageOrInfo as Record<string, any>;
    msg = infoObj.message || '';
    const { message: _msg, level: _lvl, timestamp: _ts, ...restInfo } = infoObj;
    meta = restInfo;
  }
  const jobId = meta?.jobId || 'unknown-job';
  const fullMessage = `[BUILD:ERROR][JOB:${jobId}] ${msg}`;
  const { jobId: _jId, ...metaForOrigCall } = meta;
  const finalMetaForOrigCall = { ...metaForOrigCall, taskId: jobId, build: true };
  origBuildError(fullMessage, finalMetaForOrigCall);
  return buildLogger;
};

buildLogger.info = (messageOrInfo: string | object, ...args: any[]): Logger => {
  let msg: string;
  let meta: Record<string, any> = {};
  if (typeof messageOrInfo === 'string') {
    msg = messageOrInfo;
    if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
      meta = args[0];
    } else if (args.length > 0) {
      meta = { splat: args };
    }
  } else {
    const infoObj = messageOrInfo as Record<string, any>;
    msg = infoObj.message || '';
    const { message: _msg, level: _lvl, timestamp: _ts, ...restInfo } = infoObj;
    meta = restInfo;
  }
  const jobId = meta?.jobId || 'unknown-job';
  const fullMessage = `[BUILD:INFO][JOB:${jobId}] ${msg}`;
  const { jobId: _jId, ...metaForOrigCall } = meta;
  const finalMetaForOrigCall = { ...metaForOrigCall, taskId: jobId, build: true };
  origBuildInfo(fullMessage, finalMetaForOrigCall);
  return buildLogger;
};

// Add buildLogger.start method
buildLogger.start = (jobId: string, message: string, meta: Record<string, any> = {}): Logger => {
  const fullMessage = `[BUILD:START][JOB:${jobId}] ${message}`;
  const finalMetaForOrigCall = { ...meta, taskId: jobId, build: true };
  origBuildInfo(fullMessage, finalMetaForOrigCall);
  return buildLogger;
};

// Add buildLogger.compile method
buildLogger.compile = (jobId: string, message: string, meta: Record<string, any> = {}): Logger => {
  const fullMessage = `[BUILD:COMPILE][JOB:${jobId}] ${message}`;
  const finalMetaForOrigCall = { ...meta, taskId: jobId, build: true };
  origBuildInfo(fullMessage, finalMetaForOrigCall);
  return buildLogger;
};

// Add buildLogger.upload method
buildLogger.upload = (jobId: string, message: string, meta: Record<string, any> = {}): Logger => {
  const fullMessage = `[BUILD:UPLOAD][JOB:${jobId}] ${message}`;
  const finalMetaForOrigCall = { ...meta, taskId: jobId, build: true };
  origBuildInfo(fullMessage, finalMetaForOrigCall);
  return buildLogger;
};

// Add buildLogger.complete method
buildLogger.complete = (jobId: string, message: string, meta: Record<string, any> = {}): Logger => {
  const fullMessage = `[BUILD:COMPLETE][JOB:${jobId}] ${message}`;
  const finalMetaForOrigCall = { ...meta, taskId: jobId, build: true };
  origBuildInfo(fullMessage, finalMetaForOrigCall);
  return buildLogger;
};

const scenePlannerLogger = logger.child({ module: 'scenePlanner' });
const origScenePlannerInfo = scenePlannerLogger.info.bind(scenePlannerLogger);
const origScenePlannerError = scenePlannerLogger.error.bind(scenePlannerLogger);

scenePlannerLogger.error = (messageOrInfo: string | object, ...args: any[]): Logger => {
  let msg: string;
  let meta: Record<string, any> = {};
  if (typeof messageOrInfo === 'string') {
    msg = messageOrInfo;
    if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
      meta = args[0];
    } else if (args.length > 0) {
      meta = { splat: args };
    }
  } else {
    const infoObj = messageOrInfo as Record<string, any>;
    msg = infoObj.message || '';
    const { message: _msg, level: _lvl, timestamp: _ts, ...restInfo } = infoObj;
    meta = restInfo;
  }
  const planId = meta?.planId || 'unknown-plan';
  const fullMessage = `[PIPELINE:ERROR][PLAN:${planId}] ${msg}`;
  const { planId: _pId, ...metaForOrigCall } = meta;
  const finalMetaForOrigCall = { ...metaForOrigCall, taskId: planId, scenePlanner: true };
  origScenePlannerError(fullMessage, finalMetaForOrigCall);
  return scenePlannerLogger;
};

scenePlannerLogger.info = (messageOrInfo: string | object, ...args: any[]): Logger => {
  let msg: string;
  let meta: Record<string, any> = {};
  if (typeof messageOrInfo === 'string') {
    msg = messageOrInfo;
    if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
      meta = args[0];
    } else if (args.length > 0) {
      meta = { splat: args };
    }
  } else {
    const infoObj = messageOrInfo as Record<string, any>;
    msg = infoObj.message || '';
    const { message: _msg, level: _lvl, timestamp: _ts, ...restInfo } = infoObj;
    meta = restInfo;
  }
  const planId = meta?.planId || 'unknown-plan';
  const fullMessage = `[PIPELINE:INFO][PLAN:${planId}] ${msg}`;
  const { planId: _pId, ...metaForOrigCall } = meta;
  const finalMetaForOrigCall = { ...metaForOrigCall, taskId: planId, scenePlanner: true };
  origScenePlannerInfo(fullMessage, finalMetaForOrigCall);
  return scenePlannerLogger;
};

// Create general system logger as a child logger
const systemLogger = logger.child({ module: 'system' });

// Configure console transport level specifically
// console.log(`[DEBUG_LOGGER] Configuring system logger console level. LOGGING_MODE: ${process.env.LOGGING_MODE}`);
const systemConsoleTransport = systemLogger.transports.find(
  (t) => t instanceof transports.Console
);
if (systemConsoleTransport) {
  systemConsoleTransport.level = process.env.LOG_LEVEL || 'info';
  // console.log(`[DEBUG_LOGGER] System logger console level set to: ${systemConsoleTransport.level}`);
} else {
  // console.log('[DEBUG_LOGGER] Could not find system logger console transport to configure!');
}

// Other child loggers
const authLogger = logger.child({ module: 'auth' });
const pageLogger = logger.child({ module: 'page' });
const apiLogger = logger.child({ module: 'api' });
const cronLogger = logger.child({ module: 'cron' });
const workerLogger = logger.child({ module: 'worker' });
const dbLogger = logger.child({ module: 'db' });
const toolsLogger = logger.child({ module: 'tools' });
const agentLogger = logger.child({ module: 'agent' });
const modelsLogger = logger.child({ module: 'models' });
const componentLogger = logger.child({ module: 'component' });
const animationDesignerLogger = logger.child({ module: 'animationDesigner' });

// System Logger standalone functions
const origSystemDebug = systemLogger.debug.bind(systemLogger);
const origSystemInfo = systemLogger.info.bind(systemLogger);

export const logSystemProcess = (loggerInstance: Logger, processId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedProcessId = processId || 'unknown-process';
  loggerInstance.info(`[SYSTEM:PROCESS][ID:${normalizedProcessId}] ${message}`, { ...meta, processId: normalizedProcessId, system: true });
};

export const logSystemEvent = (loggerInstance: Logger, eventType: string, eventData: any, meta: Record<string, any> = {}) => {
  loggerInstance.debug(`[SYSTEM:EVENT] ${eventType}`, { ...meta, eventType, eventPayload: eventData, system: true });
};

// Initialize ChatLogger specific methods
export const logChatStream = (loggerInstance: Logger, messageId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedMessageId = messageId || 'unknown-message';
  loggerInstance.debug(`[CHAT:STREAM][MSG:${normalizedMessageId}] ${message}`, { ...meta, taskId: normalizedMessageId, chat: true });
};

export const logChatTool = (loggerInstance: Logger, messageId: StringOrNull, toolName: string, message: string, meta: Record<string, any> = {}) => {
  const normalizedMessageId = messageId || 'unknown-message';
  loggerInstance.debug(`[CHAT:TOOL:${toolName}][MSG:${normalizedMessageId}] ${message}`, { ...meta, taskId: normalizedMessageId, chat: true, tool: toolName });
};

export const logChatComplete = (loggerInstance: Logger, messageId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedMessageId = messageId || 'unknown-message';
  loggerInstance.info(`[CHAT:COMPLETE][MSG:${normalizedMessageId}] ${message}`, { ...meta, taskId: normalizedMessageId, chat: true });
};

// Initialize BuildLogger specific methods
export const logBuildStart = (loggerInstance: Logger, jobId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedJobId = jobId || 'unknown-job';
  loggerInstance.info(`[BUILD:START][JOB:${normalizedJobId}] ${message}`, { ...meta, taskId: normalizedJobId, build: true });
};

export const logBuildCompile = (loggerInstance: Logger, jobId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedJobId = jobId || 'unknown-job';
  loggerInstance.debug(`[BUILD:COMPILE][JOB:${normalizedJobId}] ${message}`, { ...meta, taskId: normalizedJobId, build: true });
};

export const logBuildUpload = (loggerInstance: Logger, jobId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedJobId = jobId || 'unknown-job';
  loggerInstance.debug(`[BUILD:UPLOAD][JOB:${normalizedJobId}] ${message}`, { ...meta, taskId: normalizedJobId, build: true });
};

export const logBuildWarn = (loggerInstance: Logger, jobId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedJobId = jobId || 'unknown-job';
  loggerInstance.warn(`[BUILD:WARN][JOB:${normalizedJobId}] ${message}`, { ...meta, taskId: normalizedJobId, build: true });
};

export const logBuildComplete = (loggerInstance: Logger, jobId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedJobId = jobId || 'unknown-job';
  loggerInstance.info(`[BUILD:COMPLETE][JOB:${normalizedJobId}] ${message}`, { ...meta, taskId: normalizedJobId, build: true });
};

export const logBuildDebug = (loggerInstance: Logger, jobId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedJobId = jobId || 'unknown-job';
  loggerInstance.debug(`[BUILD:DEBUG][JOB:${normalizedJobId}] ${message}`, { ...meta, taskId: normalizedJobId, build: true });
};

// Initialize ScenePlannerLogger specific methods
export const logScenePlannerDb = (loggerInstance: Logger, planId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedPlanId = planId || 'unknown-plan';
  loggerInstance.debug(`[PIPELINE:DB][PLAN:${normalizedPlanId}] ${message}`, { ...meta, taskId: normalizedPlanId, scenePlanner: true });
};

export const logScenePlannerAdb = (loggerInstance: Logger, planId: StringOrNull, sceneId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedPlanId = planId || 'unknown-plan';
  const normalizedSceneId = sceneId || 'unknown-scene';
  loggerInstance.debug(`[PIPELINE:ADB][PLAN:${normalizedPlanId}][SCENE:${normalizedSceneId}] ${message}`, { ...meta, taskId: normalizedPlanId, sceneId: normalizedSceneId, scenePlanner: true });
};

export const logScenePlannerComponent = (loggerInstance: Logger, planId: StringOrNull, sceneId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedPlanId = planId || 'unknown-plan';
  const normalizedSceneId = sceneId || 'unknown-scene';
  loggerInstance.debug(`[PIPELINE:COMPONENT][PLAN:${normalizedPlanId}][SCENE:${normalizedSceneId}] ${message}`, { ...meta, taskId: normalizedPlanId, sceneId: normalizedSceneId, scenePlanner: true });
};

export const logScenePlannerComplete = (loggerInstance: Logger, planId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedPlanId = planId || 'unknown-plan';
  loggerInstance.info(`[PIPELINE:COMPLETE][PLAN:${normalizedPlanId}] ${message}`, { ...meta, taskId: normalizedPlanId, scenePlanner: true });
};

export const logScenePlannerDebug = (loggerInstance: Logger, planId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedPlanId = planId || 'unknown-plan';
  loggerInstance.debug(`[PIPELINE:DEBUG][PLAN:${normalizedPlanId}] ${message}`, { ...meta, taskId: normalizedPlanId, scenePlanner: true });
};

// Fallback logger - if a specific logger doesn't have a method, it will use the base logger's methods
// However, this might not be desired if we want strict method availability per logger.

export {
  logger,
  buildLogger,
  scenePlannerLogger,
  chatLogger,
  systemLogger,
  authLogger,
  pageLogger,
  apiLogger,
  cronLogger,
  workerLogger,
  dbLogger,
  toolsLogger,
  agentLogger,
  modelsLogger,
  componentLogger,
  animationDesignerLogger,
};

// Make `logger` the default export
export default logger;

/**
 * Agent Send Logging - Standalone function to handle agent send logging
 */
export function logAgentSend(
  loggerInstance: Logger,
  agentName: string,
  taskId: string,
  recipient: string,
  messageType: string,
  meta?: Record<string, any>
): Logger {
  const formattedMessage = `AGENT[${agentName}] -> ${recipient}: ${messageType}`;
  return loggerInstance.info(formattedMessage, {
    ...meta,
    agent: agentName,
    taskId,
    recipient,
    messageType,
    action: 'agent_send'
  });
}

/**
 * Agent Process Logging - Standalone function to handle agent process logging
 */
export function logAgentProcess(
  loggerInstance: Logger,
  agentName: string,
  taskId: string,
  processName: string,
  message: string,
  meta?: Record<string, any>
): Logger {
  const formattedMessage = `AGENT[${agentName}] PROCESS[${processName}]: ${message}`;
  return loggerInstance.info(formattedMessage, {
    ...meta,
    agent: agentName,
    taskId,
    processName,
    action: 'agent_process'
  });
}

/**
 * Animation Designer Start Logging - Standalone function for tracking animation generation starts
 */
export function logAnimationStart(
  loggerInstance: Logger,
  sceneId: string,
  message: string,
  meta?: Record<string, any>
): Logger {
  const formattedMessage = `[ANIMATION:START][SCENE:${sceneId}] ${message}`;
  return loggerInstance.info(formattedMessage, {
    ...meta,
    sceneId,
    animation: true,
    stage: 'start'
  });
}

/**
 * Animation Designer Validation Logging - Standalone function for animation validation logs
 */
export function logAnimationValidation(
  loggerInstance: Logger,
  sceneId: string,
  message: string,
  meta?: Record<string, any>
): Logger {
  const formattedMessage = `[ANIMATION:VALIDATION][SCENE:${sceneId}] ${message}`;
  return loggerInstance.info(formattedMessage, {
    ...meta,
    sceneId,
    animation: true,
    stage: 'validation'
  });
}

/**
 * Animation Designer Complete Logging - Standalone function for marking completion of animation tasks
 */
export function logAnimationComplete(
  loggerInstance: Logger,
  sceneId: string,
  message: string,
  meta?: Record<string, any>
): Logger {
  const formattedMessage = `[ANIMATION:COMPLETE][SCENE:${sceneId}] ${message}`;
  return loggerInstance.info(formattedMessage, {
    ...meta,
    sceneId,
    animation: true,
    stage: 'complete'
  });
}