import type { OpenAPIV3 } from 'openapi-types';

import { SchemaValidationError, UnsupportedSchemaError } from './errors.js';
import { createFunctionName, deriveSdkName, toTypeName } from './naming.js';
import { resolveLocalComponent, resolveSchema } from './resolver.js';
import type {
  HttpMethod,
  OpenApiDocument,
  ParsedDocument,
  ParsedOperation,
  ParsedParameter,
  ParsedRequestBody,
  ParsedResponse,
  SchemaLike,
} from './types.js';

const SUPPORTED_METHODS: readonly HttpMethod[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
];

function getParameterSchema(
  document: OpenApiDocument,
  parameter: OpenAPIV3.ParameterObject,
): SchemaLike {
  if (!parameter.schema) {
    throw new UnsupportedSchemaError(
      `Parameter "${parameter.name}" in "${parameter.in}" is missing schema definition.`,
    );
  }

  resolveSchema(document, parameter.schema);
  return parameter.schema;
}

function dereferenceParameter(
  document: OpenApiDocument,
  parameter: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject,
): OpenAPIV3.ParameterObject {
  if (!parameter || typeof parameter !== 'object') {
    throw new SchemaValidationError('Invalid parameter: expected an object.');
  }
  if (!('$ref' in parameter)) {
    return parameter;
  }

  return resolveLocalComponent(parameter, document.components?.parameters, 'parameters');
}

function extractParameters(
  document: OpenApiDocument,
  parameters: Array<OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject> | undefined,
): ParsedParameter[] {
  return (parameters ?? [])
    .map((parameter) => dereferenceParameter(document, parameter))
    .filter((parameter) => {
      if (parameter.in !== 'path' && parameter.in !== 'query') {
        throw new UnsupportedSchemaError(
          `Unsupported ${parameter.in} parameter "${parameter.name}". Only path and query parameters are supported.`,
        );
      }
      return true;
    })
    .map((parameter) => ({
      allowReserved: parameter.allowReserved,
      description: parameter.description,
      explode: parameter.explode,
      style: parameter.style,
      in: parameter.in === 'path' ? 'path' : 'query',
      name: parameter.name,
      required: parameter.in === 'path' ? true : (parameter.required ?? false),
      schema: getParameterSchema(document, parameter),
    }));
}

function mergeParameters(
  document: OpenApiDocument,
  pathParameters: Array<OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject> | undefined,
  operationParameters: Array<OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject> | undefined,
): ParsedParameter[] {
  const merged = new Map<string, ParsedParameter>();

  for (const parameter of extractParameters(document, pathParameters)) {
    merged.set(`${parameter.in}:${parameter.name}`, parameter);
  }

  for (const parameter of extractParameters(document, operationParameters)) {
    merged.set(`${parameter.in}:${parameter.name}`, parameter);
  }

  return [...merged.values()];
}

function getJsonContent<TContent>(container: { content?: Record<string, TContent> }): {
  contentType: string;
  value: TContent;
} | null {
  const content = container.content ?? {};
  const entries = Object.entries(content);

  for (const [contentType, value] of entries) {
    if (contentType === 'application/json' || contentType.endsWith('+json')) {
      return { contentType, value };
    }
  }

  return null;
}

function extractRequestBody(
  document: OpenApiDocument,
  requestBody: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject | undefined,
): ParsedRequestBody | undefined {
  if (!requestBody) {
    return undefined;
  }

  const resolved = '$ref' in requestBody ? resolveRequestBody(document, requestBody) : requestBody;
  const jsonContent = getJsonContent(resolved);

  if (!jsonContent) {
    throw new UnsupportedSchemaError('Only JSON request bodies are supported.');
  }

  if (!jsonContent.value || typeof jsonContent.value !== 'object') {
    throw new SchemaValidationError(
      `Invalid ${jsonContent.contentType} request body: expected an object.`,
    );
  }
  const schema = jsonContent.value.schema;

  if (!schema) {
    throw new UnsupportedSchemaError('JSON request body must include a schema.');
  }

  return {
    contentType: jsonContent.contentType,
    required: resolved.required ?? false,
    schema,
  };
}

function resolveRequestBody(
  document: OpenApiDocument,
  requestBody: OpenAPIV3.ReferenceObject,
): OpenAPIV3.RequestBodyObject {
  return resolveLocalComponent(requestBody, document.components?.requestBodies, 'requestBodies');
}

function extractResponses(operation: OpenAPIV3.OperationObject): Array<{
  response: OpenAPIV3.ReferenceObject | OpenAPIV3.ResponseObject;
  statusCode: string;
}> {
  const entries = Object.entries(operation.responses ?? {});
  const successfulEntries = entries.filter(([status]) => /^2(?:\d\d|XX)$/i.test(status));
  if (successfulEntries.length === 0) {
    const fallback = entries.find(([status]) => status === 'default');
    if (fallback) successfulEntries.push(fallback);
  }

  if (successfulEntries.length === 0) {
    throw new SchemaValidationError(
      'Operation must declare a successful response (2xx or default).',
    );
  }
  return successfulEntries
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([statusCode, response]) => ({ response, statusCode }));
}

function resolveResponse(
  document: OpenApiDocument,
  response: OpenAPIV3.ReferenceObject | OpenAPIV3.ResponseObject,
): OpenAPIV3.ResponseObject {
  if (!('$ref' in response)) {
    return response;
  }

  return resolveLocalComponent(response, document.components?.responses, 'responses');
}

function parseResponse(
  document: OpenApiDocument,
  response: OpenAPIV3.ReferenceObject | OpenAPIV3.ResponseObject,
  statusCode: string,
): ParsedResponse {
  const resolved = resolveResponse(document, response);
  if (Object.keys(resolved.content ?? {}).length > 1) {
    throw new UnsupportedSchemaError(
      `Multiple response media types for status ${statusCode} are unsupported.`,
    );
  }
  const jsonContent = getJsonContent(resolved);

  if (jsonContent) {
    if (!jsonContent.value || typeof jsonContent.value !== 'object') {
      throw new SchemaValidationError(
        `Invalid ${jsonContent.contentType} response: expected an object.`,
      );
    }
    return {
      contentType: jsonContent.contentType,
      description: resolved.description,
      schema: jsonContent.value.schema,
      statusCode,
    };
  }

  const content = resolved.content ?? {};
  if (content['text/plain']) {
    return {
      contentType: 'text/plain',
      description: resolved.description,
      schema: { type: 'string' },
      statusCode,
    };
  }
  if (content['application/octet-stream']) {
    return {
      binary: true,
      contentType: 'application/octet-stream',
      description: resolved.description,
      statusCode,
    };
  }
  if (Object.keys(content).length > 0) {
    throw new UnsupportedSchemaError(
      `Unsupported response content type for status ${statusCode}: ${Object.keys(content).join(', ')}.`,
    );
  }

  return {
    description: resolved.description,
    statusCode,
  };
}

function hasRequiredRequestFields(
  parameters: ParsedParameter[],
  requestBody?: ParsedRequestBody,
): boolean {
  return parameters.some((parameter) => parameter.required) || Boolean(requestBody?.required);
}

export function parseDocument(
  document: OpenApiDocument,
  options: {
    baseUrl?: string;
    sdkName?: string;
  } = {},
): ParsedDocument {
  const operations: ParsedOperation[] = [];
  const functionNames = new Set<string>();
  const typeNames = new Set<string>([
    'ClientConfig',
    'ApiError',
    `${deriveSdkName(options.sdkName ?? document.info.title)}Client`,
  ]);
  const allocateName = (used: Set<string>, base: string): string => {
    let name = base;
    let suffix = 2;
    while (used.has(name)) name = `${base}${suffix++}`;
    used.add(name);
    return name;
  };
  const componentTypeNames: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const name of Object.keys(document.components?.schemas ?? {}).sort()) {
    componentTypeNames[name] = allocateName(typeNames, toTypeName(name));
  }

  for (const [pathKey, pathItem] of Object.entries(document.paths ?? {}).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )) {
    if (!pathItem || '$ref' in pathItem) {
      throw new UnsupportedSchemaError(`Path-level $ref is not supported for path "${pathKey}".`);
    }

    if (pathItem.trace) {
      throw new UnsupportedSchemaError('TRACE operations are not supported by the Fetch API.');
    }
    for (const method of SUPPORTED_METHODS) {
      const operation = pathItem[method];

      if (!operation) {
        continue;
      }

      const functionName = allocateName(
        functionNames,
        createFunctionName(method, pathKey, operation.operationId),
      );
      const requestTypeName = allocateName(typeNames, `${toTypeName(functionName)}Request`);
      const responseTypeName = allocateName(typeNames, `${toTypeName(functionName)}Response`);
      const mergedParameters = mergeParameters(document, pathItem.parameters, operation.parameters);
      const queryParameters = mergedParameters.filter((parameter) => parameter.in === 'query');
      const extractedPathParameters = mergedParameters.filter(
        (parameter) => parameter.in === 'path',
      );
      const requestBody = extractRequestBody(document, operation.requestBody);
      const responses = extractResponses(operation).map(({ response, statusCode }) =>
        parseResponse(document, response, statusCode),
      );
      const response = responses[0];
      const requestNames = new Set<string>();
      for (const parameter of mergedParameters) {
        if (requestNames.has(parameter.name) || (parameter.name === 'body' && requestBody)) {
          throw new UnsupportedSchemaError(
            `Request field "${parameter.name}" collides in ${method.toUpperCase()} ${pathKey}.`,
          );
        }
        requestNames.add(parameter.name);
        if (parameter.in === 'query') {
          const schema = resolveSchema(document, parameter.schema);
          const style = parameter.style ?? 'form';
          if (
            parameter.allowReserved ||
            (style !== 'form' && parameter.explode === true) ||
            schema.type === 'object' ||
            schema.properties ||
            !['form', 'spaceDelimited', 'pipeDelimited'].includes(style)
          ) {
            throw new UnsupportedSchemaError(
              `Unsupported query serialization for "${parameter.name}": ${style}.`,
            );
          }
        } else {
          const schema = resolveSchema(document, parameter.schema);
          if (
            (parameter.style && parameter.style !== 'simple') ||
            parameter.explode === true ||
            schema.type === 'array' ||
            schema.type === 'object' ||
            schema.properties
          ) {
            throw new UnsupportedSchemaError(
              `Unsupported path serialization for "${parameter.name}". Only simple primitive path values are supported.`,
            );
          }
        }
      }
      for (const match of pathKey.matchAll(/\{([^}]+)\}/g)) {
        if (!extractedPathParameters.some((parameter) => parameter.name === match[1])) {
          throw new SchemaValidationError(
            `Missing path parameter "${match[1]}" in ${method.toUpperCase()} ${pathKey}.`,
          );
        }
      }
      const hasRequestShape =
        extractedPathParameters.length + queryParameters.length > 0 || Boolean(requestBody);

      operations.push({
        description: operation.description,
        functionName,
        hasRequiredRequestFields: hasRequiredRequestFields(mergedParameters, requestBody),
        hasRequestShape,
        method,
        operationId: operation.operationId,
        path: pathKey,
        pathParameters: extractedPathParameters,
        queryParameters,
        requestBody,
        requestTypeName,
        response,
        responses,
        responseTypeName,
        summary: operation.summary,
      });
    }
  }

  const sdkName = deriveSdkName(options.sdkName ?? document.info.title);
  const defaultBaseUrl = options.baseUrl ?? document.servers?.[0]?.url;

  return {
    componentSchemas: document.components?.schemas ?? {},
    componentTypeNames,
    defaultBaseUrl,
    document,
    operations,
    sdkName,
  };
}
