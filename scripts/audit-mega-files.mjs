#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DEFAULT_LIMIT = 700;
const limit = Number(process.env.MEGA_FILE_LINE_LIMIT || DEFAULT_LIMIT);
const targets = ['src/pages', 'src/components', 'server/routes', 'server/controllers'];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

function walk(entry) {
    const absolute = path.join(ROOT, entry);
    if (!fs.existsSync(absolute)) return [];
    return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((dirent) => {
        const child = path.join(entry, dirent.name);
        const childAbs = path.join(ROOT, child);
        if (dirent.isDirectory()) return walk(child);
        return extensions.has(path.extname(dirent.name)) ? [childAbs] : [];
    });
}

const oversized = targets
    .flatMap(walk)
    .map((file) => {
        const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
        return { file: path.relative(ROOT, file), lines };
    })
    .filter((item) => item.lines > limit)
    .sort((a, b) => b.lines - a.lines);

if (oversized.length === 0) {
    console.log(`Mega-file audit passed: no files above ${limit} lines.`);
    process.exit(0);
}

console.log(`Mega-file audit: ${oversized.length} files above ${limit} lines.\n`);
for (const item of oversized) {
    console.log(`${String(item.lines).padStart(5)}  ${item.file}`);
}
console.log('\nUse this as a refactor queue; keep new extraction work below the threshold.');
process.exit(0);
