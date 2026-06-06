const {
    AppError,
    appErrorFromCode,
    normalizeToAppError,
    isAppError,
} = require('../../server/errors/appErrors');

describe('appErrors', () => {
    test('AppError includes code and recovery', () => {
        const err = appErrorFromCode('RATE_LIMITED', 'Too many requests');
        expect(err.status).toBe(429);
        expect(err.code).toBe('RATE_LIMITED');
        expect(err.recovery).toMatch(/retry/i);
        expect(err.toJSON()).toMatchObject({ code: 'RATE_LIMITED' });
    });

    test('normalizeToAppError maps validation errors', () => {
        const raw = Object.assign(new Error('bad input'), { name: 'ValidationError', details: { field: 'q' } });
        const err = normalizeToAppError(raw);
        expect(isAppError(err)).toBe(true);
        expect(err.code).toBe('VALIDATION_ERROR');
    });

    test('normalizeToAppError maps vector unavailable', () => {
        const raw = Object.assign(new Error('Vector offline'), { code: 'UNAVAILABLE' });
        const err = normalizeToAppError(raw);
        expect(err.code).toBe('VECTOR_UNAVAILABLE');
    });
});
