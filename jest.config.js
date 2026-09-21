// Jest Configuration
// Backend unit/integration tests use Node. Frontend component/hook tests use jsdom.

const tsTransform = {
    '^.+\\.(ts|tsx)$': 'ts-jest',
};

const moduleNameMapper = {
    '^@services/api$': '<rootDir>/tests/mocks/apiMock.ts',
    '^@types$': '<rootDir>/src/types/index.ts',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks$': '<rootDir>/src/hooks/index.ts',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/mocks/styleMock.js',
};

module.exports = {
    projects: [
        {
            displayName: 'backend',
            testEnvironment: 'node',
            testMatch: [
                '<rootDir>/tests/unit/**/*.test.js',
                '<rootDir>/tests/integration/**/*.test.js',
            ],
            testPathIgnorePatterns: [
                '/node_modules/',
                '/tests/e2e/',
                '/tests/load/',
                '<rootDir>/.claude/',
            ],
            modulePathIgnorePatterns: ['<rootDir>/.claude/'],
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
                '!**/.claude/**',
            ],
            moduleFileExtensions: ['js', 'ts', 'tsx', 'json'],
            setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
            moduleDirectories: ['node_modules'],
            transform: tsTransform,
            clearMocks: true,
            restoreMocks: true,
            testTimeout: 10000,
            detectOpenHandles: true,
        },
        {
            displayName: 'frontend',
            testEnvironment: 'jsdom',
            testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
            testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
            modulePathIgnorePatterns: ['<rootDir>/.claude/'],
            moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
            setupFilesAfterEnv: ['<rootDir>/tests/setup.frontend.ts'],
            moduleDirectories: ['node_modules'],
            moduleNameMapper,
            transform: tsTransform,
            clearMocks: true,
            restoreMocks: true,
            testTimeout: 10000,
        },
    ],
    verbose: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    // Jest only honours coverageThreshold at the ROOT of the config. It was declared inside each
    // project, where Jest ignores it and prints "Option coverageThreshold is not supported in an
    // individual project configuration" - so for as long as those numbers existed, nothing enforced
    // them and coverage could fall to zero without failing a build.
    //
    // Set as a ratchet just under what the suite actually covers today (statements 60.4, branches
    // 47.0, functions 59.5, lines 62.9 across both projects), not at an aspirational number that
    // would fail the first run. The point of the gate is to stop coverage sliding backwards; raising
    // it is a deliberate act once the real figure has moved.
    coverageThreshold: {
        global: {
            branches: 45,
            functions: 57,
            lines: 60,
            statements: 58,
        },
    },
};
