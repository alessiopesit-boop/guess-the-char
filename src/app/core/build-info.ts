// Build info per build di SVILUPPO. In production (configuration "production"
// di angular.json) questo file viene sostituito da build-info.prod.ts via
// fileReplacements: niente "dev", niente SHA.
//
// BUILD_SHA arriva da build-sha.local.ts, autogenerato (gitignored) da
// scripts/write-build-sha.mjs ad ogni npm install / start / build.

import { version as PACKAGE_VERSION } from '../../../package.json';
import { BUILD_SHA } from './build-sha.local';

export const APP_VERSION = PACKAGE_VERSION;
export const BUILD_CONTEXT: 'dev' | 'release' = 'dev';
export { BUILD_SHA };
