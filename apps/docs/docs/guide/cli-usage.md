# CLI Usage

## Command

```bash
api-sdk-generator generate [options]
```

## Options

- `--url <url>`: load the OpenAPI schema from a remote URL
- `--file <path>`: load the OpenAPI schema from a local JSON or YAML file
- `--output <path>`: target directory for generated files
- `--name <sdkName>`: override the generated SDK name
- `--base-url <baseUrl>`: override the detected server URL
- `--dry-run`: validate and preview generated file names without writing
- `--check`: compare generated files with disk without writing
- `--clean`: delete the output directory before writing files
- `--verbose`: print debug logs

## Validation rules

- exactly one of `--url` or `--file` is required
- `--output` is always required
- `--url` and `--base-url` must be absolute HTTP(S) URLs

## Exit behavior

- `--check` and `--dry-run` are mutually exclusive
- preview and check modes never clean or write the output directory

- `0` on success
- `1` on validation errors, schema errors, or generation failures
- `2` when `--check` detects missing or outdated generated files

`--check` compares only the four generated files, ignoring unrelated files.
Regenerate with the same SDK name/base URL options used for the check.
