const {
    loadWorksheet,
    validateWorksheet,
    summarizeCoverage,
    checkDiversity,
    validateJudgments,
    validateGraduatedFixture,
    WorksheetError,
} = require('../../server/services/heldoutWorksheet');

describe('held-out labeling worksheet', () => {
    const sheet = loadWorksheet();

    test('ships a structurally valid scenario catalog', () => {
        expect(() => validateWorksheet(sheet)).not.toThrow();
        const cov = summarizeCoverage(sheet);
        expect(cov.total).toBeGreaterThanOrEqual(36);
        for (const intent of sheet.intents) {
            expect(cov.byIntent[intent] || 0).toBeGreaterThanOrEqual(5);
        }
        for (const dim of sheet.dimensions) {
            expect(cov.byDimension[dim] || 0).toBeGreaterThanOrEqual(5);
        }
    });

    test('covers every intent x dimension cell', () => {
        const cells = new Set(sheet.scenarios.map((s) => `${s.intent}/${s.dimension}`));
        for (const intent of sheet.intents) {
            for (const dim of sheet.dimensions) {
                expect(cells.has(`${intent}/${dim}`)).toBe(true);
            }
        }
    });

    test('rejects malformed worksheets', () => {
        expect(() => validateWorksheet({ kind: 'wrong' })).toThrow(WorksheetError);
        expect(() => validateWorksheet({ kind: 'heldout-labeling-worksheet', scenarios: [] })).toThrow(WorksheetError);
        const bad = JSON.parse(JSON.stringify(sheet));
        bad.scenarios[0].intent = 'not-an-intent';
        expect(() => validateWorksheet(bad)).toThrow(/intent/);
        const dup = JSON.parse(JSON.stringify(sheet));
        dup.scenarios[1].id = dup.scenarios[0].id;
        expect(() => validateWorksheet(dup)).toThrow(/duplicate scenario id/);
    });

    test('diversity guard flags family and cell skew', () => {
        const cases = [
            { family: 'cardiology', intent: 'treatment', dimension: 'abbreviation-ambiguity' },
            { family: 'cardiology', intent: 'treatment', dimension: 'abbreviation-ambiguity' },
            { family: 'cardiology', intent: 'treatment', dimension: 'abbreviation-ambiguity' },
            { family: 'nephrology', intent: 'diagnosis', dimension: 'absent-evidence' },
        ];
        const problems = checkDiversity(cases, { maxFamilyShare: 0.4, maxCellShare: 0.15 });
        expect(problems.join(' ')).toMatch(/family "cardiology"/);
        expect(problems.join(' ')).toMatch(/treatment\/abbreviation-ambiguity/);
    });

    test('aggregate guard maps graduated queries to scenarios by query text', () => {
        const { checkAggregateDiversity } = require('../../server/services/heldoutWorksheet');
        const s1 = sheet.scenarios.find((s) => s.id === 'S-DX-AMB-01');
        const s2 = sheet.scenarios.find((s) => s.id === 'S-TX-POP-01');
        const skewed = [
            { query: s1.query }, { query: s1.query }, { query: s1.query },
            { query: s2.query }, { query: s2.query }, { query: s2.query },
            { query: s2.query }, { query: s2.query }, { query: s2.query },
            { query: s2.query },
        ];
        const { problems, unknownQueries } = checkAggregateDiversity(skewed, sheet);
        expect(problems.length).toBeGreaterThan(0);
        expect(unknownQueries).toEqual([]);

        const unknown = checkAggregateDiversity([{ query: 'no such scenario query' }], sheet);
        expect(unknown.unknownQueries).toEqual(['no such scenario query']);
    });
});

describe('graduated held-out label validation', () => {
    const sheet = loadWorksheet();
    const scenario = sheet.scenarios.find((s) => s.id === 'S-DX-AMB-01');

    function graduated(overrides = {}) {
        return {
            version: 1,
            split: 'heldout',
            queries: [{
                scenarioId: scenario.id,
                query: scenario.query,
                relevantUids: ['uid-on'],
                offTopicUids: ['uid-off'],
                provenance: {
                    labelledBy: 'reviewer-a',
                    labelledAt: '2026-09-20',
                    source: 'adjudicated panel',
                    intendedSense: scenario.intendedSense,
                },
                judgments: [
                    { candidateUid: 'uid-on', labelledBy: 'reviewer-a', labelledAt: '2026-09-20', relevance: 'on-topic', applicability: 'applicable', evidenceType: 'guideline', support: 'passage' },
                    { candidateUid: 'uid-adj', labelledBy: 'reviewer-a', labelledAt: '2026-09-20', relevance: 'adjacent' },
                    { candidateUid: 'uid-off', labelledBy: 'reviewer-a', labelledAt: '2026-09-20', relevance: 'off-topic' },
                ],
                ...overrides,
            }],
        };
    }

    test('accepts a well-formed graduated fixture', () => {
        expect(validateGraduatedFixture(graduated(), sheet)).toEqual([]);
    });

    test('rejects judgments with invalid classes or missing reviewer fields', () => {
        const bad = graduated();
        bad.queries[0].judgments[0].relevance = 'sort-of';
        bad.queries[0].judgments[1].labelledBy = '';
        const problems = validateGraduatedFixture(bad, sheet);
        expect(problems.join(' ')).toMatch(/invalid relevance/);
        expect(problems.join(' ')).toMatch(/missing labelledBy/);
    });

    test('requires adjudication when two labelers disagree', () => {
        const bad = graduated();
        bad.queries[0].judgments.push({
            candidateUid: 'uid-on', labelledBy: 'reviewer-b', labelledAt: '2026-09-21', relevance: 'adjacent',
        });
        expect(validateGraduatedFixture(bad, sheet).join(' ')).toMatch(/without adjudication/);

        const fixed = graduated();
        fixed.queries[0].judgments.push({
            candidateUid: 'uid-on', labelledBy: 'reviewer-b', labelledAt: '2026-09-21', relevance: 'adjacent',
        });
        fixed.queries[0].adjudication = {
            adjudicatedBy: 'panel-chair',
            adjudicatedAt: '2026-09-22',
            resolutions: [{ candidateUid: 'uid-on', finalRelevance: 'on-topic', note: 'guideline names the condition explicitly' }],
        };
        expect(validateGraduatedFixture(fixed, sheet)).toEqual([]);
    });

    test('rejects cases that do not map to a worksheet scenario', () => {
        const bad = graduated();
        bad.queries[0].scenarioId = 'S-NOPE-99';
        expect(validateGraduatedFixture(bad, sheet).join(' ')).toMatch(/unknown scenarioId/);

        const mismatch = graduated();
        mismatch.queries[0].query = 'completely different query';
        expect(validateGraduatedFixture(mismatch, sheet).join(' ')).toMatch(/does not match scenario/);
    });
});
