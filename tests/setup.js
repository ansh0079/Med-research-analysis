// Jest Test Setup
// Mocks and global test configuration

const originalConsoleLog = console.log.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleInfo = console.info.bind(console);

function messageText(args) {
    return args.map((arg) => (typeof arg === 'string' ? arg : '')).join(' ');
}

const quietLogPatterns = [
    /^SQLite baseline covers /,
    /^PostgreSQL baseline: /,
    /^Running \d+ migration\(s\)\.\.\./,
    /^Running migration: /,
    /^Completed: /,
    /^Done\.$/,
    /^\s{3}Skipped /,
    /Connected to SQLite/,
    /Connected to PostgreSQL/,
    /PG vector pool connected/,
    /Database schema initialized/,
    /Database is up to date/,
];

console.log = (...args) => {
    const text = messageText(args);
    if (quietLogPatterns.some((pattern) => pattern.test(text))) return;
    originalConsoleLog(...args);
};

console.warn = (...args) => {
    const text = messageText(args);
    if (/^WARNING: JWT_SECRET should be at least 32 characters/.test(text)) return;
    if (/Enrichment job enqueue failed/.test(text)) return;
    originalConsoleWarn(...args);
};

console.info = (...args) => {
    const text = messageText(args);
    if (/Learning quality eval scheduler (started|disabled)/.test(text)) return;
    originalConsoleInfo(...args);
};

process.setMaxListeners(Math.max(process.getMaxListeners(), 50));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Let OS assign random port
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-at-least-thirty-two-characters-long';
process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'test-admin-token';

// Increase timeout for slow tests
jest.setTimeout(10000);

// Resolve pdf-parse open handle by ensuring any lingering promises are cleared
afterAll(async () => {
    const db = require('../database');
    // Explicitly close the database connection to prevent open handles
    if (db && typeof db.close === 'function') {
        await db.close();
        // Wait for connection pool to drain
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Shutdown PDF worker pool if it exists
    const pdfExtractor = require('../server/pdf-extract-pooled');
    if (pdfExtractor && typeof pdfExtractor.closePool === 'function') {
        await pdfExtractor.closePool();
    }

    // If your environment supports it, force garbage collection
    if (typeof global.gc === 'function') global.gc();
});
