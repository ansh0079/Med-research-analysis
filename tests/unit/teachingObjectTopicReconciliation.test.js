'use strict';

const {
    buildFlagshipMatcher,
    canRegisterGeneratedTopic,
    matchKey,
    resolveOrRegisterTopic,
} = require('../../server/services/teachingObjectTopicReconciliation');

const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
const topics = [{
    topic: 'Hepatorenal syndrome vasoconstrictor therapy',
    aliases: ['hepatorenal syndrome', 'HRS terlipressin'],
}, {
    topic: 'Atrial fibrillation anticoagulation',
    aliases: ['AF anticoagulation'],
}];

describe('teaching-object topic reconciliation', () => {
    test('ignores timestamp-like tokens when matching an otherwise canonical topic', () => {
        const match = buildFlagshipMatcher(topics, normalize);
        expect(match('atrial fibrillation anticoagulation 1788867188')?.topic)
            .toBe('Atrial fibrillation anticoagulation');
    });

    test('maps a focused query through a contained flagship alias', () => {
        const match = buildFlagshipMatcher(topics, normalize);
        expect(match('hepatorenal syndrome terlipressin')?.topic)
            .toBe('Hepatorenal syndrome vasoconstrictor therapy');
    });

    test('normalises possessive fragments for catalogue matching', () => {
        expect(matchKey("Barrett's esophagus", normalize)).toBe('barrett esophagus');
        expect(matchKey('barretts esophagus', normalize)).toBe('barrett esophagus');
    });

    test('registers generated teaching topics but not plain search-result papers', () => {
        expect(canRegisterGeneratedTopic('Acute asthma treatment', new Set(['guideline_mcq']), normalize)).toBe(true);
        expect(canRegisterGeneratedTopic('Acute asthma treatment', new Set(['paper']), normalize)).toBe(false);
    });

    test('rejects malformed generated topics containing timestamp identifiers', () => {
        expect(canRegisterGeneratedTopic('atrial fibrillation 1788867188', new Set(['topic_consensus']), normalize)).toBe(false);
    });

    test('registers an unmatched generated topic and records its alias', async () => {
        const db = {
            normalizeTopic: normalize,
            resolveCurriculumTopicId: jest.fn().mockResolvedValue(null),
            upsertCurriculumSeedTopic: jest.fn().mockResolvedValue({ id: 42 }),
            recordTopicAlias: jest.fn().mockResolvedValue(true),
        };
        const result = await resolveOrRegisterTopic(
            db,
            'Acute asthma treatment',
            new Set(['guideline_mcq']),
            () => null,
            { registerMissing: true },
        );
        expect(result).toMatchObject({ topicId: 42, registered: true, matchedFlagship: false });
        expect(db.upsertCurriculumSeedTopic).toHaveBeenCalledWith(expect.objectContaining({
            displayName: 'Acute asthma treatment',
            seedStatus: 'seeded_with_warnings',
        }));
        expect(db.recordTopicAlias).toHaveBeenCalledWith('Acute asthma treatment', 42, 'orphan_reconciliation', 0.75);
    });

    test('does not create a curriculum topic for an unmatched paper-only search', async () => {
        const db = {
            normalizeTopic: normalize,
            resolveCurriculumTopicId: jest.fn().mockResolvedValue(null),
            upsertCurriculumSeedTopic: jest.fn(),
        };
        const result = await resolveOrRegisterTopic(
            db, 'one-off search phrase', new Set(['paper']), () => null, { registerMissing: true },
        );
        expect(result.topicId).toBeNull();
        expect(db.upsertCurriculumSeedTopic).not.toHaveBeenCalled();
    });
});
