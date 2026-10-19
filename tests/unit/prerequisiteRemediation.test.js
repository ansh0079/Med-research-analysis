'use strict';

const {
    PREREQUISITE_MAP,
    MAX_REMEDIATIONS_PER_SUBMISSION,
    normalizeTopicKey,
    findPrerequisites,
    isHighConfidenceMiss,
    remediatePrerequisites,
} = require('../../server/services/learning/prerequisiteRemediation');

describe('prerequisiteRemediation map lookup', () => {
    test('exact normalized topic match returns parents with rationale', () => {
        const parents = findPrerequisites('sepsis vasopressor management');
        expect(parents.length).toBeGreaterThanOrEqual(2);
        expect(parents[0].topic).toBe('Circulatory shock recognition');
        expect(parents[0].rationale).toBeTruthy();
        expect(parents[0].matchedKey).toBe('sepsis vasopressor management');
    });

    test('normalization handles case and punctuation', () => {
        const parents = findPrerequisites('Sepsis: Vasopressor Management!!');
        expect(parents.length).toBeGreaterThanOrEqual(2);
    });

    test('substring containment matches both directions', () => {
        // topic shorter than key
        const byShortTopic = findPrerequisites('sepsis');
        expect(byShortTopic.some((p) => p.topic === 'Circulatory shock recognition')).toBe(true);
        // topic longer than key
        const byLongTopic = findPrerequisites('guidelines for atrial fibrillation anticoagulation in elderly');
        expect(byLongTopic.some((p) => p.topic.includes('CHA2DS2-VASc'))).toBe(true);
    });

    test('falls back to question text when topic does not match', () => {
        const parents = findPrerequisites('some unknown topic', 'Which vasopressor for sepsis first-line management?');
        expect(parents.some((p) => p.topic === 'Fluid resuscitation principles')).toBe(true);
    });

    test('unknown topic and text return empty array', () => {
        expect(findPrerequisites('zzz unrelated', 'nothing clinical here')).toEqual([]);
        expect(findPrerequisites(null, null)).toEqual([]);
    });

    test('every map entry has a non-empty parent topic and key is normalized', () => {
        for (const [key, entries] of Object.entries(PREREQUISITE_MAP)) {
            expect(key).toBe(normalizeTopicKey(key));
            for (const entry of entries) {
                expect(String(entry.topic).trim().length).toBeGreaterThan(0);
            }
        }
    });

    test('normalizeTopicKey collapses whitespace and strips symbols', () => {
        expect(normalizeTopicKey('  Heart   Failure\tManagement ')).toBe('heart failure management');
        expect(normalizeTopicKey('DKA (adult)')).toBe('dka adult');
    });
});

describe('prerequisiteRemediation confidence gate', () => {
    test('isHighConfidenceMiss uses the 1–5 scale with threshold 4', () => {
        expect(isHighConfidenceMiss({ confidence: 4 })).toBe(true);
        expect(isHighConfidenceMiss({ confidence: 5 })).toBe(true);
        expect(isHighConfidenceMiss({ confidence: 3 })).toBe(false);
        expect(isHighConfidenceMiss({ confidence: null })).toBe(false);
        expect(isHighConfidenceMiss({})).toBe(false);
    });
});

describe('remediatePrerequisites', () => {
    function makeSpiedDb() {
        return {
            recordLearningEvent: jest.fn().mockResolvedValue(1),
        };
    }

    test('creates FSRS card and learning event for high-confidence miss', async () => {
        const db = makeSpiedDb();
        const updateCard = jest.fn().mockResolvedValue(undefined);
        const result = await remediatePrerequisites(db, { updateCard }, {
            userId: 'u1',
            topic: 'sepsis vasopressor management',
            normalizedTopic: 'sepsis vasopressor management',
            missedAttempts: [
                { isCorrect: false, confidence: 5, questionType: 'mcq', outlineNodeId: 'n1' },
            ],
        });
        // seed map supplies 2 parents; MeSH bridge may add more (cache-dependent)
        expect(result.created).toBeGreaterThanOrEqual(2);
        expect(result.parents).toContain('Circulatory shock recognition');
        expect(result.parents.length).toBeLessThanOrEqual(MAX_REMEDIATIONS_PER_SUBMISSION);
        expect(updateCard).toHaveBeenCalledTimes(result.created);
        const call = updateCard.mock.calls[0][1];
        expect(call.userId).toBe('u1');
        expect(call.outlineNodeId).toBe(`prereq:${normalizeTopicKey(call.topic)}`);
        expect(call.isCorrect).toBe(false);
        expect(db.recordLearningEvent).toHaveBeenCalledTimes(result.created);
        const event = db.recordLearningEvent.mock.calls[0][0];
        expect(event.eventType).toBe('prerequisite_remediation');
        expect(event.payload.childTopic).toBe('sepsis vasopressor management');
        expect(event.payload.confidence).toBe(5);
    });

    test('skips low-confidence and correct attempts', async () => {
        const db = makeSpiedDb();
        const updateCard = jest.fn().mockResolvedValue(undefined);
        const result = await remediatePrerequisites(db, { updateCard }, {
            userId: 'u1',
            topic: 'sepsis',
            normalizedTopic: 'sepsis',
            missedAttempts: [
                { isCorrect: false, confidence: 2 },
                { isCorrect: false, confidence: null },
                { isCorrect: true, confidence: 5 },
            ],
        });
        expect(result.created).toBe(0);
        expect(updateCard).not.toHaveBeenCalled();
        expect(db.recordLearningEvent).not.toHaveBeenCalled();
    });

    test('caps remediations per submission and dedupes parents across misses', async () => {
        const db = makeSpiedDb();
        const updateCard = jest.fn().mockResolvedValue(undefined);
        const misses = Array.from({ length: 5 }, () => ({
            isCorrect: false, confidence: 5, questionText: 'sepsis vasopressor management',
        }));
        const result = await remediatePrerequisites(db, { updateCard }, {
            userId: 'u1',
            topic: 'sepsis vasopressor management',
            normalizedTopic: 'sepsis vasopressor management',
            missedAttempts: misses,
        });
        expect(result.created).toBeLessThanOrEqual(MAX_REMEDIATIONS_PER_SUBMISSION);
        // two distinct parents exist for this key; each created once
        expect(updateCard.mock.calls.length).toBe(result.created);
        const topics = updateCard.mock.calls.map((c) => c[1].topic);
        expect(new Set(topics).size).toBe(topics.length);
    });

    test('returns empty result when prerequisites are not callable or user missing', async () => {
        const db = makeSpiedDb();
        expect(await remediatePrerequisites(db, null, {
            userId: 'u1', topic: 'sepsis', missedAttempts: [{ isCorrect: false, confidence: 5 }],
        })).toEqual({ created: 0, parents: [] });
        expect(await remediatePrerequisites(db, { updateCard: jest.fn() }, {
            userId: null, topic: 'sepsis', missedAttempts: [{ isCorrect: false, confidence: 5 }],
        })).toEqual({ created: 0, parents: [] });
    });

    test('survives updateCard failure and keeps processing', async () => {
        const db = makeSpiedDb();
        const updateCard = jest.fn()
            .mockRejectedValueOnce(new Error('db down'))
            .mockResolvedValue(undefined);
        const result = await remediatePrerequisites(db, { updateCard }, {
            userId: 'u1',
            topic: 'sepsis vasopressor management',
            missedAttempts: [{ isCorrect: false, confidence: 5 }],
        });
        // One parent fails to persist; the rest must still be created.
        expect(result.created).toBeGreaterThanOrEqual(1);
        expect(result.parents).toHaveLength(result.created);
        expect(updateCard.mock.calls.length).toBe(result.created + 1);
    });
});
