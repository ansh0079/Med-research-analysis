const {
    buildPaperTeachingObject,
    buildConsensusTeachingObject,
    teachingObjectsToQuizContext,
    buildEvidenceMap,
    buildKnowledgeGraphRelationships,
    isPlaceholderAbstract,
    evidenceQuoteFromArticle,
} = require('../../server/services/teachingObjectService');

describe('teachingObjectService', () => {
    test('builds a reusable paper teaching object from a synopsis', () => {
        const object = buildPaperTeachingObject({
            topic: 'COPD exacerbation',
            article: {
                uid: 'pmid-1',
                title: 'Extracorporeal carbon dioxide removal for COPD',
                pubtype: ['Randomized Controlled Trial'],
                pmid: '1',
                isFree: true,
            },
            synopsisResult: {
                provider: 'gemini',
                model: 'flash',
                timestamp: '2026-05-18T00:00:00.000Z',
                audit: { fullTextCoverageRatio: 1 },
                synopsis: {
                    population: 'Adults with COPD exacerbation',
                    intervention: 'ECCO2R',
                    comparator: 'Usual care',
                    primaryOutcome: 'Avoidance of invasive ventilation',
                    mainFindings: 'No clear benefit.',
                    bottomLine: 'Do not overgeneralise this to all COPD exacerbations.',
                    trustRating: 'MODERATE',
                    quizFocusPoints: ['Identify the population studied.'],
                    whatNotToOverclaim: ['Do not infer mortality benefit.'],
                },
            },
        });

        expect(object.objectKey).toBe('paper:pmid-1');
        expect(object.objectType).toBe('paper');
        expect(object.confidence).toBeGreaterThan(0.6);
        expect(object.payload.pico.outcomes).toContain('Avoidance of invasive ventilation');
        expect(object.payload.quizSeed.focusPoints).toContain('Identify the population studied.');
        expect(object.payload.claimAnchors.length).toBeGreaterThanOrEqual(3);
        expect(object.payload.claimAnchors[0]).toMatchObject({
            sourcePath: 'synopsis.bottomLine',
            conceptKey: 'clinical_bottom_line',
            verificationStatus: 'source_verified',
        });
        expect(object.payload.claimAnchors[0].claimKey).toHaveLength(24);
        expect(object.payload.paper.fullTextUsed).toBe(true);
        expect(object.payload.knowledgeGraph.edgeCount).toBeGreaterThan(0);
        expect(object.payload.knowledgeGraph.nodes.some((n) => n.type === 'claim')).toBe(true);
    });

    test('buildKnowledgeGraphRelationships links claims and papers', () => {
        const graph = buildKnowledgeGraphRelationships({
            objectKey: 'paper:pmid-1',
            objectType: 'paper',
            topic: 'COPD exacerbation',
            articleUid: 'pmid-1',
            claimAnchors: [
                { claimKey: 'a1', claimText: 'Bottom line', conceptKey: 'clinical_bottom_line', articleUid: 'pmid-1' },
                { claimKey: 'a2', claimText: 'Do not overclaim', conceptKey: 'misconception_trap', articleUid: 'pmid-1' },
            ],
        });

        expect(graph.nodes.some((n) => n.id === 'paper:pmid-1')).toBe(true);
        expect(graph.edges.some((e) => e.relation === 'grounds')).toBe(true);
        expect(graph.edges.some((e) => e.relation === 'contrasts' || e.relation === 'relates_to')).toBe(true);
    });

    test('does not mark open access paper claims source-verified unless full text was used', () => {
        const object = buildPaperTeachingObject({
            topic: 'COPD exacerbation',
            article: {
                uid: 'pmid-abstract-only',
                title: 'Open access COPD trial',
                pmid: '2',
                isFree: true,
                abstract: 'Trial abstract only.',
            },
            synopsisResult: {
                provider: 'gemini',
                model: 'flash',
                timestamp: '2026-05-18T00:00:00.000Z',
                audit: {
                    fullTextCoverageRatio: 0,
                    reviewState: 'needs_revision',
                    abstractOnly: true,
                    sourceMode: 'abstract_only',
                },
                synopsis: {
                    mainFindings: 'Abstract reports no clear benefit.',
                    bottomLine: 'Do not infer mortality benefit.',
                    trustRating: 'MODERATE',
                    whatNotToOverclaim: ['Do not overclaim subgroup effects.'],
                },
            },
        });

        expect(object.payload.paper.isFree).toBe(true);
        expect(object.payload.paper.fullTextUsed).toBe(false);
        expect(object.payload.claimAnchors[0]).toMatchObject({
            verificationStatus: 'abstract_only',
            highCertaintyEligible: false,
        });
        expect(object.payload.claimAnchors[0].confidence).toBeLessThanOrEqual(0.42);
        expect(object.confidence).toBeLessThanOrEqual(0.42);
        expect(object.reviewState).toBeDefined();
        expect(object.payload.sourceMode).toBe('abstract_only');
    });

    test('turns consensus outputs into quiz context', () => {
        const object = buildConsensusTeachingObject({
            topic: 'sepsis',
            consensusSynopsis: {
                generatedAt: '2026-05-18T00:00:00.000Z',
                evidenceStrength: 'LOW',
                clinicalBottomLine: 'Bundle evidence is supportive but heterogeneous [1, 2].',
                quizFocusPoints: ['Know uncertainty.'],
                whatNotToOverclaim: ['Do not claim universal mortality benefit.'],
            },
            articles: [{ uid: 'a' }, { uid: 'b' }],
        });

        const context = teachingObjectsToQuizContext([{ ...object, payload: object.payload }]);
        expect(context).toContain('Consensus synopsis: sepsis');
        expect(context).toContain('claimKey=');
        expect(object.payload.claimAnchors[0].verificationStatus).toBe('synthesis_inferred');
        expect(context).toContain('Know uncertainty.');
        expect(context).toContain('Do not claim universal mortality benefit.');
    });

    test('evidence map flags stale or decayed topic memory', () => {
        const map = buildEvidenceMap({
            topic: 'GLP-1 agonists',
            topicKnowledge: {
                confidence: 0.9,
                lastRefreshedAt: '2024-01-01T00:00:00.000Z',
                knowledge: { keywords: ['glp-1'] },
            },
            articles: [{ uid: 'x', title: 'New trial', year: 2026, isFree: true }],
            teachingObjects: [],
        });

        expect(map.freshness.volatility).toBe('high');
        expect(map.freshness.confidenceDecay).toBeGreaterThan(0.25);
        expect(map.alerts.stale).toBe(true);
    });
});

describe('evidence quote placeholder-abstract guard', () => {
    // Found while triaging the guideline_uncertain review queue: a claim's stored
    // evidence_quote read exactly "International audience" -- HAL's audience-scope
    // metadata tag, stored verbatim as the abstract for some HAL-indexed preprints
    // that OpenAlex mirrors. The caveat claim itself was reasonable; its cited
    // "evidence" was a repository artifact, not supporting text. 17 claims across
    // 3 source articles carried this exact string in production.
    describe('isPlaceholderAbstract', () => {
        test('flags known repository metadata tags', () => {
            expect(isPlaceholderAbstract('International audience')).toBe(true);
            expect(isPlaceholderAbstract('international audience')).toBe(true);
            expect(isPlaceholderAbstract('  International audience  ')).toBe(true);
        });

        test('flags stringified empty values that reached the field as text', () => {
            // A null/0/[] that hit a String() call upstream and got stored as if
            // it were supporting text. Found on clinical_bottom_line and
            // main_findings claims in production, not just low-stakes concepts.
            for (const junk of ['null', 'Null', 'undefined', 'none', 'unknown', 'Not specified', '0', '[]', '{}']) {
                expect(isPlaceholderAbstract(junk)).toBe(true);
            }
        });

        test('does not flag real text that merely contains a placeholder word', () => {
            // The match is on the whole trimmed value, not a substring -- a real
            // abstract discussing "unknown aetiology" must survive.
            expect(isPlaceholderAbstract('Aetiology was unknown in 12 of 40 cases.')).toBe(false);
            expect(isPlaceholderAbstract('No abstract was available for the comparator trial, so it was excluded.')).toBe(false);
        });

        test('flags common "no abstract" placeholders', () => {
            expect(isPlaceholderAbstract('No abstract')).toBe(true);
            expect(isPlaceholderAbstract('No abstract available')).toBe(true);
            expect(isPlaceholderAbstract('N/A')).toBe(true);
        });

        test('does not flag a real abstract that happens to be short', () => {
            expect(isPlaceholderAbstract('Aspirin reduced mortality by 12% at 30 days.')).toBe(false);
        });

        test('does not flag empty or missing input as placeholder text', () => {
            // Absence is handled by the caller (falls through to fallback), not here.
            expect(isPlaceholderAbstract('')).toBe(false);
            expect(isPlaceholderAbstract(null)).toBe(false);
            expect(isPlaceholderAbstract(undefined)).toBe(false);
        });
    });

    describe('evidenceQuoteFromArticle', () => {
        test('uses a real abstract when present', () => {
            const quote = evidenceQuoteFromArticle({ abstract: 'Aspirin reduced 30-day mortality.' }, 'fallback');
            expect(quote).toBe('Aspirin reduced 30-day mortality.');
        });

        test('falls through to the fallback when the abstract is a placeholder', () => {
            const quote = evidenceQuoteFromArticle({ abstract: 'International audience' }, 'Real fallback claim text');
            expect(quote).toBe('Real fallback claim text');
        });

        test('returns null rather than a placeholder when the fallback is also a placeholder', () => {
            const quote = evidenceQuoteFromArticle({ abstract: 'International audience' }, 'No abstract available');
            expect(quote).toBeNull();
        });

        test('returns null rather than a placeholder when neither abstract nor fallback is usable', () => {
            expect(evidenceQuoteFromArticle({}, '')).toBeNull();
        });
    });

    test('buildPaperTeachingObject never stores a placeholder as a claim evidence_quote', () => {
        const object = buildPaperTeachingObject({
            topic: 'inflammatory bowel disease',
            article: {
                uid: 'openalex-w4293217392',
                title: 'IBD classification definitions',
                abstract: 'International audience',
                pmid: null,
            },
            synopsisResult: {
                provider: 'gemini',
                model: 'flash',
                timestamp: '2026-05-18T00:00:00.000Z',
                audit: { fullTextCoverageRatio: 1 },
                synopsis: {
                    bottomLine: 'Do not assume these definitions improve patient outcomes without validation.',
                    trustRating: 'MODERATE',
                    quizFocusPoints: ['Understand the scope of these classification definitions.'],
                },
            },
        });

        const quotes = (object.claims || []).map((c) => c.evidenceQuote).filter(Boolean);
        for (const quote of quotes) {
            expect(quote.toLowerCase()).not.toBe('international audience');
        }
    });
});
