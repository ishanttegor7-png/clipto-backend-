type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

class Logger {
  private format(level: LogLevel, message: string, context?: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const tag = context ? `[${context}]` : '[Clipto]';
    return `${timestamp} ${level} ${tag} ${message}`;
  }

  info(message: string, context?: string, meta?: any) {
    console.log(this.format('INFO', message, context), meta !== undefined ? meta : '');
  }

  warn(message: string, context?: string, meta?: any) {
    console.warn(this.format('WARN', message, context), meta !== undefined ? meta : '');
  }

  error(message: string, context?: string, error?: any) {
    console.error(this.format('ERROR', message, context), error !== undefined ? error : '');
  }

  debug(message: string, context?: string, meta?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.format('DEBUG', message, context), meta !== undefined ? meta : '');
    }
  }
}

export const logger = new Logger();
