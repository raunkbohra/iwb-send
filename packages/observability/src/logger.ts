/**
 * Structured JSON logger for CloudWatch compatibility
 * Follows AWS Lambda Powertools and Pino patterns
 */

interface LogContext {
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};

  constructor(private serviceName: string) {}

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const child = new Logger(this.serviceName);
    child.context = { ...this.context, ...context };
    return child;
  }

  /**
   * Log at info level
   */
  info(message: string, data?: Record<string, unknown>) {
    this.log('INFO', message, data);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error | unknown, data?: Record<string, unknown>) {
    const errorData = error instanceof Error ? { error: error.message, stack: error.stack } : {};
    this.log('ERROR', message, { ...errorData, ...data });
  }

  /**
   * Log at warning level
   */
  warn(message: string, data?: Record<string, unknown>) {
    this.log('WARN', message, data);
  }

  /**
   * Log at debug level
   */
  debug(message: string, data?: Record<string, unknown>) {
    if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
      this.log('DEBUG', message, data);
    }
  }

  private log(level: string, message: string, data?: Record<string, unknown>) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...this.context,
      ...data,
    };

    // Write as JSON to stdout (CloudWatch will parse it)
    console.log(JSON.stringify(entry));
  }
}

/**
 * Create a logger instance for a service
 */
export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}

// Export singleton instance
export const logger = createLogger('iwb-send');
