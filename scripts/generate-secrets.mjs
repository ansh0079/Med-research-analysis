#!/usr/bin/env node
/**
 * Generate strong secrets for production .env / platform secret stores.
 * Usage: node scripts/generate-secrets.mjs
 */

import crypto from 'node:crypto';

function hex(bytes) {
    return crypto.randomBytes(bytes).toString('hex');
}

const jwtSecret = hex(64);
const sessionSecret = hex(32);
const adminToken = hex(24);

console.log('# Paste into .env or Railway/Render/Fly secret manager\n');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log(`ADMIN_TOKEN=${adminToken}`);
console.log('\n# Optional: set POSTGRES_PASSWORD for docker compose');
console.log(`POSTGRES_PASSWORD=${hex(16)}`);
