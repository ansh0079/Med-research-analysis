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

    test('keeps a fuzzy flagship match as a review suggestion', () => {
        const match = buildFlagshipMatcher(topics, normalize);
        expect(match('hepatorenal syndrome terlipressin')).toBeNull();
        expect(match.classify('hepatorenal syndrome terlipressin')).toMatchObject({
            item: { topic: 'Hepatorenal syndrome vasoconstrictor therapy' },
            matchType: 'fuzzy_suggestion',
            reviewRequired: true,
        });
    });

    test('automatically accepts an exact configured alias', () => {
        const match = buildFlagshipMatcher(topics, normalize);
        expect(match('HRS terlipressin')?.topic)
            .toBe('Hepatorenal syndrome vasoconstrictor therapy');
        expect(match.classify('HRS terlipressin')).toMatchObject({
            matchType: 'alias_exact', reviewRequired: false,
        });
    });

    test('rejects an exact alias shared by multiple clinical topics', () => {
        const match = buildFlagshipMatcher([
            { topic: 'Condition A', aliases: ['shared syndrome'] },
            { topic: 'Condition B', aliases: ['shared syndrome'] },
        ], normalize);
        expect(match('shared syndrome')).toBeNull();
        expect(match.classify('shared syndrome')).toMatchObject({
            item: null, matchType: 'ambiguous_exact', reviewRequired: true,
        });
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
            seedStatus: 'not_seeded',
        }));
        expect(db.recordTopicAlias).toHaveBeenCalledWith(
            'Acute asthma treatment', 42, 'orphan_reconciliation_identity', 1,
        );
    });

    test('does not attach a fuzzy clinical match without review', async () => {
        const db = {
            normalizeTopic: normalize,
            resolveCurriculumTopicId: jest.fn().mockResolvedValue(null),
            upsertCurriculumSeedTopic: jest.fn(),
            recordTopicAlias: jest.fn(),
        };
        const matcher = buildFlagshipMatcher(topics, normalize);
        const result = await resolveOrRegisterTopic(
            db,
            'hepatorenal syndrome terlipressin',
            new Set(['guideline_mcq']),
            matcher,
            { registerMissing: true },
        );
        expect(result).toMatchObject({
            topicId: null,
            reviewRequired: true,
            suggestedTopic: 'Hepatorenal syndrome vasoconstrictor therapy',
        });
        expect(db.upsertCurriculumSeedTopic).not.toHaveBeenCalled();
        expect(db.recordTopicAlias).not.toHaveBeenCalled();
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
