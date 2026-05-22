#!/usr/bin/env node
// Scrive src/app/core/build-sha.local.ts con lo SHA breve del commit corrente.
// Lanciato da package.json (prestart, prebuild, postinstall). Il file
// generato e' gitignored: viene letto solo in development (in production
// fileReplacements usa build-info.prod.ts e ignora questo file).

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

let sha = 'unknown';
try {
  sha = execSync('git rev-parse --short HEAD', {
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .trim();
} catch {
  // Nessun git, o nessun commit. Va bene: BUILD_SHA = 'unknown'.
}

const content = `// Auto-generato da scripts/write-build-sha.mjs. NON committare.
export const BUILD_SHA = '${sha}';
`;

writeFileSync('src/app/core/build-sha.local.ts', content);
console.log(`build-sha.local.ts written, BUILD_SHA='${sha}'`);
