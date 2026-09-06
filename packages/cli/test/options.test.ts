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
  it('rejects non-HTTP sources and conflicting preview modes', () => {
    expect(() =>
      normalizeGenerateCommandOptions({ output: './generated', url: 'file:///tmp/schema.json' }),
    ).toThrow('Invalid --url');
    expect(() =>
      normalizeGenerateCommandOptions({
        output: './generated',
        file: './schema.json',
        check: true,
        dryRun: true,
      }),
    ).toThrow('Use either --check or --dry-run');
  });
  it('validates schema download deadlines', () => {
    const input = { file: './schema.yaml', output: './generated' };
    expect(normalizeGenerateCommandOptions(input).schemaTimeoutMs).toBe(30000);
    expect(normalizeGenerateCommandOptions({ ...input, timeout: '5000' }).schemaTimeoutMs).toBe(
      5000,
    );
    for (const timeout of ['0', '-1', 'NaN', 'Infinity', '0.5', '4294967296']) {
      expect(() => normalizeGenerateCommandOptions({ ...input, timeout })).toThrow('--timeout');
    }
  });
});
