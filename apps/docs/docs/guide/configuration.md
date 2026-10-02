# Configuration

## Runtime configuration

`createClient` accepts:

- `baseUrl?: string`
- `headers?: HeadersInit`
- `fetch?: typeof fetch`

## Generator configuration

`generateSdk` and the CLI support:

- input from `file` or `url`
- `outputDir`
- `sdkName`
- `baseUrl`
- `clean`
- `dryRun`: return formatted files without writing
- `check`: compare against disk; inspect `result.changedFiles`
- `schemaTimeoutMs` (core) / `--timeout` (CLI): remote schema deadline, default 30 seconds
- `signal` (core): cancel schema downloads
- `logger` (core) / `--verbose` (CLI)

## Supported OpenAPI features

| Feature                           | Status                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| OpenAPI 3.0                       | Supported subset                                                                                 |
| OpenAPI 3.1                       | Partial: primitive type arrays including `null`; other JSON Schema extensions are not guaranteed |
| JSON and YAML input               | Supported for files and HTTP URLs                                                                |
| Local component `$ref`            | Supported, including recursive models and escaped pointer tokens                                 |
| `oneOf`, `anyOf`, `allOf`         | Supported as TypeScript unions/intersections                                                     |
| `not`                             | Rejected with an error                                                                           |
| JSON request bodies               | Supported                                                                                        |
| Form and multipart request bodies | Rejected with an error                                                                           |
| Path and query parameters         | Supported for simple primitives and common array query styles                                    |
| Header and cookie parameters      | Rejected with an error                                                                           |
| JSON, text and binary responses   | Supported (`ArrayBuffer` for `application/octet-stream`)                                         |
| Security schemes                  | Credentials can be supplied through client headers or `RequestInit`; schemes are not generated   |

- `openapi`
- `info`
- `servers`
- `paths`
- `components.schemas`
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`
- `string`, `number`, `integer`, `boolean`, `array`, `object`, `enum`, `nullable`
- `anyOf`, `oneOf`, `allOf`, dictionaries and nullable objects
- local component `$ref`, including escaped JSON Pointer names and alias chains
- recursive model references; alias cycles produce a validation error
- query arrays: `form` (repeated keys by default, comma separated with `explode: false`), `spaceDelimited`, `pipeDelimited`

## Request options and errors

Pass `RequestInit` as the second argument to a method with a request object (or
as the first argument for methods without parameters). This includes `signal`,
`credentials` and per-request `headers`. Per-request headers override client headers.
`ApiError` exposes `status`, `headers` and `body`, preserving the raw response when
an error server incorrectly labels non-JSON content as JSON.

## Limitations

This is a subset generator, not a complete OpenAPI validator. OpenAPI 3.1
`type: [string, null]` is supported. Other JSON Schema extensions such as `const`
and boolean schemas are not implemented; `const` is rejected and boolean schemas
must be converted to supported constructs.

- External file/URL references and path-level references are unsupported.
- Request bodies support JSON media types, including `+json`; multipart and form bodies are unsupported.
- All declared successful responses are modeled as a union. JSON, `text/plain`, and `application/octet-stream` are supported. Other media types are rejected.
- A response status with multiple media types is rejected because one return type cannot describe all variants safely.
- Header/cookie parameters are rejected. Security schemes are not generated; supply credentials through client configuration or `RequestInit`.
- Object query parameters, `allowReserved`, and custom path serialization are rejected; primitive path values use simple string encoding.
- Server variables are not expanded; use `--base-url` with a concrete absolute URL.
- TRACE is unavailable through standard fetch and is rejected.

Normalized operation and component type name collisions receive deterministic numeric
suffixes. For example, `User` and `user` become `User` and `User2`.

Use a dedicated generated directory. All writes reject the working directory, its
ancestors, and the home directory. `--clean` also rejects directories
containing the local input schema, resolving existing ancestor symlinks when checking
protected paths. Generation also rejects an input file that would be overwritten by
one of the generated files. Output-root and nested symlinks are rejected. Files are replaced
atomically; clean generation stages the new directory before replacement. Cyclic YAML aliases are
rejected; use OpenAPI `$ref` for recursive models.
`--check` and `--dry-run` perform no writes.

If an older command used `--output .`, change it to a dedicated directory such as
`--output ./src/generated` and update imports to that location.
