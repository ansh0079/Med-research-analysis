const fs = require('fs');
const path = require('path');

const CONTRACT_SCAN_DIRS = [
    path.join(__dirname, '..', 'routes'),
    path.join(__dirname, '..', 'controllers'),
    path.join(__dirname, '..', 'middleware'),
];

const IGNORED_DB_PROPERTIES = new Set([
    'Database',
    'db',
    'dbPath',
]);

function walkJsFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return walkJsFiles(fullPath);
        return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
    });
}

function stripComments(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function discoverRouteDbMethods({ scanDirs = CONTRACT_SCAN_DIRS } = {}) {
    const methods = new Set();
    const dbCallPattern = /\bdb\s*(?:\?\.|\.)\s*([A-Za-z_$][\w$]*)/g;

    for (const file of scanDirs.flatMap(walkJsFiles)) {
        const source = stripComments(fs.readFileSync(file, 'utf8'));
        let match;
        while ((match = dbCallPattern.exec(source)) !== null) {
            const name = match[1];
            if (!IGNORED_DB_PROPERTIES.has(name)) methods.add(name);
        }
    }

    return Array.from(methods).sort();
}

function checkDbContract(db, options = {}) {
    const required = discoverRouteDbMethods(options);
    const missing = required.filter((method) => typeof db[method] !== 'function');
    return {
        ok: missing.length === 0,
        required,
        requiredMethodCount: required.length,
        missing,
    };
}

module.exports = {
    CONTRACT_SCAN_DIRS,
    discoverRouteDbMethods,
    checkDbContract,
};
