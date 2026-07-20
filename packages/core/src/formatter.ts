import prettier, { type Options } from 'prettier';

import type { GeneratedFile } from './types.js';

const GENERATED_FORMAT_OPTIONS = {
  printWidth: 100,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
} satisfies Options;

function getParser(filePath: string): 'markdown' | 'typescript' {
  return filePath.endsWith('.md') ? 'markdown' : 'typescript';
}

export async function formatGeneratedFiles(files: GeneratedFile[]): Promise<GeneratedFile[]> {
  return Promise.all(
    files.map(async (file) => ({
      ...file,
      content: await prettier.format(file.content, {
        ...GENERATED_FORMAT_OPTIONS,
        parser: getParser(file.path),
      }),
    })),
  );
}
