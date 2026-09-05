'use strict';

const { userOwnsAiGenerationJob } = require('../../server/routes/ai/jobs');

describe('userOwnsAiGenerationJob', () => {
    test('requires the authenticated owner', () => {
        expect(userOwnsAiGenerationJob({ userId: 'u1' }, 'u1')).toBe(true);
        expect(userOwnsAiGenerationJob({ userId: 'u1' }, 'u2')).toBe(false);
        expect(userOwnsAiGenerationJob({ userId: null }, 'u1')).toBe(false);
        expect(userOwnsAiGenerationJob(null, 'u1')).toBe(false);
    });
});
