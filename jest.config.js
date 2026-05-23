// Jest Configuration
// Unit and Integration Tests Only
// E2E tests use Playwright separately

module.exports = {
    // Test environment
    testEnvironment: 'node',
    
    // Test file patterns - only unit and integration tests
    testMatch: [
        '**/tests/unit/**/*.test.js',
        '**/tests/integration/**/*.test.js'
    ],
    
    // Exclude E2E tests (run separately with Playwright)
    testPathIgnorePatterns: [
        '/node_modules/',
        '/tests/e2e/',
        '/tests/load/',
        '<rootDir>/.claude/'
    ],
    
    // Coverage configuration
    collectCoverageFrom: [
        'app.js',
        'server.js',
        'server/**/*.js',
        'database/**/*.js',
        'cache/**/*.js',
        'config.js',
        'scripts/**/*.{js,ts}',
        '!**/node_modules/**',
        '!**/tests/**',
        '!**/*.test.js',
        '!**/.claude/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    
    // Module file extensions
    moduleFileExtensions: ['js', 'ts', 'tsx', 'json'],
    
    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    
    // Module paths for easier imports
    moduleDirectories: ['node_modules'],
    
    // Transform configuration
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks after each test
    restoreMocks: true,
    
    // Test timeout
    testTimeout: 10000,
    
    // Verbose output
    verbose: true,
    
    // Fail on console errors/warnings during tests
    // Uncomment if you want stricter test behavior
    // errorOnDeprecated: true,
    
    // Detect open handles (useful for catching async issues)
    detectOpenHandles: true,
    
    // Force exit after all tests complete
    forceExit: true
};
