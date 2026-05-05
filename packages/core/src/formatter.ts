import prettier from 'prettier';

import type { GeneratedFile } from './types.js';

function getParser(filePath: string): 'markdown' | 'typescript' {
  return filePath.endsWith('.md') ? 'markdown' : 'typescript';
}

export async function formatGeneratedFiles(files: GeneratedFile[]): Promise<GeneratedFile[]> {
  return Promise.all(
    files.map(async (file) => ({
      ...file,
      content: await prettier.format(file.content, {
        parser: getParser(file.path),
      }),
    })),
  );
}
