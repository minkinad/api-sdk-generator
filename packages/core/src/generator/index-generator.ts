export function generateIndexSource(): string {
  return ["export * from './types.js';", "export * from './client.js';", ''].join('\n');
}
