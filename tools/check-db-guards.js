#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIRS = [
    path.join(ROOT, 'server', 'routes'),
    path.join(ROOT, 'server', 'controllers'),
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
        if (line.includes('typeof db.')) {
            findings.push(`${relative}:${index + 1}: ${line.trim()}`);
        }
    });
}

if (findings.length > 0) {
    console.error('Disallowed route/controller db capability guards found:');
    findings.forEach((finding) => console.error(`- ${finding}`));
    process.exit(1);
}

console.log('No route/controller typeof db guards found.');
