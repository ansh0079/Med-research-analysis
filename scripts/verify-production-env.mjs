#!/usr/bin/env node
/**
 * Fail-fast checks for beta/production deployment configuration.
 * Usage: NODE_ENV=production node scripts/verify-production-env.mjs
 * Or load .env first: node -r dotenv/config scripts/verify-production-env.mjs
 */

import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validateProductionEnv } = require('../server/lib/productionReadiness.js');

const { errors, warnings } = validateProductionEnv({ mode: 'verify' });

for (const warning of warnings) {
    console.warn(`WARN: ${warning}`);
}
for (const error of errors) {
    console.error(`ERROR: ${error}`);
}

if (errors.length > 0) {
    console.error(`\nProduction env check failed (${errors.length} error(s), ${warnings.length} warning(s)).`);
    process.exit(1);
}

console.log(`Production env check passed (${warnings.length} warning(s)).`);
process.exit(0);
