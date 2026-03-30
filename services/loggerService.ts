
/**
 * FAANG-Level Structured Logging Utility
 * Principle: Logs should be machine-readable (JSON) and include context.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  private serviceName: string = 'XeroxStream-Frontend';

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...context,
    };

    // In production, this would go to a centralized logging service (e.g., Cloud Logging)
    const logString = JSON.stringify(logEntry);
    
    switch (level) {
      case 'INFO':
        console.info(logString);
        break;
      case 'WARN':
        console.warn(logString);
        break;
      case 'ERROR':
        console.error(logString);
        break;
      case 'DEBUG':
        console.debug(logString);
        break;
    }
  }

  public info(message: string, context?: LogContext) {
    this.log('INFO', message, context);
  }

  public warn(message: string, context?: LogContext) {
    this.log('WARN', message, context);
  }

  public error(message: string, context?: LogContext) {
    this.log('ERROR', message, context);
  }

  public debug(message: string, context?: LogContext) {
    this.log('DEBUG', message, context);
  }
}

export const logger = Logger.getInstance();
