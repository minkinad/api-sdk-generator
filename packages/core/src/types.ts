import type { OpenAPIV3 } from 'openapi-types';

import type { Logger } from './logger.js';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

export type OpenApiDocument = OpenAPIV3.Document & {
  openapi: string;
};

export type SchemaLike = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

export interface GenerateSdkInput {
  file?: string;
  url?: string;
}

export interface GenerateSdkOptions {
  input: GenerateSdkInput;
  outputDir: string;
  sdkName?: string;
  baseUrl?: string;
  clean?: boolean;
  /** Generate and format files without writing them. */
  dryRun?: boolean;
  /** Compare generated files with disk without writing them. */
  check?: boolean;
  fetchImplementation?: typeof fetch;
  logger?: Logger;
}

export interface GeneratedFile {
  content: string;
  path: string;
}

export interface GenerateSdkResult {
  /** Missing or outdated files, populated in check mode. */
  changedFiles: string[];
  files: GeneratedFile[];
  operations: number;
  outputDir: string;
  sdkName: string;
}

export interface ParsedParameter {
  explode?: boolean;
  style?: string;
  description?: string;
  in: 'path' | 'query';
  name: string;
  required: boolean;
  schema: SchemaLike;
}

export interface ParsedRequestBody {
  contentType: string;
  required: boolean;
  schema: SchemaLike;
}

export interface ParsedResponse {
  contentType?: string;
  description?: string;
  schema?: SchemaLike;
  statusCode: string;
}

export interface ParsedOperation {
  description?: string;
  functionName: string;
  hasRequiredRequestFields: boolean;
  hasRequestShape: boolean;
  method: HttpMethod;
  operationId?: string;
  path: string;
  pathParameters: ParsedParameter[];
  queryParameters: ParsedParameter[];
  requestBody?: ParsedRequestBody;
  requestTypeName: string;
  response: ParsedResponse;
  responseTypeName: string;
  summary?: string;
}

export interface ParsedDocument {
  componentSchemas: Record<string, SchemaLike>;
  defaultBaseUrl?: string;
  document: OpenApiDocument;
  operations: ParsedOperation[];
  sdkName: string;
}
