const {
    extractPicoProfile,
    rerankArticlesByPico,
    selectTopRerankedArticles,
    computeHeuristicScore,
    rankForStudyType,
    buildPicoCacheKey,
    MAX_ARTICLES_TO_RERANK,
} = require('../../server/services/articleReranker');

describe('articleReranker', () => {
    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    function makeMockAi(responseText) {
        return {
            callGemini: jest.fn().mockResolvedValue(responseText),
            callMistralAI: jest.fn().mockResolvedValue(responseText),
        };
    }

    function makeMockCache(hit = null) {
        return {
            get: jest.fn().mockResolvedValue(hit),
            set: jest.fn().mockResolvedValue(undefined),
        };
    }

    function makeArticle(overrides = {}) {
        return {
            uid: overrides.uid || `pmid-${Math.floor(Math.random() * 10000000)}`,
            title: overrides.title || 'Study',
            abstract: overrides.abstract || 'Abstract text.',
            year: overrides.year || 2023,
            pubtype: overrides.pubtype || ['Journal Article'],
            ...overrides,
        };
    }

    // -------------------------------------------------------------------------
    // buildPicoCacheKey
    // -------------------------------------------------------------------------
    test('buildPicoCacheKey is deterministic for same input', () => {
        const k1 = buildPicoCacheKey('65yo male with ARDS');
        const k2 = buildPicoCacheKey('65yo male with ARDS');
        expect(k1).toBe(k2);
        expect(k1.startsWith('pico:profile:')).toBe(true);
    });

    test('buildPicoCacheKey differs for different inputs', () => {
        const k1 = buildPicoCacheKey('ARDS');
        const k2 = buildPicoCacheKey('COPD');
        expect(k1).not.toBe(k2);
    });

    // -------------------------------------------------------------------------
    // rankForStudyType
    // -------------------------------------------------------------------------
    test('rankForStudyType scores RCTs and meta-analyses highest', () => {
        expect(rankForStudyType('Meta-Analysis')).toBe(5);
        expect(rankForStudyType('Systematic Review')).toBe(5);
        expect(rankForStudyType('Randomized Controlled Trial')).toBe(4);
        expect(rankForStudyType('RCT')).toBe(4);
        expect(rankForStudyType('Cohort Study')).toBe(3);
        expect(rankForStudyType('Case Report')).toBe(1);
        expect(rankForStudyType('unknown')).toBe(2);
    });

    // -------------------------------------------------------------------------
    // computeHeuristicScore
    // -------------------------------------------------------------------------
    test('computeHeuristicScore rewards keyword overlap and strong study design', () => {
        const article = makeArticle({
            title: 'Randomized trial of dexamethasone in ARDS',
            abstract: 'Adults with severe ARDS received dexamethasone.',
            pubtype: ['Randomized Controlled Trial'],
        });
        const pico = { population: 'Adults ARDS', intervention: 'dexamethasone', outcome: 'mortality', severity: 'Severe', queryIntent: 'management' };
        const score = computeHeuristicScore(article, pico);
        expect(score.overallScore).toBeGreaterThan(0.5);
        expect(score.studyDesignScore).toBeGreaterThan(0.5);
        expect(score.exclusionFlags).toEqual([]);
    });

    test('computeHeuristicScore penalises case reports for management queries', () => {
        const article = makeArticle({
            title: 'Case report: ARDS in a child',
            abstract: 'A single paediatric case.',
            pubtype: ['Case Report'],
        });
        const pico = { population: 'Adults', intervention: 'steroids', queryIntent: 'management' };
        const score = computeHeuristicScore(article, pico);
        expect(score.studyDesignScore).toBeLessThan(0.5);
    });

    // -------------------------------------------------------------------------
    // extractPicoProfile
    // -------------------------------------------------------------------------
    test('extractPicoProfile returns cached value when available', async () => {
        const cachedProfile = { population: 'Adults', intervention: 'oxygen', queryIntent: 'management' };
        const cache = makeMockCache(cachedProfile);
        const ai = makeMockAi('{}');
        const result = await extractPicoProfile('some case', { ai, cache, serverConfig: { keys: {} } });
        expect(result).toEqual(cachedProfile);
        expect(ai.callGemini).not.toHaveBeenCalled();
    });

    test('extractPicoProfile calls AI and parses JSON on cache miss', async () => {
        const aiResponse = JSON.stringify({
            population: 'Elderly adults',
            intervention: 'mechanical ventilation',
            comparison: 'standard care',
            outcome: 'mortality',
            ageRange: '>65 years',
            severity: 'Severe ARDS',
            setting: 'ICU',
            queryIntent: 'management',
        });
        const cache = makeMockCache(null);
        const ai = makeMockAi(aiResponse);
        const result = await extractPicoProfile('70yo with severe ARDS', {
            ai,
            cache,
            serverConfig: { keys: { gemini: 'key' } },
        });
        expect(result.population).toBe('Elderly adults');
        expect(result.severity).toBe('Severe ARDS');
        expect(cache.set).toHaveBeenCalled();
    });

    test('extractPicoProfile returns empty object when AI is unavailable', async () => {
        const cache = makeMockCache(null);
        const result = await extractPicoProfile('case text', { ai: null, cache, serverConfig: { keys: {} } });
        expect(result).toEqual({});
    });

    test('extractPicoProfile returns empty object for empty caseText', async () => {
        const result = await extractPicoProfile('', { ai: null, cache: null, serverConfig: {} });
        expect(result).toEqual({});
    });

    test('extractPicoProfile handles unparseable AI response gracefully', async () => {
        const cache = makeMockCache(null);
        const ai = makeMockAi('this is not json');
        const result = await extractPicoProfile('case', {
            ai,
            cache,
            serverConfig: { keys: { gemini: 'key' } },
        });
        expect(result).toEqual({});
    });

    // -------------------------------------------------------------------------
    // rerankArticlesByPico
    // -------------------------------------------------------------------------
    test('rerankArticlesByPico sorts by overallScore descending', async () => {
        const articles = [
            makeArticle({ title: 'Low relevance case report', pubtype: ['Case Report'] }),
            makeArticle({ title: 'High relevance RCT', pubtype: ['Randomized Controlled Trial'] }),
            makeArticle({ title: 'Medium relevance cohort', pubtype: ['Cohort Study'] }),
        ];

        const aiResponse = JSON.stringify([
            { articleIndex: 1, populationMatch: 0.2, interventionMatch: 0.2, outcomeMatch: 0.2, studyDesignScore: 0.1, overallScore: 0.15, exclusionFlags: [], rationale: 'Low' },
            { articleIndex: 2, populationMatch: 0.9, interventionMatch: 0.9, outcomeMatch: 0.9, studyDesignScore: 0.9, overallScore: 0.9, exclusionFlags: [], rationale: 'High' },
            { articleIndex: 3, populationMatch: 0.6, interventionMatch: 0.6, outcomeMatch: 0.6, studyDesignScore: 0.6, overallScore: 0.6, exclusionFlags: [], rationale: 'Medium' },
        ]);

        const ai = makeMockAi(aiResponse);
        const pico = { population: 'Adults', intervention: 'ventilation', queryIntent: 'management' };
        const result = await rerankArticlesByPico(articles, pico, { ai, serverConfig: { keys: { gemini: 'key' } } });

        expect(result).toHaveLength(3);
        expect(result[0].title).toBe('High relevance RCT');
        expect(result[0]._rerank.overallScore).toBe(0.9);
        expect(result[1].title).toBe('Medium relevance cohort');
        expect(result[2].title).toBe('Low relevance case report');
    });

    test('rerankArticlesByPico falls back to heuristic when AI fails', async () => {
        const articles = [
            makeArticle({ title: 'RCT', pubtype: ['Randomized Controlled Trial'] }),
            makeArticle({ title: 'Case report', pubtype: ['Case Report'] }),
        ];
        const ai = {
            callGemini: jest.fn().mockRejectedValue(new Error('Gemini down')),
            callMistralAI: jest.fn().mockRejectedValue(new Error('Mistral down')),
        };
        const pico = { population: 'Adults', queryIntent: 'management' };
        const result = await rerankArticlesByPico(articles, pico, { ai, serverConfig: { keys: { gemini: 'key' } } });

        expect(result).toHaveLength(2);
        expect(result[0]._rerank.rationale).toContain('Heuristic');
    });

    test('rerankArticlesByPico falls back to heuristic for empty PICO profile', async () => {
        const articles = [makeArticle({ title: 'Study A' })];
        const ai = makeMockAi('[]');
        const result = await rerankArticlesByPico(articles, {}, { ai, serverConfig: { keys: { gemini: 'key' } } });
        expect(result[0]._rerank.rationale).toContain('Heuristic');
    });

    test('rerankArticlesByPico never returns more than MAX_ARTICLES_TO_RERANK', async () => {
        const articles = Array.from({ length: 40 }, (_, i) => makeArticle({ title: `Study ${i}` }));
        const ai = makeMockAi('[]');
        const pico = { population: 'Adults' };
        const result = await rerankArticlesByPico(articles, pico, { ai, serverConfig: { keys: { gemini: 'key' } } });
        expect(result.length).toBeLessThanOrEqual(MAX_ARTICLES_TO_RERANK);
    });

    test('rerankArticlesByPico handles missing articleIndex in LLM response gracefully', async () => {
        const articles = [
            makeArticle({ title: 'Study 1' }),
            makeArticle({ title: 'Study 2' }),
        ];
        // Only score article 2; article 1 missing
        const aiResponse = JSON.stringify([
            { articleIndex: 2, overallScore: 0.9, exclusionFlags: [], rationale: 'Good' },
        ]);
        const ai = makeMockAi(aiResponse);
        const pico = { population: 'Adults' };
        const result = await rerankArticlesByPico(articles, pico, { ai, serverConfig: { keys: { gemini: 'key' } } });
        expect(result).toHaveLength(2);
        // Article 2 should be first because it has explicit score 0.9
        expect(result[0].title).toBe('Study 2');
        // Article 1 should have heuristic score
        expect(result[1]._rerank.rationale).toContain('Heuristic');
    });

    // -------------------------------------------------------------------------
    // selectTopRerankedArticles
    // -------------------------------------------------------------------------
    test('selectTopRerankedArticles filters out population_mismatch by default', () => {
        const articles = [
            { uid: '1', title: 'Good', _rerank: { overallScore: 0.9, exclusionFlags: [] } },
            { uid: '2', title: 'Bad population', _rerank: { overallScore: 0.95, exclusionFlags: ['population_mismatch'] } },
            { uid: '3', title: 'Weak design', _rerank: { overallScore: 0.8, exclusionFlags: ['design_too_weak'] } },
        ];
        const result = selectTopRerankedArticles(articles, { topN: 10, strictPopulation: true });
        expect(result.map((a) => a.uid)).toEqual(['1', '3']);
    });

    test('selectTopRerankedArticles relaxes filter when too few remain', () => {
        const articles = [
            { uid: '1', title: 'Bad', _rerank: { overallScore: 0.9, exclusionFlags: ['population_mismatch'] } },
            { uid: '2', title: 'Also bad', _rerank: { overallScore: 0.8, exclusionFlags: ['population_mismatch'] } },
        ];
        const result = selectTopRerankedArticles(articles, { topN: 10, strictPopulation: true });
        // Should fall back to original sorted list
        expect(result.length).toBe(2);
    });

    test('selectTopRerankedArticles respects topN', () => {
        const articles = Array.from({ length: 20 }, (_, i) => ({
            uid: String(i),
            _rerank: { overallScore: 1 - i * 0.01, exclusionFlags: [] },
        }));
        const result = selectTopRerankedArticles(articles, { topN: 5 });
        expect(result.length).toBe(5);
        expect(result[0].uid).toBe('0');
    });

    test('selectTopRerankedArticles returns empty array for invalid input', () => {
        expect(selectTopRerankedArticles(null)).toEqual([]);
        expect(selectTopRerankedArticles(undefined)).toEqual([]);
        expect(selectTopRerankedArticles('not-array')).toEqual([]);
    });

    // -------------------------------------------------------------------------
    // End-to-end flow
    // -------------------------------------------------------------------------
    test('end-to-end: PICO extraction -> rerank -> select top 10', async () => {
        const caseText = '65-year-old with severe ARDS, considering dexamethasone';
        const picoResponse = JSON.stringify({
            population: 'Adults with ARDS',
            intervention: 'dexamethasone',
            outcome: 'mortality',
            ageRange: '65 years',
            severity: 'Severe',
            setting: 'ICU',
            queryIntent: 'management',
        });

        const articles = Array.from({ length: 15 }, (_, i) => makeArticle({
            title: i % 3 === 0 ? `Case report ${i}` : `RCT of steroids in ARDS ${i}`,
            pubtype: i % 3 === 0 ? ['Case Report'] : ['Randomized Controlled Trial'],
        }));

        const scores = articles.map((_, i) => ({
            articleIndex: i + 1,
            populationMatch: i % 3 === 0 ? 0.2 : 0.9,
            interventionMatch: i % 3 === 0 ? 0.1 : 0.85,
            outcomeMatch: i % 3 === 0 ? 0.1 : 0.8,
            studyDesignScore: i % 3 === 0 ? 0.1 : 0.9,
            overallScore: i % 3 === 0 ? 0.15 : 0.88,
            exclusionFlags: i % 3 === 0 ? ['design_too_weak'] : [],
            rationale: i % 3 === 0 ? 'Case report' : 'Strong RCT',
        }));

        const ai = makeMockAi(picoResponse);
        // First call is PICO extraction; subsequent calls use same mock but different prompts
        ai.callGemini.mockImplementation(async (prompt) => {
            if (prompt.includes('PATIENT CASE PROFILE')) {
                return JSON.stringify(scores);
            }
            return picoResponse;
        });

        const cache = makeMockCache(null);
        const serverConfig = { keys: { gemini: 'key' } };

        const pico = await extractPicoProfile(caseText, { ai, cache, serverConfig });
        expect(pico.intervention).toBe('dexamethasone');

        const reranked = await rerankArticlesByPico(articles, pico, { ai, serverConfig });
        const top10 = selectTopRerankedArticles(reranked, { topN: 10, strictPopulation: true });

        expect(top10.length).toBeLessThanOrEqual(10);
        // Case reports should be filtered out or at the bottom
        const caseReportsInTop = top10.filter((a) => a.pubtype.includes('Case Report'));
        expect(caseReportsInTop.length).toBe(0);
    });
});
