export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  correlationId?: string;
}

class Logger {
  private format(level: LogLevel, message: string, context?: Record<string, any>, correlationId?: string): string {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(correlationId ? { correlationId } : {}),
      ...(context ? { context } : {}),
    };

    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(entry);
    }

    const colorMap: Record<LogLevel, string> = {
      DEBUG: '\x1b[34m', // Blue
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    const ctxStr = context ? ` ${JSON.stringify(context)}` : '';
    const corrStr = correlationId ? ` [corr:${correlationId}]` : '';
    return `${entry.timestamp} ${colorMap[level]}[${level}]${reset}${corrStr} ${message}${ctxStr}`;
  }

  debug(message: string, context?: Record<string, any>, correlationId?: string) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.format('DEBUG', message, context, correlationId));
    }
  }

  info(message: string, context?: Record<string, any>, correlationId?: string) {
    console.log(this.format('INFO', message, context, correlationId));
  }

  warn(message: string, context?: Record<string, any>, correlationId?: string) {
    console.warn(this.format('WARN', message, context, correlationId));
  }

  error(message: string, context?: Record<string, any>, correlationId?: string) {
    console.error(this.format('ERROR', message, context, correlationId));
  }
}

export const logger = new Logger();
