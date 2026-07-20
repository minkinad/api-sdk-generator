import { describe, expect, it } from 'vitest';

import packageMetadata from '../package.json' with { type: 'json' };
import { createCliProgram } from '../src/program.js';

describe('createCliProgram', () => {
  it('uses the package version', () => {
    expect(createCliProgram().version()).toBe(packageMetadata.version);
  });

  it('registers the generate command and its required output option', () => {
    const program = createCliProgram();
    const generateCommand = program.commands.find((command) => command.name() === 'generate');

    expect(generateCommand).toBeDefined();
    expect(generateCommand?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ long: '--output', mandatory: true }),
        expect.objectContaining({ long: '--file' }),
        expect.objectContaining({ long: '--url' }),
      ]),
    );
  });
});
