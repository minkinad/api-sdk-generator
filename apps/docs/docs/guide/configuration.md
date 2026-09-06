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

This is a subset generator, not a complete OpenAPI validator. The type model targets
OpenAPI 3.0; OpenAPI 3.1-specific JSON Schema keywords such as `type: [string, null]`,
`const` and boolean schemas are not implemented. Convert such schemas to the supported
3.0 constructs before generation.

- External file/URL references and path-level references are unsupported.
- Request bodies support JSON media types, including `+json`; multipart and form bodies are unsupported.
- Only the first successful response is modeled (or the first response when no success is declared); non-JSON response schemas are not modeled.
- Header/cookie parameters and security schemes are not generated. Supply authentication and headers through client configuration or `RequestInit`.
- Object query parameters and custom path serialization are unsupported; path values use simple string encoding.
- Server variables are not expanded; use `--base-url` with a concrete absolute URL.
- TRACE is unavailable through standard fetch and is rejected.

The CLI reports duplicate normalized operation names and component type names.
If an operation request/response type conflicts with a component, it receives a
numeric suffix (for example `CreateUserRequest2`). Components keep their names.

`--clean` removes the output directory: use a dedicated generated directory.
It rejects the working directory, its ancestors, the home directory and directories
containing the local input schema, resolving existing ancestor symlinks when checking
protected paths. Output-root and nested symlinks are rejected. Files are replaced
atomically; the directory as a whole is not a transaction. Cyclic YAML aliases are
rejected; use OpenAPI `$ref` for recursive models.
`--check` and `--dry-run` perform no writes.
