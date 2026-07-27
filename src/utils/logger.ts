/**
 * Centralized logger for consistent error/warning logging across services.
 * Provides standardized formatting and optional remote logging.
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Logger utility for consistent logging across the application.
 *
 * Usage:
 * ```typescript
 * const logger = new Logger('MyService');
 * logger.error('Something went wrong', error);
 * logger.warn('Deprecated feature used');
 * logger.info('Operation completed');
 * ```
 */
export class Logger {
  private static production = false;

  constructor(private readonly tag: string) {}

  static setProduction(value: boolean): void {
    Logger.production = value;
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  debug(message: string, data?: unknown): void {
    if (!Logger.production) {
      this.log('debug', message, data);
    }
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    // In development, log to console; always log errors
    if (!Logger.production || level === 'error') {
      const prefix = `[${this.tag}]`;
      switch (level) {
        case 'error':
          console.error(prefix, message, data ?? '');
          break;
        case 'warn':
          console.warn(prefix, message, data ?? '');
          break;
        case 'info':
          console.info(prefix, message, data ?? '');
          break;
        case 'debug':
          console.debug(prefix, message, data ?? '');
          break;
      }
    }

    // Could be extended to send to remote logging service in production
    // if (level === 'error' && Logger.production) {
    //   remoteLogger.log({ level, tag: this.tag, message, data, timestamp: Date.now() });
    // }
  }
}

/**
 * Creates a logger instance for a given service name.
 *
 * @example
 * const log = createLogger('AuthService');
 * log.error('Login failed', error);
 */
export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}
