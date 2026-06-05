#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGETS = ['app.js', 'server.js', 'server/controllers', 'server/routes'];
const ROUTE_RE = /\b(?:app|router)\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]([^;]+)/g;
const AUTH_MARKERS = [
    'requireAuthJwt',
    'requireAuthJwtOrApiKey',
    'requireRole',
    'requireReviewAccess',
    'attachApiKeyUser',
];
const PUBLIC_PATTERNS = [
    /^\/health$/,
    /^\/metrics$/,
    /^\/api\/config$/,
    /^\/api\/docs(?:\.json)?$/,
    /^\/api\/auth\//,
    /^\/api\/billing\/webhook$/,
    /^\/api\/analytics\/event$/,
    /^\/api\/pubmed\/search$/,
    /^\/api\/semantic(?:-scholar)?\/search$/,
    /^\/api\/openalex\/search$/,
    /^\/api\/crossref\/search$/,
    /^\/api\/search(?:\/mesh-suggest)?$/,
    /^\/api\/search\/intelligence$/,
    /^\/api\/search\/ai-enrichment\//,
    /^\/api\/pdf\/find$/,
    /^\/api\/guidelines(?:\/|$)/,
    /^\/api\/knowledge\/[^/]+$/,
    /^\/api\/trending$/,
    /^\/api\/articles\/[^/]+\/related$/,
    /^\/api\/alerts\/unsubscribe$/,
    /^\/api\/ai\/health$/,
];

function walk(entry) {
    const absolute = path.join(ROOT, entry);
    if (!fs.existsSync(absolute)) return [];
    const stat = fs.statSync(absolute);
    if (stat.isFile()) return [absolute];
    return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((dirent) => {
        const child = path.join(entry, dirent.name);
        if (dirent.isDirectory()) return walk(child);
        return /\.(js|cjs|mjs)$/.test(dirent.name) ? [path.join(ROOT, child)] : [];
    });
}

function lineNumber(source, index) {
    return source.slice(0, index).split(/\r?\n/).length;
}

function isPublic(route) {
    return PUBLIC_PATTERNS.some((pattern) => pattern.test(route));
}

const files = [...new Set(TARGETS.flatMap(walk))];
const findings = [];

for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(ROUTE_RE)) {
        const [, method, route, tail] = match;
        if (!route.startsWith('/api') && route !== '/health' && route !== '/metrics') continue;
        if (isPublic(route)) continue;
        if (AUTH_MARKERS.some((marker) => tail.includes(marker))) continue;
        findings.push({
            file: path.relative(ROOT, file),
            line: lineNumber(source, match.index),
            method: method.toUpperCase(),
            route,
        });
    }
}

if (findings.length === 0) {
    console.log('Auth route audit passed: no unclassified protected API routes found.');
    process.exit(0);
}

console.log('Auth route audit found routes without an explicit auth marker or public allowlist entry:\n');
for (const finding of findings) {
    console.log(`${finding.file}:${finding.line} ${finding.method} ${finding.route}`);
}
console.log('\nAdd auth middleware, add attachApiKeyUser for API-key-public search, or document the route in PUBLIC_PATTERNS.');
process.exit(1);
