# Getting help

Start with the [README](./README.md), [CLI guide](./apps/docs/docs/guide/cli-usage.md),
and [supported schema features](./apps/docs/docs/guide/configuration.md).
For npm publication, use the [publishing guide](./apps/docs/docs/guide/publishing-npm.md).

## Bug reports

Search [existing issues](https://github.com/minkinad/api-sdk-generator/issues) first.
If the problem is new, open a bug report with:

- The generator version (`api-sdk-generator --version`), Node.js version, and operating system.
- The exact command, expected result, and complete error message.
- A small OpenAPI document that reproduces the issue, with private data removed.
- Whether the failure occurs during generation, TypeScript compilation, or an SDK request.

A minimal failing schema is more useful than a large production API definition.
Do not include access tokens, `.npmrc` credentials, personal information, or internal URLs.

## Questions and feature requests

Use the question or feature request form in [Issues](https://github.com/minkinad/api-sdk-generator/issues/new/choose).
Describe the behavior you need and the alternatives you tried. For new schema
support, include an OpenAPI example and the TypeScript or HTTP behavior you expect.

Support is provided by volunteers, with no guaranteed response time. Small,
reproducible reports and focused pull requests are easier to review.

## Security

Follow [SECURITY.md](./SECURITY.md) for suspected vulnerabilities. Do not report
exploitable details in a public issue.
