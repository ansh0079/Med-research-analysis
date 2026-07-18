#!/usr/bin/env node
'use strict';

/**
 * Phase 5 platform hardening: enforce modular-monolith import boundaries.
 *
 * Rules:
 *   1. server/services/** must not import server/routes/**
 *   2. server/services/** must not import src/**
 *   3. server/lib/** must not import server/routes/**
 *
 * Usage:
 *   node tools/check-service-boundaries.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = [
    path.join(ROOT, 'server', 'services'),
    path.join(ROOT, 'server', 'lib'),
];

const REQUIRE_RE = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const IMPORT_RE = /from\s+['"]([^'"]+)['"]/g;

function walkJsFiles(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
            walkJsFiles(full, out);
        } else if (/\.(js|cjs|mjs)$/.test(entry.name)) {
            out.push(full);
        }
    }
    return out;
}

function resolveImport(fromFile, spec) {
    if (!spec.startsWith('.') && !spec.startsWith('/')) return null; // package import
    const base = path.resolve(path.dirname(fromFile), spec);
    const candidates = [
        base,
        `${base}.js`,
        `${base}.cjs`,
        `${base}.mjs`,
        path.join(base, 'index.js'),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return path.normalize(candidate);
        }
    }
    return path.normalize(base);
}

function classifyViolation(fromFile, resolved) {
    if (!resolved) return null;
    const relFrom = path.relative(ROOT, fromFile).replace(/\\/g, '/');
    const relTo = path.relative(ROOT, resolved).replace(/\\/g, '/');

    const fromServiceOrLib = relFrom.startsWith('server/services/') || relFrom.startsWith('server/lib/');
    if (!fromServiceOrLib) return null;

    if (relTo.startsWith('server/routes/') || relTo.includes('/server/routes/')) {
        return { rule: 'no-routes-from-services', from: relFrom, to: relTo };
    }
    if (relTo.startsWith('src/') || relTo.includes('/src/')) {
        return { rule: 'no-src-from-services', from: relFrom, to: relTo };
    }
    return null;
}

function collectSpecs(source) {
    const specs = [];
    let m;
    REQUIRE_RE.lastIndex = 0;
    while ((m = REQUIRE_RE.exec(source))) specs.push(m[1]);
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(source))) specs.push(m[1]);
    return specs;
}

function main() {
    const files = SCAN_DIRS.flatMap((dir) => walkJsFiles(dir));
    const violations = [];

    for (const file of files) {
        const source = fs.readFileSync(file, 'utf8');
        for (const spec of collectSpecs(source)) {
            const resolved = resolveImport(file, spec);
            const violation = classifyViolation(file, resolved);
            if (violation) violations.push(violation);
        }
    }

    if (violations.length) {
        console.error('Service boundary check failed:\n');
        for (const v of violations) {
            console.error(`  [${v.rule}] ${v.from} → ${v.to}`);
        }
        console.error('\nKeep routes → services one-way. Extract shared helpers into server/services or server/lib.');
        process.exit(1);
    }

    console.log(`Service boundary check passed (${files.length} files scanned).`);
}

main();
