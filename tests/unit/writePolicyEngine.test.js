'use strict';

const { evaluateWrite, applyWritePolicy, REASON_CODES } = require('../../server/services/policy/writePolicyEngine');

const balancedMcq = {
    correctAnswer: 'A',
    options: [
        'A: Start a beta-blocker after confirming euvolaemia on examination',
        'B: Start an ACE inhibitor after checking renal function and potassium',
        'C: Start a loop diuretic after documenting orthopnoea and oedema',
        'D: Start spironolactone after confirming potassium below 5.0 mmol/L',
    ],
};

const cuedMcq = {
    correctAnswer: 'B',
    options: [
        'A: Standard YEARS algorithm',
        'B: Pregnancy-adapted YEARS algorithm, which is validated in pregnancy and avoids unnecessary imaging while remaining safe and effective',
        'C: Immediate CT angiography',
        'D: V/Q scintigraphy first',
    ],
};

describe('write-policy engine', () => {
    test('rejects a guideline missing issuer, date, or provenance', () => {
        const verdict = evaluateWrite({
            writer: 'createGuideline',
            payload: {
                topic: 'acute kidney injury',
                recommendationText: 'Use KDIGO staging.',
            },
        });
        expect(verdict.allowed).toBe(false);
        expect(verdict.reasons.map((r) => r.code)).toEqual(expect.arrayContaining([
            REASON_CODES.SCHEMA_MISSING_ISSUER,
            REASON_CODES.SCHEMA_MISSING_EDITION,
            REASON_CODES.SCHEMA_MISSING_PROVENANCE,
        ]));
    });

    test('rejects a guideline filed under a task-word topic', () => {
        const verdict = evaluateWrite({
            writer: 'createGuideline',
            payload: {
                topic: 'management',
                sourceBody: 'KDIGO',
                sourceYear: 2012,
                sourceUrl: 'https://kdigo.org/guidelines/acute-kidney-injury/',
                recommendationText: 'Stage AKI.',
            },
        });
        expect(verdict.allowed).toBe(false);
        expect(verdict.reasons.map((r) => r.code)).toContain(REASON_CODES.CONCEPT_TASK_WORD_KEY);
    });

    test('accepts a named-body guideline on a real condition', () => {
        const verdict = evaluateWrite({
            writer: 'createGuideline',
            payload: {
                topic: 'hepatorenal syndrome',
                sourceBody: 'AGA Institute',
                sourceYear: 2024,
                sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/12345/',
                recommendationText: 'Terlipressin plus albumin is recommended for HRS-AKI.',
            },
        });
        expect(verdict.allowed).toBe(true);
        expect(verdict.action).toBe('accept');
    });

    test('rejects a cued MCQ and an MCQ with no answer', () => {
        const cued = evaluateWrite({
            writer: 'upsertTeachingObject',
            payload: { objectType: 'guideline_mcq', payload: { mcqs: [cuedMcq] } },
        });
        expect(cued.allowed).toBe(false);
        expect(cued.reasons.map((r) => r.code)).toContain(REASON_CODES.ITEM_FORM_CUED);

        const empty = evaluateWrite({
            writer: 'upsertTeachingObject',
            payload: { objectType: 'guideline_mcq', payload: { mcqs: [{ options: ['A: one', 'B: two'] }] } },
        });
        expect(empty.reasons.map((r) => r.code)).toContain(REASON_CODES.ITEM_FORM_NO_ANSWER);
    });

    test('accepts a balanced MCQ', () => {
        const verdict = evaluateWrite({
            writer: 'upsertTeachingObject',
            payload: { objectType: 'guideline_mcq', topic: 'heart failure', payload: { mcqs: [balancedMcq] } },
        });
        expect(verdict.allowed).toBe(true);
    });

    test('records entailment findings in shadow without rejecting', () => {
        const previous = process.env.POLICY_ENTAILMENT_MODE;
        delete process.env.POLICY_ENTAILMENT_MODE;
        const verdict = evaluateWrite({
            writer: 'upsertTeachingObject',
            payload: {
                objectType: 'paper',
                payload: {
                    claims: [{
                        sourcePath: 'synopsis.bottomLine',
                        claimText: 'Mortality fell by 32% with the intervention.',
                        evidenceQuote: '',
                    }],
                },
            },
        });
        expect(verdict.allowed).toBe(true);
        expect(verdict.shadow.map((r) => r.code)).toContain(REASON_CODES.ENTAILMENT_UNSUPPORTED);
        if (previous == null) delete process.env.POLICY_ENTAILMENT_MODE;
        else process.env.POLICY_ENTAILMENT_MODE = previous;
    });

    test('logs accept and reject through the decision store', async () => {
        const recorded = [];
        const db = {
            recordPolicyDecision: jest.fn(async (row) => {
                recorded.push(row);
                return row;
            }),
        };
        const rejected = await applyWritePolicy(db, {
            writer: 'createGuideline',
            payload: { topic: 'sg', recommendationText: 'Do a thing.' },
        });
        const accepted = await applyWritePolicy(db, {
            writer: 'createGuideline',
            payload: {
                topic: 'acute kidney injury',
                sourceBody: 'KDIGO',
                sourceYear: 2012,
                sourceUrl: 'https://kdigo.org/guidelines/acute-kidney-injury/',
                recommendationText: 'Stage AKI using serum creatinine.',
            },
        });
        expect(rejected.allowed).toBe(false);
        expect(accepted.allowed).toBe(true);
        expect(recorded.map((row) => row.action)).toEqual(['reject', 'accept']);
    });
});
