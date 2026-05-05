export function generateIndexSource(): string {
  return ["export * from './types';", "export * from './client';", ''].join('\n');
}
