#!/usr/bin/env node

/**
 * SQL dialect drift gate.
 *
 * Production runs Postgres while the local test suite runs SQLite, so SQLite-only
 * SQL in shared query code passes every unit test and then fails at runtime in
 * prod. Seven instances of this bug class have now shipped (HAVING aliases,
 * LEAST/GREATEST, INSERT OR IGNORE, datetime modifiers, strftime).
 *
 * This gate bans the mechanically detectable SQLite-only constructs from shared
 * server/database code. Portable equivalents:
 *   INSERT OR IGNORE            -> INSERT ... ON CONFLICT (...) DO NOTHING
 *   INSERT OR REPLACE           -> INSERT ... ON CONFLICT (...) DO UPDATE SET ...
 *   datetime('now', '-N days')  -> compute the cutoff in JS, pass as a parameter
 *   strftime(...) / julianday   -> dialect-branch on this.isPostgres, or compute in JS
 *   (bare datetime('now') is fine: DatabaseCore.toPgQuery translates it to NOW())
 *
 * Legitimate SQLite-only code (an explicit isPostgres branch) opts out by putting
 * the marker comment `sqlite-ok` on the same line.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIRS = [
    path.join(ROOT, 'server'),
    path.join(ROOT, 'database', 'mixins'),
];

const BANNED = [
    { pattern: /INSERT\s+OR\s+IGNORE/i, name: 'INSERT OR IGNORE (use ON CONFLICT ... DO NOTHING)' },
    { pattern: /INSERT\s+OR\s+REPLACE/i, name: 'INSERT OR REPLACE (use ON CONFLICT ... DO UPDATE)' },
    { pattern: /datetime\s*\(\s*'now'\s*,/i, name: "datetime('now', <modifier>) (compute cutoff in JS)" },
    { pattern: /strftime\s*\(/i, name: 'strftime() (dialect-branch or compute in JS)' },
    { pattern: /julianday\s*\(/i, name: 'julianday() (dialect-branch or compute in JS)' },
    { pattern: /\bAUTOINCREMENT\b/i, name: 'AUTOINCREMENT (SQLite-only DDL)' },
];

function walkJsFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return walkJsFiles(fullPath);
        return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
    });
}

const findings = [];

for (const file of TARGET_DIRS.flatMap(walkJsFiles)) {
    const relative = path.relative(ROOT, file);
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
        if (line.includes('sqlite-ok')) return;
        for (const { pattern, name } of BANNED) {
            if (pattern.test(line)) {
                findings.push(`${relative}:${index + 1}: ${name}\n    ${line.trim()}`);
            }
        }
    });
}

if (findings.length > 0) {
    console.error('SQLite-only SQL found in shared code (breaks on Postgres in production):\n');
    findings.forEach((finding) => console.error(`- ${finding}`));
    console.error(
        '\nFix with the portable equivalent, or mark an explicit isPostgres branch with `sqlite-ok`.'
    );
    process.exit(1);
}

console.log('No SQLite-only SQL constructs found in shared server/database code.');
