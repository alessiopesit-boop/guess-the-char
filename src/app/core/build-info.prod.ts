// Build info per build di PRODUZIONE. Sostituisce build-info.ts in
// configuration "production" via fileReplacements di angular.json. Niente
// suffisso "dev", niente SHA: il footer mostra solo la versione del tag.

import { version as PACKAGE_VERSION } from '../../../package.json';

export const APP_VERSION = PACKAGE_VERSION;
export const BUILD_CONTEXT: 'dev' | 'release' = 'release';
export const BUILD_SHA = '';
