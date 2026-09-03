#!/usr/bin/env node
'use strict';

/**
 * Fail the build when a file destructures a name its target module never exports.
 *
 * Two of these shipped and ran in production undetected:
 *   - topicKnowledgeExtraction.js imported intentHintFromDistribution from
 *     ../aiService, which never exported it. Every topic refresh threw
 *     "intentHintFromDistribution is not a function" -- since the initial commit.
 *   - account.js imported REFRESH_COOKIE_NAME from ../middleware/auth, which
 *     re-exports by spread and does not include it. Account deletion cleared a
 *     cookie named "undefined" and left the real refresh cookie in the browser.
 *
 * Both were invisible to the test suite because the callers were mocked. This
 * check is deliberately STATIC -- requiring these modules starts servers, timers
 * and DB pools -- so it reads `module.exports = { ... }` as text and resolves
 * one level of `...spread` through the file's own requires.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['server', path.join('database', 'mixins')];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage']);

const IDENT = String.raw`[A-Za-z_$][\w$]*`;
const DESTRUCTURED_REQUIRE = new RegExp(
    String.raw`(?:const|let|var)\s*\{([^}]*)\}\s*=\s*require\(\s*['"](\.[^'"]+)['"]\s*\)`,
    'g',
);

function listJsFiles(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) listJsFiles(full, out);
        else if (entry.name.endsWith('.js')) out.push(full);
    }
    return out;
}

function resolveModule(fromFile, spec) {
    const base = path.resolve(path.dirname(fromFile), spec);
    for (const candidate of [base, `${base}.js`, path.join(base, 'index.js')]) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
    return null;
}

/** Names bound by this file's own `const X = require(...)`, for resolving spreads. */
function localRequireBindings(src) {
    const map = new Map();
    const re = new RegExp(String.raw`(?:const|let|var)\s+(${IDENT})\s*=\s*require\(\s*['"](\.[^'"]+)['"]\s*\)`, 'g');
    let m;
    while ((m = re.exec(src))) map.set(m[1], m[2]);
    return map;
}

/** Exported names, or null when the shape is one we cannot read statically. */
function exportedNames(file, depth = 0, seen = new Set()) {
    if (depth > 3 || seen.has(file)) return null;
    seen.add(file);

    const src = fs.readFileSync(file, 'utf8');

    // Names attached after the fact: `module.exports.foo = foo` / `exports.foo = foo`.
    const augmented = new Set();
    const augRe = new RegExp(String.raw`(?:^|
)\s*(?:module\.)?exports\.(${IDENT})\s*=`, 'g');
    let aug;
    while ((aug = augRe.exec(src))) augmented.add(aug[1]);

    // Anything other than a single object literal (a class, a function, a
    // conditional assignment, Object.assign) is out of scope -- report null so
    // callers skip rather than guess.
    const idx = src.search(/module\.exports\s*=\s*\{/);
    if (idx === -1) return augmented.size > 0 ? augmented : null;
    if ((src.match(/module\.exports\s*=\s*[^=]/g) || []).length > 1) return null;

    const open = src.indexOf('{', idx);
    let depthBrace = 0;
    let end = -1;
    for (let i = open; i < src.length; i++) {
        if (src[i] === '{') depthBrace++;
        else if (src[i] === '}') {
            depthBrace--;
            if (depthBrace === 0) { end = i; break; }
        }
    }
    if (end === -1) return null;

    const body = src.slice(open + 1, end);
    const names = new Set(augmented);
    const bindings = localRequireBindings(src);

    // Only split top-level commas; nested objects/calls must stay intact.
    const parts = [];
    let buf = '';
    let nest = 0;
    for (const ch of body) {
        if ('{(['.includes(ch)) nest++;
        else if ('})]'.includes(ch)) nest--;
        if (ch === ',' && nest === 0) { parts.push(buf); buf = ''; continue; }
        buf += ch;
    }
    parts.push(buf);

    for (const raw of parts) {
        const part = raw.replace(/\/\/.*$/gm, '').trim();
        if (!part) continue;

        const spread = part.match(new RegExp(String.raw`^\.\.\.\s*(${IDENT})$`));
        if (spread) {
            const spec = bindings.get(spread[1]);
            if (!spec) return null; // spreading something we cannot follow
            const target = resolveModule(file, spec);
            if (!target) return null;
            const inner = exportedNames(target, depth + 1, seen);
            if (inner === null) return null;
            for (const n of inner) names.add(n);
            continue;
        }

        const key = part.match(new RegExp(String.raw`^(${IDENT})\s*(?::|$)`));
        if (key) { names.add(key[1]); continue; }
        if (part.startsWith('...')) return null; // spread of an expression
    }
    return names;
}

const problems = [];
const files = SCAN_DIRS.flatMap((d) => listJsFiles(path.join(ROOT, d)));

for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    DESTRUCTURED_REQUIRE.lastIndex = 0;
    let m;
    while ((m = DESTRUCTURED_REQUIRE.exec(src))) {
        const target = resolveModule(file, m[2]);
        if (!target) continue;

        const exported = exportedNames(target);
        if (exported === null) continue; // unreadable export shape -- skip, don't guess

        for (const rawName of m[1].split(',')) {
            const name = rawName.split(':')[0].replace(/\/\/.*$/, '').trim();
            if (!name || name.startsWith('...')) continue;
            if (!new RegExp(`^${IDENT}$`).test(name)) continue;
            if (!exported.has(name)) {
                problems.push(
                    `${path.relative(ROOT, file)}: '${name}' is not exported by '${m[2]}'`,
                );
            }
        }
    }
}

if (problems.length > 0) {
    console.error(`Phantom imports found (${problems.length}):\n`);
    for (const p of problems) console.error(`  ${p}`);
    console.error('\nEach of these is undefined at runtime and throws on first use.');
    process.exit(1);
}

console.log(`check-phantom-imports: OK (${files.length} files scanned)`);
