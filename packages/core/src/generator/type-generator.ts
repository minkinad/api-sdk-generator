import type { OpenAPIV3 } from 'openapi-types';

import { UnsupportedSchemaError } from '../errors.js';
import { toPropertyAccessor, toTypeName } from '../naming.js';
import { getReferenceName, isReferenceObject, resolveSchema } from '../resolver.js';
import type { OpenApiDocument, ParsedDocument, ParsedOperation, SchemaLike } from '../types.js';
import { isSchemaObject } from '../validator.js';

interface TypeRenderContext {
  document: OpenApiDocument;
  componentTypeNames: Record<string, string>;
}

function quoteEnumValue(value: string | number | boolean | null): string {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

function normalizeNullable(rendered: string, schema: OpenAPIV3.SchemaObject): string {
  return schema.nullable ? `${rendered} | null` : rendered;
}

function renderObjectType(schema: OpenAPIV3.SchemaObject, context: TypeRenderContext): string {
  const required = new Set(schema.required ?? []);
  const properties = schema.properties ?? {};
  const propertyEntries = Object.entries(properties);

  if (propertyEntries.length === 0) {
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      return `Record<string, ${renderSchema(schema.additionalProperties, context)}>`;
    }

    return schema.additionalProperties === false
      ? 'Record<string, never>'
      : 'Record<string, unknown>';
  }

  const lines = propertyEntries.map(([name, propertySchema]) => {
    const propertyType = renderSchema(propertySchema, context);
    const optionalToken = required.has(name) ? '' : '?';
    return `  ${toPropertyAccessor(name)}${optionalToken}: ${propertyType};`;
  });

  const objectType = ['{', ...lines, '}'].join('\n');
  if (schema.additionalProperties) {
    const valueType =
      schema.additionalProperties === true
        ? 'unknown'
        : renderSchema(schema.additionalProperties, context);
    return `${objectType} & Record<string, ${valueType}>`;
  }
  return objectType;
}

export function renderSchema(schema: SchemaLike, context: TypeRenderContext): string {
  if (isReferenceObject(schema)) {
    resolveSchema(context.document, schema);
    return (
      context.componentTypeNames[getReferenceName(schema.$ref)] ??
      toTypeName(getReferenceName(schema.$ref))
    );
  }

  if ('not' in schema && schema.not) {
    throw new UnsupportedSchemaError('OpenAPI not schemas are unsupported.');
  }
  if ('const' in schema) {
    throw new UnsupportedSchemaError('OpenAPI 3.1 const schemas are unsupported.');
  }

  if (schema.enum && schema.enum.length > 0) {
    return normalizeNullable(schema.enum.map(quoteEnumValue).join(' | '), schema);
  }

  // OpenAPI 3.1 uses JSON Schema type arrays, which are absent from the
  // OpenAPI 3.0 declarations provided by openapi-types.
  const rawType: unknown = schema.type;
  if (Array.isArray(rawType)) {
    if (
      rawType.length === 0 ||
      rawType.some(
        (type) =>
          !['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'].includes(
            type as string,
          ),
      )
    ) {
      throw new UnsupportedSchemaError('Unsupported OpenAPI 3.1 schema type array.');
    }
    return [...new Set(rawType as string[])]
      .map((type) =>
        type === 'null'
          ? 'null'
          : renderSchema({ ...schema, type, nullable: false } as OpenAPIV3.SchemaObject, context),
      )
      .join(' | ');
  }
  if (rawType === 'null') return 'null';

  if (schema.oneOf && schema.oneOf.length > 0) {
    return normalizeNullable(
      schema.oneOf.map((item) => renderSchema(item, context)).join(' | '),
      schema,
    );
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    return normalizeNullable(
      schema.anyOf.map((item) => `(${renderSchema(item, context)})`).join(' | '),
      schema,
    );
  }

  if (schema.allOf && schema.allOf.length > 0) {
    return normalizeNullable(
      schema.allOf.map((item) => `(${renderSchema(item, context)})`).join(' & '),
      schema,
    );
  }

  if (schema.type === 'array') {
    if (!schema.items) {
      throw new UnsupportedSchemaError('Array schema must define items.');
    }

    return normalizeNullable(`Array<${renderSchema(schema.items, context)}>`, schema);
  }

  if (schema.type === 'object' || schema.properties || schema.additionalProperties) {
    return normalizeNullable(renderObjectType(schema, context), schema);
  }

  if (schema.type === 'string') {
    return normalizeNullable('string', schema);
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    return normalizeNullable('number', schema);
  }

  if (schema.type === 'boolean') {
    return normalizeNullable('boolean', schema);
  }

  return 'unknown';
}

function renderNamedSchemaExport(
  name: string,
  schema: SchemaLike,
  context: TypeRenderContext,
): string {
  const typeName = context.componentTypeNames[name] ?? toTypeName(name);
  if (isReferenceObject(schema)) {
    return `export type ${typeName} = ${renderSchema(schema, context)};`;
  }

  const resolved = resolveSchema(context.document, schema);

  const rendered = renderSchema(resolved, context);
  if (
    rendered.startsWith('{') &&
    rendered.endsWith('}') &&
    !resolved.nullable &&
    !resolved.allOf &&
    !resolved.oneOf &&
    !resolved.anyOf &&
    !resolved.additionalProperties
  ) {
    return `export interface ${typeName} ${rendered}`;
  }

  return `export type ${typeName} = ${rendered};`;
}

function createRequestSchema(operation: ParsedOperation): OpenAPIV3.SchemaObject | undefined {
  const properties: Record<string, SchemaLike> = Object.create(null) as Record<string, SchemaLike>;
  const required: string[] = [];

  for (const parameter of [...operation.pathParameters, ...operation.queryParameters]) {
    properties[parameter.name] = parameter.schema;
    if (parameter.required) {
      required.push(parameter.name);
    }
  }

  if (operation.requestBody) {
    properties.body = operation.requestBody.schema;
    if (operation.requestBody.required) {
      required.push('body');
    }
  }

  if (Object.keys(properties).length === 0) {
    return undefined;
  }

  return {
    properties,
    required,
    type: 'object',
  };
}

function createResponseSchema(operation: ParsedOperation): SchemaLike | undefined {
  return operation.response.schema;
}

function renderResponseType(
  response: ParsedOperation['response'],
  context: TypeRenderContext,
): string {
  if (response.binary) return 'ArrayBuffer';
  return response.schema
    ? renderSchema(response.schema, context)
    : response.contentType
      ? 'unknown'
      : 'void';
}

function renderOperationTypes(parsed: ParsedDocument, context: TypeRenderContext): string[] {
  const blocks: string[] = [];

  for (const operation of parsed.operations) {
    const requestSchema = createRequestSchema(operation);

    if (requestSchema) {
      blocks.push(renderNamedSchemaExport(operation.requestTypeName, requestSchema, context));
    } else {
      blocks.push(`export type ${operation.requestTypeName} = void;`);
    }

    const responseSchema = createResponseSchema(operation);

    if ((operation.responses?.length ?? 1) > 1) {
      const variants = [
        ...new Set(
          (operation.responses ?? [operation.response]).map((response) =>
            renderResponseType(response, context),
          ),
        ),
      ];
      blocks.push(`export type ${operation.responseTypeName} = ${variants.join(' | ')};`);
    } else if (operation.response.binary) {
      blocks.push(`export type ${operation.responseTypeName} = ArrayBuffer;`);
    } else if (responseSchema) {
      blocks.push(renderNamedSchemaExport(operation.responseTypeName, responseSchema, context));
    } else if (operation.response.contentType) {
      blocks.push(`export type ${operation.responseTypeName} = unknown;`);
    } else {
      blocks.push(`export type ${operation.responseTypeName} = void;`);
    }
  }

  return blocks;
}

export function generateTypesSource(parsed: ParsedDocument): string {
  const context: TypeRenderContext = {
    document: parsed.document,
    componentTypeNames: parsed.componentTypeNames ?? {},
  };
  const componentBlocks = Object.entries(parsed.componentSchemas)
    .sort(([left], [right]) => left.localeCompare(right))
    .filter(([, schema]) => isReferenceObject(schema) || isSchemaObject(schema))
    .map(([name, schema]) => renderNamedSchemaExport(name, schema, context));
  const operationBlocks = renderOperationTypes(parsed, context);

  return [
    '/* eslint-disable */',
    '/**',
    ' * Auto-generated by api-sdk-generator.',
    ' * Do not edit manually.',
    ' */',
    '',
    'export {};',
    '',
    ...componentBlocks,
    '',
    ...operationBlocks,
    '',
  ].join('\n');
}
