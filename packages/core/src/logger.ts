export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export interface CreateLoggerOptions {
  sink?: Pick<typeof console, 'info' | 'warn' | 'error'>;
  verbose?: boolean;
}

class NoopLogger implements Logger {
  public info(): void {}

  public warn(): void {}

  public error(): void {}

  public debug(): void {}
}

export const noopLogger: Logger = new NoopLogger();

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const sink = options.sink ?? console;
  const verbose = options.verbose ?? false;

  return {
    debug(message: string): void {
      if (verbose) {
        sink.info(message);
      }
    },
    error(message: string): void {
      sink.error(message);
    },
    info(message: string): void {
      sink.info(message);
    },
    warn(message: string): void {
      sink.warn(message);
    },
  };
}
