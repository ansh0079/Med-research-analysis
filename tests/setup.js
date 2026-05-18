// Jest Test Setup
// Mocks and global test configuration

// Mock console methods during tests (optional - uncomment if needed)
// global.console = {
//     log: jest.fn(),
//     error: jest.fn(),
//     warn: jest.fn(),
//     info: jest.fn(),
//     debug: jest.fn()
// };

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Let OS assign random port

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
