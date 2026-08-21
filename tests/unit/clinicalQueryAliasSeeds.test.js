const {
    compileSeedRule,
    loadClinicalQueryAliasSeeds,
    readAliasSeedCatalog,
    validateAliasSeedCatalog,
    pinnedPmidsForQuery,
} = require('../../server/services/clinicalQueryAliasSeeds');

describe('clinicalQueryAliasSeeds', () => {
    test('validates the checked-in alias seed catalog', () => {
        const catalog = readAliasSeedCatalog();
        const result = validateAliasSeedCatalog(catalog);

        expect(result.ok).toBe(true);
        expect(result.seedCount).toBeGreaterThan(20);
        expect(result.pinnedPmidCount).toBeGreaterThan(20);
    });

    test('reports invalid regex patterns and empty seed payloads', () => {
        const result = validateAliasSeedCatalog({
            version: 1,
            seeds: [
                { source: 'bad', all: ['['], aliases: [], pmids: [] },
            ],
        });

        expect(result.ok).toBe(false);
        expect(result.errors.join(' ')).toMatch(/invalid regex|aliases or pmids/i);
    });

    test('compiled catalog pins expected landmark PMIDs for query text', () => {
        const rules = loadClinicalQueryAliasSeeds();
        const pmids = pinnedPmidsForQuery(
            rules,
            'fecal microbiota transplant recurrent Clostridioides difficile infection'
        );

        expect(pmids).toContain('23323867');
    });

    test('compileSeedRule keeps alias metadata for runtime matching', () => {
        const rule = compileSeedRule({
            source: 'unit',
            all: ['\\bards\\b', '\\bprone\\b'],
            aliases: ['PROSEVA'],
            pmids: ['23688302'],
        });

        expect(rule.source).toBe('unit');
        expect(rule.all.every((pattern) => pattern.test('ARDS prone positioning'))).toBe(true);
        expect(rule.aliases).toEqual(['PROSEVA']);
        expect(rule.pmids).toEqual(['23688302']);
    });
});
