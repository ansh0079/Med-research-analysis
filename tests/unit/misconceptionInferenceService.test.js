const {
    inferMisconceptionTags,
    getInferredMisconceptionsForTopic,
    updateInferredMisconceptionsForTopic,
    MAX_TAGS_PER_TOPIC,
} = require('../../server/services/misconceptionInferenceService');

describe('misconceptionInferenceService', () => {
    describe('inferMisconceptionTags', () => {
        test('returns empty array for empty input', () => {
            expect(inferMisconceptionTags([])).toEqual([]);
            expect(inferMisconceptionTags(null)).toEqual([]);
            expect(inferMisconceptionTags(undefined)).toEqual([]);
        });

        test('infers tag when same claim + wrong answer >= 3 times', () => {
            const rows = [
                { claimKey: 'ck-1', wrongOptionText: 'A', misconceptionCategory: 'pitfall', count: 3, lastSeenAt: '2026-01-01' },
            ];
            const tags = inferMisconceptionTags(rows);
            expect(tags).toHaveLength(1);
            expect(tags[0].tag).toBe('claim:ck-1');
            expect(tags[0].pattern).toBe('repeated_wrong_answer');
            expect(tags[0].count).toBe(3);
            expect(tags[0].category).toBe('pitfall');
            expect(tags[0].description).toContain('1'); // claim key formatted
        });

        test('does not infer tag when count < 3', () => {
            const rows = [
                { claimKey: 'ck-1', wrongOptionText: 'A', misconceptionCategory: 'pitfall', count: 2, lastSeenAt: '2026-01-01' },
            ];
            const tags = inferMisconceptionTags(rows);
            expect(tags).toHaveLength(0);
        });

        test('aggregates counts across multiple rows for same claim+wrong', () => {
            const rows = [
                { claimKey: 'ck-1', wrongOptionText: 'A', misconceptionCategory: 'pitfall', count: 2, lastSeenAt: '2026-01-01' },
                { claimKey: 'ck-1', wrongOptionText: 'A', misconceptionCategory: 'pitfall', count: 2, lastSeenAt: '2026-01-02' },
            ];
            const tags = inferMisconceptionTags(rows);
            expect(tags).toHaveLength(1);
            expect(tags[0].count).toBe(4);
        });

        test('infers category-level weakness across multiple claims', () => {
            const rows = [
                { claimKey: 'ck-1', wrongOptionText: 'A', misconceptionCategory: 'guideline', count: 2, lastSeenAt: '2026-01-01' },
                { claimKey: 'ck-2', wrongOptionText: 'B', misconceptionCategory: 'guideline', count: 2, lastSeenAt: '2026-01-02' },
            ];
            const tags = inferMisconceptionTags(rows);
            // Total guideline count = 4 across 2 claims → category weakness
            expect(tags.length).toBeGreaterThanOrEqual(1);
            const categoryTag = tags.find((t) => t.pattern === 'category_weakness');
            expect(categoryTag).toBeDefined();
            expect(categoryTag.category).toBe('guideline');
        });

        test('limits tags to MAX_TAGS_PER_TOPIC', () => {
            const rows = Array.from({ length: 10 }, (_, i) => ({
                claimKey: `ck-${i}`,
                wrongOptionText: 'X',
                misconceptionCategory: 'pitfall',
                count: 3,
                lastSeenAt: '2026-01-01',
            }));
            const tags = inferMisconceptionTags(rows);
            expect(tags.length).toBeLessThanOrEqual(MAX_TAGS_PER_TOPIC);
        });

        test('sorts tags by count descending', () => {
            const rows = [
                { claimKey: 'ck-low', wrongOptionText: 'A', misconceptionCategory: 'pitfall', count: 3, lastSeenAt: '2026-01-01' },
                { claimKey: 'ck-high', wrongOptionText: 'B', misconceptionCategory: 'pitfall', count: 8, lastSeenAt: '2026-01-01' },
            ];
            const tags = inferMisconceptionTags(rows);
            expect(tags[0].claimKey).toBe('ck-high');
            expect(tags[1].claimKey).toBe('ck-low');
        });
    });

    describe('getInferredMisconceptionsForTopic', () => {
        test('returns empty array when db method missing', async () => {
            const result = await getInferredMisconceptionsForTopic(null, 'u1', 'ARDS');
            expect(result).toEqual([]);
        });

        test('returns inferred tags from db rows', async () => {
            const db = {
                getUserClaimMisconceptions: jest.fn().mockResolvedValue([
                    { claimKey: 'ck-1', wrongOptionText: 'A', misconceptionCategory: 'pitfall', count: 3, lastSeenAt: '2026-01-01' },
                ]),
            };
            const result = await getInferredMisconceptionsForTopic(db, 'u1', 'ARDS');
            expect(result).toHaveLength(1);
            expect(result[0].claimKey).toBe('ck-1');
        });

        test('returns empty array on db error', async () => {
            const db = {
                getUserClaimMisconceptions: jest.fn().mockRejectedValue(new Error('DB down')),
            };
            const result = await getInferredMisconceptionsForTopic(db, 'u1', 'ARDS');
            expect(result).toEqual([]);
        });
    });

    describe('updateInferredMisconceptionsForTopic', () => {
        test('persists inferred tags to user_topic_memory', async () => {
            const db = {
                getUserClaimMisconceptions: jest.fn().mockResolvedValue([
                    { claimKey: 'ck-1', wrongOptionText: 'A', misconceptionCategory: 'pitfall', count: 3, lastSeenAt: '2026-01-01' },
                ]),
                updateUserTopicMemoryMisconceptions: jest.fn().mockResolvedValue({ id: 1 }),
            };
            const result = await updateInferredMisconceptionsForTopic(db, 'u1', 'ARDS');
            expect(db.updateUserTopicMemoryMisconceptions).toHaveBeenCalledWith(
                'u1',
                'ARDS',
                expect.arrayContaining([
                    expect.objectContaining({ claimKey: 'ck-1', pattern: 'repeated_wrong_answer' }),
                ])
            );
            expect(result).toEqual({ id: 1 });
        });

        test('returns null when db missing', async () => {
            const result = await updateInferredMisconceptionsForTopic(null, 'u1', 'ARDS');
            expect(result).toBeNull();
        });
    });
});
