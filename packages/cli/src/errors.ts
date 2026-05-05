export class CliUsageError extends Error {
  public readonly exitCode: number;

  public constructor(message: string, exitCode = 1) {
    super(message);
    this.name = 'CliUsageError';
    this.exitCode = exitCode;
  }
}
