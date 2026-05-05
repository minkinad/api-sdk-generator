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
- `verbose`

## Supported OpenAPI features

- `openapi`
- `info`
- `servers`
- `paths`
- `components.schemas`
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- `string`, `number`, `integer`, `boolean`, `array`, `object`, `enum`, `nullable`
- local `$ref` within `components.schemas`
