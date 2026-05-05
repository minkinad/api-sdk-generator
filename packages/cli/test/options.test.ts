import { describe, expect, it } from 'vitest';

import { CliUsageError } from '../src/errors.js';
import { normalizeGenerateCommandOptions } from '../src/options.js';

describe('normalizeGenerateCommandOptions', () => {
  it('normalizes a file-based request', () => {
    const options = normalizeGenerateCommandOptions({
      file: './openapi.json',
      output: './generated',
      verbose: true,
    });

    expect(options.input.file).toMatch(/openapi\.json$/);
    expect(options.outputDir).toMatch(/generated$/);
    expect(options.verbose).toBe(true);
  });

  it('rejects missing output', () => {
    expect(() => normalizeGenerateCommandOptions({ file: './openapi.json' })).toThrow(
      CliUsageError,
    );
  });

  it('rejects when both file and url are provided', () => {
    expect(() =>
      normalizeGenerateCommandOptions({
        file: './openapi.json',
        output: './generated',
        url: 'https://example.com/openapi.json',
      }),
    ).toThrow('Provide exactly one input source');
  });

  it('rejects invalid urls', () => {
    expect(() =>
      normalizeGenerateCommandOptions({
        output: './generated',
        url: 'not-a-url',
      }),
    ).toThrow('Invalid --url value');
  });
});
