import type { OpenAPIV3 } from 'openapi-types';

import { SchemaValidationError, UnsupportedSchemaError } from './errors.js';
import { createFunctionName, deriveSdkName, toTypeName } from './naming.js';
import { isReferenceObject, resolveSchema } from './resolver.js';
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

const SUPPORTED_METHODS: readonly HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'] as const;

function getParameterSchema(
  document: OpenApiDocument,
  parameter: OpenAPIV3.ParameterObject,
): SchemaLike {
  if (!parameter.schema) {
    throw new UnsupportedSchemaError(
      `Parameter "${parameter.name}" in "${parameter.in}" is missing schema definition.`,
    );
  }

  return isReferenceObject(parameter.schema)
    ? resolveSchema(document, parameter.schema)
    : parameter.schema;
}

function dereferenceParameter(
  document: OpenApiDocument,
  parameter: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject,
): OpenAPIV3.ParameterObject {
  if (!('$ref' in parameter)) {
    return parameter;
  }

  const prefix = '#/components/parameters/';

  if (!parameter.$ref.startsWith(prefix)) {
    throw new SchemaValidationError(`Unsupported parameter reference "${parameter.$ref}".`);
  }

  const parameterName = parameter.$ref.slice(prefix.length);
  const resolved = document.components?.parameters?.[parameterName];

  if (!resolved || '$ref' in resolved) {
    throw new SchemaValidationError(`Unable to resolve parameter reference "${parameter.$ref}".`);
  }

  return resolved;
}

function extractParameters(
  document: OpenApiDocument,
  parameters: Array<OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject> | undefined,
): ParsedParameter[] {
  return (parameters ?? [])
    .map((parameter) => dereferenceParameter(document, parameter))
    .filter((parameter) => parameter.in === 'path' || parameter.in === 'query')
    .map((parameter) => ({
      description: parameter.description,
      in: parameter.in === 'path' ? 'path' : 'query',
      name: parameter.name,
      required: parameter.in === 'path' ? true : (parameter.required ?? false),
      schema: getParameterSchema(document, parameter),
    }));
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
  const prefix = '#/components/requestBodies/';

  if (!requestBody.$ref.startsWith(prefix)) {
    throw new SchemaValidationError(`Unsupported requestBody reference "${requestBody.$ref}".`);
  }

  const name = requestBody.$ref.slice(prefix.length);
  const resolved = document.components?.requestBodies?.[name];

  if (!resolved || '$ref' in resolved) {
    throw new SchemaValidationError(
      `Unable to resolve requestBody reference "${requestBody.$ref}".`,
    );
  }

  return resolved;
}

function extractResponse(operation: OpenAPIV3.OperationObject): {
  response: OpenAPIV3.ReferenceObject | OpenAPIV3.ResponseObject;
  statusCode: string;
} {
  const entries = Object.entries(operation.responses ?? {});
  const successfulEntry = entries.find(([status]) => /^2\d\d$/.test(status)) ?? entries[0];

  if (!successfulEntry) {
    return {
      response: {
        description: 'No content',
      },
      statusCode: '204',
    };
  }

  return {
    response: successfulEntry[1],
    statusCode: successfulEntry[0],
  };
}

function resolveResponse(
  document: OpenApiDocument,
  response: OpenAPIV3.ReferenceObject | OpenAPIV3.ResponseObject,
): OpenAPIV3.ResponseObject {
  if (!('$ref' in response)) {
    return response;
  }

  const prefix = '#/components/responses/';

  if (!response.$ref.startsWith(prefix)) {
    throw new SchemaValidationError(`Unsupported response reference "${response.$ref}".`);
  }

  const name = response.$ref.slice(prefix.length);
  const resolved = document.components?.responses?.[name];

  if (!resolved || '$ref' in resolved) {
    throw new SchemaValidationError(`Unable to resolve response reference "${response.$ref}".`);
  }

  return resolved;
}

function parseResponse(
  document: OpenApiDocument,
  operation: OpenAPIV3.OperationObject,
): ParsedResponse {
  const { response, statusCode } = extractResponse(operation);
  const resolved = resolveResponse(document, response);
  const jsonContent = getJsonContent(resolved);

  return {
    contentType: jsonContent?.contentType,
    description: resolved.description,
    schema: jsonContent?.value.schema,
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

  for (const [pathKey, pathItem] of Object.entries(document.paths ?? {})) {
    if (!pathItem || '$ref' in pathItem) {
      throw new UnsupportedSchemaError(`Path-level $ref is not supported for path "${pathKey}".`);
    }

    for (const method of SUPPORTED_METHODS) {
      const operation = pathItem[method];

      if (!operation) {
        continue;
      }

      const functionName = createFunctionName(method, pathKey, operation.operationId);
      const requestTypeName = `${toTypeName(functionName)}Request`;
      const responseTypeName = `${toTypeName(functionName)}Response`;
      const pathParameters = extractParameters(document, [
        ...(pathItem.parameters ?? []),
        ...(operation.parameters ?? []),
      ]).filter((parameter, index, all) => {
        return (
          all.findIndex(
            (candidate) => candidate.in === parameter.in && candidate.name === parameter.name,
          ) === index
        );
      });
      const queryParameters = pathParameters.filter((parameter) => parameter.in === 'query');
      const extractedPathParameters = pathParameters.filter((parameter) => parameter.in === 'path');
      const requestBody = extractRequestBody(document, operation.requestBody);
      const response = parseResponse(document, operation);
      const hasRequestShape =
        extractedPathParameters.length + queryParameters.length > 0 || Boolean(requestBody);

      operations.push({
        description: operation.description,
        functionName,
        hasRequiredRequestFields: hasRequiredRequestFields(pathParameters, requestBody),
        hasRequestShape,
        method,
        operationId: operation.operationId,
        path: pathKey,
        pathParameters: extractedPathParameters,
        queryParameters,
        requestBody,
        requestTypeName,
        response,
        responseTypeName,
        summary: operation.summary,
      });
    }
  }

  const sdkName = deriveSdkName(options.sdkName ?? document.info.title);
  const defaultBaseUrl = options.baseUrl ?? document.servers?.[0]?.url;

  return {
    componentSchemas: document.components?.schemas ?? {},
    defaultBaseUrl,
    document,
    operations,
    sdkName,
  };
}
