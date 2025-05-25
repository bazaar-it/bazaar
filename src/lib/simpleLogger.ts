//src/lib/simpleLogger.ts

// Simple production-safe logger that doesn't create files or directories
// This replaces the complex winston logger for production use

interface SimpleLogger {
  info: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
  child: (meta: any) => SimpleLogger;
}

const createSimpleLogger = (defaultMeta: any = {}): SimpleLogger => {
  const formatMessage = (level: string, message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify({ ...defaultMeta, ...meta })}` : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
  };

  return {
    info: (message: string, meta?: any) => {
      console.log(formatMessage('info', message, meta));
    },
    error: (message: string, meta?: any) => {
      console.error(formatMessage('error', message, meta));
    },
    warn: (message: string, meta?: any) => {
      console.warn(formatMessage('warn', message, meta));
    },
    debug: (message: string, meta?: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(formatMessage('debug', message, meta));
      }
    },
    child: (childMeta: any) => {
      return createSimpleLogger({ ...defaultMeta, ...childMeta });
    }
  };
};

// Create the main logger
const logger = createSimpleLogger();

// Create specialized loggers
export const chatLogger = logger.child({ module: 'chat' });
export const apiLogger = logger.child({ module: 'api' });

// Export the main logger as default
export default logger; 