import type { HttpMethod } from './types.js';

const RESERVED_WORDS = new Set([
  'default',
  'function',
  'class',
  'switch',
  'case',
  'var',
  'const',
  'let',
  'new',
  'delete',
  'return',
]);

function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function toPascalCase(input: string): string {
  const words = splitWords(input);
  const pascal = words.map((word) => capitalize(word.toLowerCase())).join('');
  return pascal || 'GeneratedType';
}

export function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function sanitizeIdentifier(input: string): string {
  const camel = toCamelCase(input).replace(/[^A-Za-z0-9_$]/g, '');
  const normalized = camel.match(/^[A-Za-z_$]/) ? camel : `_${camel}`;
  return RESERVED_WORDS.has(normalized) ? `${normalized}Value` : normalized;
}

export function toTypeName(input: string): string {
  const pascal = toPascalCase(input).replace(/[^A-Za-z0-9_$]/g, '');
  return pascal.match(/^[A-Za-z_$]/) ? pascal : `T${pascal}`;
}

export function toPropertyAccessor(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

export function createFunctionName(method: HttpMethod, path: string, operationId?: string): string {
  if (operationId) {
    return sanitizeIdentifier(operationId);
  }

  const segments = path.split('/').filter(Boolean);
  const pieces: string[] = [method.toLowerCase()];
  const paramNames: string[] = [];

  for (const segment of segments) {
    const match = segment.match(/^\{(.+)\}$/);

    if (match) {
      paramNames.push(toPascalCase(match[1]));
      continue;
    }

    pieces.push(toPascalCase(segment));
  }

  if (paramNames.length > 0) {
    pieces.push(`By${paramNames.join('And')}`);
  }

  return sanitizeIdentifier(pieces.join(' '));
}

export function deriveSdkName(input?: string): string {
  return input ? toTypeName(input) : 'GeneratedSdk';
}
