const {
    aliasesFromMeshItems,
    captureLowRecallSearch,
    cleanAlias,
    lookupMeshAliases,
} = require('../../server/services/lowRecallLearningService');

describe('lowRecallLearningService', () => {
    test('cleanAlias rejects tiny, huge, and URL aliases', () => {
        expect(cleanAlias('ARDS')).toBe('ARDS');
        expect(cleanAlias('x')).toBe('');
        expect(cleanAlias('https://example.com/mesh')).toBe('');
        expect(cleanAlias('a'.repeat(121))).toBe('');
    });

    test('aliasesFromMeshItems extracts compact labels and simple notes', () => {
        const aliases = aliasesFromMeshItems([
            { label: 'Myocardial Infarction', note: 'Heart Attack' },
            { label: 'Myocardial Infarction' },
            { label: 'Very long; descriptive note with punctuation', note: 'Use for complicated cases; not an alias.' },
        ]);

        expect(aliases).toContain('Myocardial Infarction');
        expect(aliases).toContain('Heart Attack');
        expect(aliases.filter((a) => a === 'Myocardial Infarction')).toHaveLength(1);
    });

    test('lookupMeshAliases calls the NLM lookup endpoint', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => [{ label: 'Septic Shock', note: 'Shock, Septic' }],
        });

        const aliases = await lookupMeshAliases('sepsis shock', fetchImpl);

        expect(fetchImpl.mock.calls[0][0]).toContain('id.nlm.nih.gov/mesh/lookup/term');
        expect(aliases).toEqual(['Septic Shock', 'Shock, Septic']);
    });

    test('captureLowRecallSearch records failure and merges aliases below threshold', async () => {
        const db = {
            recordLowRecallSearch: jest.fn().mockResolvedValue({ id: 1 }),
            mergeTopicKnowledgeAliases: jest.fn().mockResolvedValue({ id: 2 }),
        };
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => [{ label: 'Rare Syndrome', note: 'Rare Disease' }],
        });

        const result = await captureLowRecallSearch({
            db,
            fetchImpl,
            query: 'rare syndrome treatment',
            resultCount: 2,
            sources: ['pubmed'],
        });

        expect(result.aliasCount).toBe(2);
        expect(db.recordLowRecallSearch).toHaveBeenCalledWith(expect.objectContaining({
            query: 'rare syndrome treatment',
            resultCount: 2,
            expandedAliases: ['Rare Syndrome', 'Rare Disease'],
        }));
        expect(db.mergeTopicKnowledgeAliases).toHaveBeenCalledWith(
            'rare syndrome treatment',
            ['Rare Syndrome', 'Rare Disease'],
            expect.objectContaining({ createIfMissing: true, reason: 'low_recall_mesh' })
        );
    });

    test('captureLowRecallSearch ignores healthy result counts', async () => {
        const db = {
            recordLowRecallSearch: jest.fn(),
            mergeTopicKnowledgeAliases: jest.fn(),
        };

        const result = await captureLowRecallSearch({
            db,
            fetchImpl: jest.fn(),
            query: 'sepsis',
            resultCount: 8,
        });

        expect(result).toBeNull();
        expect(db.recordLowRecallSearch).not.toHaveBeenCalled();
    });
});
