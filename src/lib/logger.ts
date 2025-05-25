// src/lib/logger.ts
import { createLogger, format, transports, type Logger } from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { env } from '~/env';

// Imports from the Log Agent scripts - extensionless for Next.js bundler resolution
import { addLogAgentTransport } from '~/scripts/log-agent/integration'; 
import { generateRunId, config as logAgentConfig } from '~/scripts/log-agent/config';

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

// Track if A2A file transport has been initialized to prevent duplicates
let a2aFileTransportInitialized = false;

// Create either a server logger or a console logger
let logger: Logger;

// Initialize both server-side and client-side loggers
if (isServer) {
  // Get log directories from environment variables or use defaults
  const logsDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
  const errorLogsDir = process.env.ERROR_LOG_DIR || logsDir;
  const combinedLogsDir = process.env.COMBINED_LOG_DIR || logsDir;
  const componentsLogsDir = process.env.COMPONENTS_LOG_DIR || logsDir;

  // Log the directories being used
  console.log(`Logger initialization with: LOG_DIR=${logsDir}, ERROR_DIR=${errorLogsDir}`);

  // Ensure logs directories exist
  for (const dir of [logsDir, errorLogsDir, combinedLogsDir, componentsLogsDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created log directory: ${dir}`);
    }
  }

  // Create the main logger with file transports
  logger = createLogger({
    level: 'debug',
    format: fileFormat,
    defaultMeta: {},
    transports: [
      new transports.Console({
        format: consoleFormat,
        level: process.env.LOG_LEVEL || 'info'
      }),
      new transports.DailyRotateFile({
        dirname: logsDir,
        filename: 'components-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat
      }),
      new transports.DailyRotateFile({
        dirname: errorLogsDir,
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'error',
        format: fileFormat
      }),
      new transports.DailyRotateFile({
        dirname: combinedLogsDir,
        filename: 'combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat
      })
    ]
  });

  // Set up components logger
  const componentsLogger = createLogger({
    level: 'debug',
    format: fileFormat,
    defaultMeta: {},
    transports: [
      new transports.Console({
        format: consoleFormat,
        level: process.env.LOG_LEVEL || 'info'
      }),
      new transports.DailyRotateFile({
        dirname: componentsLogsDir,
        filename: 'components-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat
      })
    ]
  });

  // Log the environment variables affecting a2aLogger console level
  console.log(`[DEBUG_LOGGER] LOGGING_MODE: ${process.env.LOGGING_MODE}, LOG_LEVEL: ${process.env.LOG_LEVEL}`);

  // We'll create the a2aLogger from the main logger later as a child
  
  console.log(`Logger initialized with log directories: main=${logsDir}, error=${errorLogsDir}, combined=${combinedLogsDir}`);

  const currentRunId = process.env.LOG_RUN_ID || generateRunId();
  const agentUrl = process.env.LOG_AGENT_URL || `http://localhost:${logAgentConfig.port}`;

  console.log(`Integrating Log Agent Transport with runId: ${currentRunId} to URL: ${agentUrl}`);

  addLogAgentTransport(logger, {
    agentUrl: agentUrl,
    source: 'main-app',
    runId: currentRunId,
  });

  // We'll add the Log Agent Transport after creating a2aLogger

  addLogAgentTransport(componentsLogger, {
    agentUrl: agentUrl,
    source: 'components-worker',
    runId: currentRunId,
  });
  
  console.log('Log Agent Transport integrated with server-side loggers.');
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

  // Create a separate A2A logger
  const a2aLogger = createLogger({
    level: 'info',
    format: fileFormat,
    defaultMeta: { a2a: true },
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

  const clientRunId = process.env.NEXT_PUBLIC_LOG_RUN_ID || generateRunId();
  const clientAgentUrl =
    process.env.NEXT_PUBLIC_LOG_AGENT_URL ||
    process.env.LOG_AGENT_URL ||
    `http://localhost:${logAgentConfig.port}`;

  addLogAgentTransport(logger, {
    agentUrl: clientAgentUrl,
    source: 'main-app',
    runId: clientRunId,
  });

  addLogAgentTransport(a2aLogger, {
    agentUrl: clientAgentUrl,
    source: 'a2a-system',
    runId: clientRunId,
  });

  addLogAgentTransport(componentsLogger, {
    agentUrl: clientAgentUrl,
    source: 'components-worker',
    runId: clientRunId,
  });
}

// Function to initialize the A2A file transport if requested
export const initializeA2AFileTransport = (): void => {
  // Skip file transport initialization in serverless production environments
  if (isServerlessProduction) {
    console.log('[LOGGER] Skipping A2A file transport initialization in serverless environment');
    a2aFileTransportInitialized = true;
    return;
  }

  if (a2aFileTransportInitialized) {
    console.log('[LOGGER] A2A File transport already initialized, skipping...');
    return;
  }

  const isTestMode = process.env.NODE_ENV === 'test' || process.env.A2A_TEST_MODE === 'true';
  const a2aLogsDir = isTestMode 
    ? path.join(process.cwd(), 'tmp', 'a2a-test-logs', 'a2a')
    : (process.env.A2A_LOG_DIR || path.join(process.cwd(), 'logs', 'a2a'));
  
  // Ensure directory exists - but only in non-serverless environments
  try {
    if (!fs.existsSync(a2aLogsDir)) {
      fs.mkdirSync(a2aLogsDir, { recursive: true });
      console.log(`Created A2A log directory: ${a2aLogsDir}`);
    }
  } catch (error) {
    console.warn(`[LOGGER] Could not create A2A log directory: ${error}. Continuing without file logging.`);
    a2aFileTransportInitialized = true;
    return;
  }
  
  // Add file transport to the logger
  const a2aLogger = logger.child({ module: 'a2a' });
  a2aLogger.add(
    new transports.DailyRotateFile({
      level: process.env.A2A_LOG_LEVEL || 'debug',
      dirname: a2aLogsDir,
      filename: 'a2a-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat
    })
  );
  
  a2aFileTransportInitialized = true;
  
  a2aLogger.info(`A2A File transport initialized in ${isTestMode ? 'TEST' : 'NORMAL'} mode`);
  a2aLogger.info(`A2A File transport initialized with logs at: ${a2aLogsDir}`);
};

// Allow TaskProcessor to explicitly check if the file transport is initialized
export function isA2AFileTransportInitialized(): boolean {
  return a2aFileTransportInitialized;
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

// Create a2aLogger as a child logger
const a2aLogger = logger.child({ module: 'a2a' });

// Now configure a2aLogger console transport level specifically
console.log(`[DEBUG_LOGGER] Configuring a2aLogger console level. LOGGING_MODE: ${process.env.LOGGING_MODE}`);
// Find the console transport in a2aLogger and set its level
const a2aConsoleTransport = a2aLogger.transports.find(
  (t) => t instanceof transports.Console
);
if (a2aConsoleTransport) {
  a2aConsoleTransport.level = process.env.LOGGING_MODE === 'a2a' 
    ? (process.env.LOG_LEVEL || 'info') 
    : 'error'; // Suppress a2a console logs if not in 'a2a' mode
  console.log(`[DEBUG_LOGGER] a2aLogger console level set to: ${a2aConsoleTransport.level}`);
} else {
  console.log('[DEBUG_LOGGER] Could not find a2aLogger console transport to configure!');
}

// Add the Log Agent Transport to a2aLogger
const logAgentUrl = process.env.LOG_AGENT_URL || `http://localhost:${logAgentConfig.port}`;
const logRunId = process.env.LOG_RUN_ID || generateRunId();
addLogAgentTransport(a2aLogger, {
  agentUrl: logAgentUrl,
  source: 'a2a-system',
  runId: logRunId,
});

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

// A2A Logger standalone functions
const origA2ADebug = a2aLogger.debug.bind(a2aLogger);
const origA2AInfo = a2aLogger.info.bind(a2aLogger);

export const logA2ATaskCreate = (loggerInstance: Logger, taskId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown-task';
  loggerInstance.info(`[A2A:TASK_CREATE][TASK:${normalizedTaskId}] ${message}`, { ...meta, taskId: normalizedTaskId, a2a: true });
};

export const logA2ATaskStatusChange = (loggerInstance: Logger, taskId: StringOrNull, oldState: string, newState: string, message: string, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown-task';
  loggerInstance.info(`[A2A:TASK_STATUS][TASK:${normalizedTaskId}] State: ${oldState} -> ${newState}. ${message}`, { ...meta, taskId: normalizedTaskId, oldState, newState, a2a: true });
};

export const logA2AAgentReceive = (loggerInstance: Logger, agentName: string, taskId: StringOrNull, messageType: string, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown-task';
  loggerInstance.debug(`[A2A:AGENT_RECEIVE][AGENT:${agentName}][TASK:${normalizedTaskId}] Received ${messageType}`, { ...meta, agentName, taskId: normalizedTaskId, messageType, a2a: true });
};

export const logA2AAgentProcess = (loggerInstance: Logger, agentName: string, taskId: StringOrNull, step: string, message: string, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown-task';
  loggerInstance.debug(`[A2A:AGENT_PROCESS][AGENT:${agentName}][TASK:${normalizedTaskId}][STEP:${step}] ${message}`, { ...meta, agentName, taskId: normalizedTaskId, step, a2a: true });
};

export const logA2AAgentSend = (loggerInstance: Logger, agentName: string, taskId: StringOrNull, recipient: string, messageType: string, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown-task';
  loggerInstance.debug(`[A2A:AGENT_SEND][AGENT:${agentName}][TASK:${normalizedTaskId}] Sending ${messageType} to ${recipient}`, { ...meta, agentName, taskId: normalizedTaskId, recipient, messageType, a2a: true });
};

export const logA2AMessageBusDelivery = (loggerInstance: Logger, messageId: string, recipient: string, taskId: StringOrNull, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown-task';
  loggerInstance.debug(`[A2A:MESSAGE_BUS][MSG_ID:${messageId}][TASK:${normalizedTaskId}] Delivering message to ${recipient}`, { ...meta, messageId, recipient, taskId: normalizedTaskId, a2a: true });
};

export const logA2ASSEEventSent = (loggerInstance: Logger, taskId: StringOrNull, eventType: string, eventData: any, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown-task';
  loggerInstance.debug(`[A2A:SSE_EVENT][TASK:${normalizedTaskId}] Sent ${eventType}`, { ...meta, taskId: normalizedTaskId, eventType, eventPayload: eventData, a2a: true });
};

export const logA2ASSESubscription = (loggerInstance: Logger, taskId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown-task';
  loggerInstance.info(`[A2A:SSE_SUB][TASK:${normalizedTaskId}] ${message}`, { ...meta, taskId: normalizedTaskId, a2a: true });
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
  a2aLogger,
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