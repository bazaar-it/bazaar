// src/lib/logger.ts
import { createLogger, format, transports, Logger } from 'winston';
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
    // A2A Logger extensions
    taskCreate: (taskId: StringOrNull, message: string, meta?: Record<string, any>) => Logger;
    taskStatusChange: (taskId: StringOrNull, oldState: string, newState: string, message: string, meta?: Record<string, any>) => Logger;
    agentReceive: (agentName: string, taskId: StringOrNull, messageType: string, meta?: Record<string, any>) => Logger;
    agentProcess: (agentName: string, taskId: StringOrNull, step: string, message: string, meta?: Record<string, any>) => Logger;
    agentSend: (agentName: string, taskId: StringOrNull, recipient: string, messageType: string, meta?: Record<string, any>) => Logger;
    messageBusDelivery: (messageId: string, recipient: string, taskId: StringOrNull, meta?: Record<string, any>) => Logger;
    sseEventSent: (taskId: StringOrNull, eventType: string, eventData: any, meta?: Record<string, any>) => Logger;
    sseSubscription: (taskId: StringOrNull, message: string, meta?: Record<string, any>) => Logger;
    
    // BuildLogger extensions
    start: (jobId: StringOrNull, message: string, meta?: Record<string, any>) => Logger;
    compile: (jobId: StringOrNull, message: string, meta?: Record<string, any>) => Logger;
    upload: (jobId: StringOrNull, message: string, meta?: Record<string, any>) => Logger;
    complete: (jobId: StringOrNull, message: string, meta?: Record<string, any>) => Logger;
    
    // ScenePlannerLogger extensions
    adb: (planId: StringOrNull, sceneId: StringOrNull, message: string, meta?: Record<string, any>) => Logger;
    component: (planId: StringOrNull, sceneId: StringOrNull, message: string, meta?: Record<string, any>) => Logger;
    db: (planId: StringOrNull, message: string, meta?: Record<string, any>) => Logger;
    
    // ChatLogger extensions
    streamLog: (messageId: StringOrNull, message: string, meta?: Record<string, any>) => Logger;
    tool: (messageId: StringOrNull, toolName: string, message: string, meta?: Record<string, any>) => Logger;
  }

  // We don't need to redefine standard methods, but we do need to support null taskId
  interface LogMethod {
    (level: string, taskId: StringOrNull, msg: string, meta?: any): Logger;
    (level: string, taskId: StringOrNull, msg: string, meta: any, callback: (...args: any[]) => void): Logger;
    (level: string, taskId: StringOrNull, msg: string, callback: (...args: any[]) => void): Logger;
  }
}

// Check if we're running on the server or in the browser
const isServer = typeof window === 'undefined';

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
let a2aLogger: Logger;
let componentsLogger: Logger;

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
  componentsLogger = createLogger({
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

  // Set up A2A logger - but don't add the file transport yet
  a2aLogger = createLogger({
    level: 'debug',
    format: fileFormat,
    defaultMeta: { a2a: true },
    transports: [
      new transports.Console({
        format: consoleFormat,
        level: process.env.LOG_LEVEL || 'info'
      })
    ]
  });
  
  console.log(`Logger initialized with log directories: main=${logsDir}, error=${errorLogsDir}, combined=${combinedLogsDir}`);

  const currentRunId = process.env.LOG_RUN_ID || generateRunId();
  const agentUrl = process.env.LOG_AGENT_URL || `http://localhost:${logAgentConfig.port}`;

  console.log(`Integrating Log Agent Transport with runId: ${currentRunId} to URL: ${agentUrl}`);

  addLogAgentTransport(logger, {
    agentUrl: agentUrl,
    source: 'main-app',
    runId: currentRunId,
  });

  addLogAgentTransport(a2aLogger, {
    agentUrl: agentUrl,
    source: 'a2a-system',
    runId: currentRunId,
  });

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
    format: consoleFormat,
    transports: [
      new transports.Console({
        format: consoleFormat
      })
    ]
  });

  // Create a separate A2A logger
  a2aLogger = createLogger({
    level: 'info',
    format: consoleFormat,
    defaultMeta: { a2a: true },
    transports: [
      new transports.Console({
        format: consoleFormat
      })
    ]
  });

  // Create a separate components logger
  componentsLogger = createLogger({
    level: 'info',
    format: consoleFormat,
    defaultMeta: {},
    transports: [
      new transports.Console({
        format: consoleFormat
      })
    ]
  });
}

// Function to initialize the A2A file transport if requested
export const initializeA2AFileTransport = (): void => {
  if (a2aFileTransportInitialized) {
    return; // Already initialized, do nothing
  }
  
  // Only initialize on server
  if (!isServer) return;
  
  // Check if we're in test mode - use tmp directory to avoid HMR issues
  const isTestMode = process.env.A2A_TEST_MODE === 'true';
  
  // Get A2A logs directory - use tmp directory if in test mode
  const a2aLogsDir = isTestMode
    ? path.join(process.cwd(), 'tmp', 'a2a-test-logs', 'a2a')
    : (process.env.A2A_LOG_DIR || path.join(process.cwd(), 'logs', 'a2a'));
  
  // Ensure directory exists
  if (!fs.existsSync(a2aLogsDir)) {
    fs.mkdirSync(a2aLogsDir, { recursive: true });
    console.log(`Created A2A log directory: ${a2aLogsDir}`);
  }
  
  // Add file transport to the logger
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
  
  a2aLogger.info('system', `A2A File transport initialized in ${isTestMode ? 'TEST' : 'NORMAL'} mode`);
  console.log(`A2A File transport initialized in ${isTestMode ? 'TEST' : 'NORMAL'} mode with logs at: ${a2aLogsDir}`);
};

// Allow TaskProcessor to explicitly check if the file transport is initialized
export function isA2AFileTransportInitialized(): boolean {
  return a2aFileTransportInitialized;
}

// Add compatibility methods to a2aLogger
// These are the methods that were used in the old code
a2aLogger.taskCreate = (taskId: string | null, message: string, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown';
  a2aLogger.info(`[A2A:TASK_CREATE][TASK:${normalizedTaskId}] ${message}`, { ...meta, taskId: normalizedTaskId });
  return a2aLogger;
};

a2aLogger.taskStatusChange = (taskId: string | null, oldState: string, newState: string, message: string, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown';
  a2aLogger.info(`[A2A:TASK_STATUS][TASK:${normalizedTaskId}] State: ${oldState} -> ${newState}. ${message}`, { ...meta, taskId: normalizedTaskId, oldState, newState });
  return a2aLogger;
};

a2aLogger.agentReceive = (agentName: string, taskId: string | null, messageType: string, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown';
  a2aLogger.debug(`[A2A:AGENT_RECEIVE][AGENT:${agentName}][TASK:${normalizedTaskId}] Received ${messageType}`, { ...meta, agentName, taskId: normalizedTaskId, messageType });
  return a2aLogger;
};

a2aLogger.agentProcess = (agentName: string, taskId: string | null, step: string, message: string, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown';
  a2aLogger.debug(`[A2A:AGENT_PROCESS][AGENT:${agentName}][TASK:${normalizedTaskId}][STEP:${step}] ${message}`, { ...meta, agentName, taskId: normalizedTaskId, step });
  return a2aLogger;
};

a2aLogger.agentSend = (agentName: string, taskId: string | null, recipient: string, messageType: string, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown';
  a2aLogger.debug(`[A2A:AGENT_SEND][AGENT:${agentName}][TASK:${normalizedTaskId}] Sending ${messageType} to ${recipient}`, { ...meta, agentName, taskId: normalizedTaskId, recipient, messageType });
  return a2aLogger;
};

a2aLogger.messageBusDelivery = (messageId: string, recipient: string, taskId: string | null, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown';
  a2aLogger.debug(`[A2A:MESSAGE_BUS][MSG_ID:${messageId}][TASK:${normalizedTaskId}] Delivering message to ${recipient}`, { ...meta, messageId, recipient, taskId: normalizedTaskId });
  return a2aLogger;
};

a2aLogger.sseEventSent = (taskId: string | null, eventType: string, eventData: any, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown';
  a2aLogger.debug(`[A2A:SSE_EVENT][TASK:${normalizedTaskId}] Sent ${eventType}`, { ...meta, taskId: normalizedTaskId, eventType, eventPayload: eventData });
  return a2aLogger;
};

a2aLogger.sseSubscription = (taskId: string | null, message: string, meta: Record<string, any> = {}) => {
  const normalizedTaskId = taskId || 'unknown';
  a2aLogger.info(`[A2A:SSE_SUB][TASK:${normalizedTaskId}] ${message}`, { ...meta, taskId: normalizedTaskId });
  return a2aLogger;
};

// Create specialized loggers for different parts of the application
const chatLogger = logger.child({ module: 'chat' });

// Add chat logger methods
chatLogger.start = (messageId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedMessageId = messageId || 'unknown-message';
  logger.debug(normalizedMessageId, `[CHAT:START][MSG:${normalizedMessageId}] ${message}`, { ...meta, chat: true });
  return chatLogger;
};

chatLogger.streamLog = (messageId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedMessageId = messageId || 'unknown-message';
  logger.debug(normalizedMessageId, `[CHAT:STREAM][MSG:${normalizedMessageId}] ${message}`, { ...meta, chat: true });
  return chatLogger;
};

chatLogger.tool = (messageId: StringOrNull, toolName: string, message: string, meta: Record<string, any> = {}) => {
  const normalizedMessageId = messageId || 'unknown-message';
  logger.debug(normalizedMessageId, `[CHAT:TOOL:${toolName}][MSG:${normalizedMessageId}] ${message}`, { ...meta, chat: true, tool: toolName });
  return chatLogger;
};

chatLogger.complete = (messageId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedMessageId = messageId || 'unknown-message';
  logger.info(normalizedMessageId, `[CHAT:COMPLETE][MSG:${normalizedMessageId}] ${message}`, { ...meta, chat: true });
  return chatLogger;
};

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
const scenePlannerLogger = logger.child({ module: 'scenePlanner' });
const buildLogger = logger.child({ module: 'build' });
// Add specialized loggers for different modules
const animationDesignerLogger = logger.child({ module: 'animationDesigner' });

// Store original Winston logger methods before overriding
const origBuildDebug = buildLogger.debug.bind(buildLogger);
const origBuildInfo = buildLogger.info.bind(buildLogger);
const origBuildWarn = buildLogger.warn.bind(buildLogger);
const origBuildError = buildLogger.error.bind(buildLogger);

// Compatibility for old buildLogger interface - now with properly typed methods
buildLogger.start = (jobId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedJobId = jobId || 'unknown-job';
  logger.debug(normalizedJobId, `[BUILD:START][JOB:${normalizedJobId}] ${message}`, { ...meta, build: true });
  return buildLogger;
};
buildLogger.compile = (jobId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedJobId = jobId || 'unknown-job';
  logger.debug(normalizedJobId, `[BUILD:COMPILE][JOB:${normalizedJobId}] ${message}`, { ...meta, build: true });
  return buildLogger;
};
buildLogger.upload = (jobId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedJobId = jobId || 'unknown-job';
  logger.debug(normalizedJobId, `[BUILD:UPLOAD][JOB:${normalizedJobId}] ${message}`, { ...meta, build: true });
  return buildLogger;
};
buildLogger.error = (jobId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedJobId = jobId || 'unknown-job';
  logger.error(normalizedJobId, `[BUILD:ERROR][JOB:${normalizedJobId}] ${message}`, { ...meta, build: true });
  return buildLogger;
};
buildLogger.warn = (jobId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedJobId = jobId || 'unknown-job';
  logger.warn(normalizedJobId, `[BUILD:WARN][JOB:${normalizedJobId}] ${message}`, { ...meta, build: true });
  return buildLogger;
};
buildLogger.complete = (jobId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedJobId = jobId || 'unknown-job';
  logger.info(normalizedJobId, `[BUILD:COMPLETE][JOB:${normalizedJobId}] ${message}`, { ...meta, build: true });
  return buildLogger;
};
buildLogger.debug = (jobId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedJobId = jobId || 'unknown-job';
  logger.debug(normalizedJobId, `[BUILD:DEBUG][JOB:${normalizedJobId}] ${message}`, { ...meta, build: true });
  return buildLogger;
};
buildLogger.info = (jobId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedJobId = jobId || 'unknown-job';
  logger.info(normalizedJobId, `[BUILD:INFO][JOB:${normalizedJobId}] ${message}`, { ...meta, build: true });
  return buildLogger;
};

// Store original Winston logger methods for scenePlannerLogger before overriding
const origScenePlannerDebug = scenePlannerLogger.debug.bind(scenePlannerLogger);
const origScenePlannerInfo = scenePlannerLogger.info.bind(scenePlannerLogger);
const origScenePlannerError = scenePlannerLogger.error.bind(scenePlannerLogger);

// Compatibility for old scenePlannerLogger interface
scenePlannerLogger.start = (planId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedPlanId = planId || 'unknown-plan';
  logger.debug(normalizedPlanId, `[PIPELINE:START][PLAN:${normalizedPlanId}] ${message}`, { ...meta, scenePlanner: true });
  return scenePlannerLogger;
};
scenePlannerLogger.adb = (planId: StringOrNull, sceneId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedPlanId = planId || 'unknown-plan';
  const normalizedSceneId = sceneId || 'unknown-scene';
  logger.debug(normalizedPlanId, `[PIPELINE:ADB][PLAN:${normalizedPlanId}][SCENE:${normalizedSceneId}] ${message}`, { ...meta, scenePlanner: true });
  return scenePlannerLogger;
};
scenePlannerLogger.component = (planId: StringOrNull, sceneId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedPlanId = planId || 'unknown-plan';
  const normalizedSceneId = sceneId || 'unknown-scene';
  logger.debug(normalizedPlanId, `[PIPELINE:COMPONENT][PLAN:${normalizedPlanId}][SCENE:${normalizedSceneId}] ${message}`, { ...meta, scenePlanner: true });
  return scenePlannerLogger;
};
scenePlannerLogger.db = (planId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedPlanId = planId || 'unknown-plan';
  logger.debug(normalizedPlanId, `[PIPELINE:DB][PLAN:${normalizedPlanId}] ${message}`, { ...meta, scenePlanner: true });
  return scenePlannerLogger;
};
scenePlannerLogger.error = (planId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedPlanId = planId || 'unknown-plan';
  logger.error(normalizedPlanId, `[PIPELINE:ERROR][PLAN:${normalizedPlanId}] ${message}`, { ...meta, scenePlanner: true });
  return scenePlannerLogger;
};
scenePlannerLogger.complete = (planId: StringOrNull, message: string, meta: Record<string, any> = {}) => {
  const normalizedPlanId = planId || 'unknown-plan';
  logger.info(normalizedPlanId, `[PIPELINE:COMPLETE][PLAN:${normalizedPlanId}] ${message}`, { ...meta, scenePlanner: true });
  return scenePlannerLogger;
};

// Export all the specialized loggers
export {
  logger,
  a2aLogger,
  componentsLogger,
  chatLogger,
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
  scenePlannerLogger,
  buildLogger,
  animationDesignerLogger,
};

// Make `logger` the default export
export default logger;