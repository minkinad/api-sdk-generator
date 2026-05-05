# CLI Usage

## Command

```bash
api-sdk-generator generate [options]
```

## Options

- `--url <url>`: load the OpenAPI schema from a remote URL
- `--file <path>`: load the OpenAPI schema from a local JSON file
- `--output <path>`: target directory for generated files
- `--name <sdkName>`: override the generated SDK name
- `--base-url <baseUrl>`: override the detected server URL
- `--clean`: delete the output directory before writing files
- `--verbose`: print debug logs

## Validation rules

- exactly one of `--url` or `--file` is required
- `--output` is always required
- `--url` and `--base-url` must be valid absolute URLs

## Exit behavior

- `0` on success
- `1` on validation errors, schema errors, or generation failures
