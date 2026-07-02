const {
    collapseNearDuplicateTitles,
    dedupeKey,
    normalizeDoi,
    normalizePmid,
    clinicalQueryAliases,
    buildPubMedSearchQuery,
    mergeAndRank,
    getEbmScore,
    isPreprint,
} = require('../../server/services/unifiedEvidenceSearch');

describe('unifiedEvidenceSearch helpers', () => {
    test('normalizeDoi strips resolver URL', () => {
        expect(normalizeDoi('https://doi.org/10.1234/abc')).toBe('10.1234/abc');
        expect(normalizeDoi('http://dx.doi.org/10.1234/ABC')).toBe('10.1234/abc');
    });

    test('dedupeKey uses normalized DOI across formats', () => {
        const a = { doi: '10.1234/AbC', title: 'T' };
        const b = { doi: 'https://doi.org/10.1234/abc', title: 'T' };
        expect(dedupeKey(a)).toBe(dedupeKey(b));
    });

    test('dedupeKey uses PMID before source-specific uid', () => {
        const a = { uid: 'semantic-abc', pmid: 'PMID: 12345678', title: 'T' };
        const b = { uid: 'openalex-work', pmid: '12345678', title: 'Different source title' };
        expect(normalizePmid('PMID: 12345678')).toBe('12345678');
        expect(dedupeKey(a)).toBe(dedupeKey(b));
    });

    test('dedupeKey falls back to normalized title and year across source uids', () => {
        const a = { uid: 'source-a', title: 'Long-term outcomes after stent placement for coronary artery disease', pubdate: '2020' };
        const b = { uid: 'source-b', title: 'Long term outcomes after stent placement for coronary artery disease', year: 2020 };
        expect(dedupeKey(a)).toBe(dedupeKey(b));
    });

    test('collapseNearDuplicateTitles keeps first high-ranked title', () => {
        const articles = [
            {
                title: 'Long term outcomes after stent placement for coronary disease',
                pubdate: '2020',
                uid: '1',
            },
            {
                title: 'Long-term outcomes after stent placement for coronary artery disease',
                pubdate: '2020',
                uid: '2',
            },
            { title: 'Vitamin D and mortality — unrelated topic', pubdate: '2021', uid: '3' },
        ];
        const out = collapseNearDuplicateTitles(articles, { minJaccard: 0.72 });
        expect(out).toHaveLength(2);
        expect(out.map((a) => a.uid)).toEqual(['1', '3']);
    });

    test('collapseNearDuplicateTitles does not merge different years when both known', () => {
        const articles = [
            {
                title: 'Long term outcomes after stent placement for coronary disease',
                pubdate: '2020',
                uid: '1',
            },
            {
                title: 'Long-term outcomes after stent placement for coronary artery disease',
                pubdate: '2015',
                uid: '2',
            },
        ];
        const out = collapseNearDuplicateTitles(articles, { minJaccard: 0.72 });
        expect(out).toHaveLength(2);
    });

    test('getEbmScore returns highest matching study design score', () => {
        expect(getEbmScore({ pubtype: ['Randomized Controlled Trial'] })).toBe(6);
        expect(getEbmScore({ pubtype: ['Meta-Analysis', 'Journal Article'] })).toBe(7);
        expect(getEbmScore({ pubtype: ['Cohort Study'] })).toBe(4);
        expect(getEbmScore({ pubtype: ['Case Report'] })).toBe(1);
        expect(getEbmScore({ pubtype: ['Editorial'] })).toBe(0);
    });

    test('getEbmScore falls back to studyDesign field', () => {
        expect(getEbmScore({ pubtype: [], studyDesign: 'systematic review' })).toBe(7);
        expect(getEbmScore({ pubtype: [], studyDesign: 'rct' })).toBe(6);
    });

    test('getEbmScore defaults to cross-sectional tier for unknown types', () => {
        expect(getEbmScore({ pubtype: ['Something Weird'] })).toBe(2);
        expect(getEbmScore({})).toBe(2);
    });

    test('isPreprint detects preprint sources', () => {
        expect(isPreprint({ source: 'bioRxiv', journal: '' })).toBe(true);
        expect(isPreprint({ source: 'Nature', journal: 'Nature Medicine' })).toBe(false);
        expect(isPreprint({ source: 'medRxiv Preprint Server' })).toBe(true);
        expect(isPreprint({ source: '', journal: 'SSRN' })).toBe(true);
    });

    test('clinicalQueryAliases expands landmark trial names for verbose clinical queries', () => {
        expect(clinicalQueryAliases('sacubitril valsartan heart failure reduced ejection fraction mortality')).toEqual(
            expect.arrayContaining(['PARADIGM-HF'])
        );
        expect(clinicalQueryAliases('low tidal volume ventilation ARDS lung protective')).toEqual(
            expect.arrayContaining(['ARDSNet', 'ARMA'])
        );
        expect(clinicalQueryAliases('pembrolizumab plus chemotherapy metastatic non-small cell lung cancer')).toEqual(
            expect.arrayContaining(['KEYNOTE-189'])
        );
    });

    test('RRF alias boost keeps a single-source landmark trial above dual-source fillers', () => {
        // The ARISTOTLE trial appears only in PubMed (rank 1); three filler papers appear
        // in BOTH PubMed and OpenAlex, so RRF accumulates dual-source rank for them.
        const landmark = {
            uid: 'pubmed-21870978', pmid: '21870978', doi: '10.1056/nejmoa1107039',
            title: 'Apixaban versus warfarin in patients with atrial fibrillation',
            abstract: 'The ARISTOTLE trial randomized patients with atrial fibrillation to apixaban or warfarin.',
            pubtype: ['Randomized Controlled Trial'], journal: 'N Engl J Med',
        };
        // Fillers share the landmark's evidence tier (RCT) so the EBM signal does not
        // differentiate them — isolating the alias boost as the deciding factor.
        const filler = (n) => ({
            uid: `pubmed-f${n}`, pmid: `f${n}`, doi: `10.1/filler${n}`,
            title: `Recent anticoagulation trial number ${n}`, abstract: 'A recent randomized trial.',
            pubtype: ['Randomized Controlled Trial'], journal: 'Some Journal',
        });
        const pubmedList = [landmark, filler(1), filler(2), filler(3)];
        const openalexList = [
            { ...filler(1), uid: 'openalex-f1' },
            { ...filler(2), uid: 'openalex-f2' },
            { ...filler(3), uid: 'openalex-f3' },
        ];
        const aliases = clinicalQueryAliases('apixaban versus warfarin atrial fibrillation');
        expect(aliases).toEqual(expect.arrayContaining(['ARISTOTLE']));

        // Without alias awareness, the dual-source fillers bury the landmark.
        const withoutAlias = mergeAndRank([pubmedList, openalexList], undefined, []);
        expect(withoutAlias[0].pmid).not.toBe('21870978');

        // With the query aliases, the alias-matched landmark is restored to the top.
        const withAlias = mergeAndRank([pubmedList, openalexList], undefined, aliases);
        expect(withAlias[0].pmid).toBe('21870978');
    });

    test('buildPubMedSearchQuery parenthesizes base query, MeSH terms, and clinical aliases', () => {
        const query = buildPubMedSearchQuery('low tidal volume ventilation ARDS', ['Respiratory Distress Syndrome'], ['ARDSNet', 'acute lung injury']);
        expect(query).toBe('(' +
            'low tidal volume ventilation ARDS OR ' +
            '"Respiratory Distress Syndrome"[MeSH Terms] OR ' +
            '"ARDSNet"[Title/Abstract] OR ' +
            '"acute lung injury"' +
            ')');
    });
});
