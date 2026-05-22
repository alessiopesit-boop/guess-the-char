#!/usr/bin/env node
// Generato `src/build-info.ts` con la versione corrente e l'hash di commit,
// in modo che il footer dell'app possa mostrare l'identificativo della build.
// Lanciato automaticamente da `npm start` (prestart) e `npm run build` (prebuild).

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const isProd = process.argv.includes('--prod');
const cwd = process.cwd();

let version = '0.0.0';
try {
  const manifest = JSON.parse(readFileSync(resolve(cwd, '.release-please-manifest.json'), 'utf8'));
  version = manifest['.'] ?? '0.0.0';
} catch {
  // fallback al default
}

let gitHash = 'unknown';
try {
  gitHash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
} catch {
  // non in un repo git o git non disponibile
}

const out = `// File auto-generato da scripts/generate-build-info.mjs.
// NON modificare a mano: viene riscritto a ogni avvio di npm start / npm run build.

export interface BuildInfo {
  readonly version: string;
  readonly gitHash: string;
  readonly isProduction: boolean;
}

export const BUILD_INFO: BuildInfo = {
  version: '${version}',
  gitHash: '${gitHash}',
  isProduction: ${isProd},
};
`;

writeFileSync(resolve(cwd, 'src/build-info.ts'), out, 'utf8');
console.log(`build-info: v${version} ${gitHash} (production=${isProd})`);
