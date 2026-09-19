'use strict';

const {
    parseVerdict, cohensKappa, buildJudgeReport, buildJudgePrompt, VERDICTS,
} = require('../../server/services/evidenceSupportJudge');

describe('buildJudgePrompt', () => {
    it('shows the judge the passage and claim and nothing else', () => {
        // Topic or source title invites a plausibility rating instead of entailment.
        const prompt = buildJudgePrompt({
            claimText: 'Offer oral iron first-line.',
            evidenceQuote: 'Oral iron is recommended before parenteral therapy.',
        });
        expect(prompt).toContain('Offer oral iron first-line.');
        expect(prompt).toContain('Oral iron is recommended before parenteral therapy.');
        expect(prompt).toMatch(/Do not use\s+outside knowledge/);
    });
});

describe('parseVerdict', () => {
    it('accepts the four defined verdicts', () => {
        for (const verdict of VERDICTS) {
            expect(parseVerdict({ verdict, reason: 'because' })).toMatchObject({ verdict });
        }
    });

    it('rejects anything else rather than coercing it', () => {
        // "could not judge" must never become "supported".
        expect(parseVerdict({ verdict: 'probably fine' })).toBeNull();
        expect(parseVerdict({})).toBeNull();
        expect(parseVerdict(null)).toBeNull();
    });
});

describe('cohensKappa', () => {
    it('is 1 for perfect agreement', () => {
        const pairs = [
            { judge: 'supported', human: 'supported' },
            { judge: 'unsupported', human: 'unsupported' },
            { judge: 'supported', human: 'supported' },
        ];
        expect(cohensKappa(pairs).kappa).toBeCloseTo(1, 5);
    });

    it('is about zero for a judge that always says the majority label', () => {
        // 9 of 10 truly supported; a judge that always says "supported" agrees
        // 90% of the time and has discriminated nothing.
        const pairs = Array.from({ length: 10 }, (_, i) => ({
            judge: 'supported',
            human: i < 9 ? 'supported' : 'unsupported',
        }));
        const result = cohensKappa(pairs);
        expect(result.observedAgreement).toBeCloseTo(0.9, 5);
        expect(result.kappa).toBeCloseTo(0, 5);
    });

    it('is negative when the judge disagrees worse than chance', () => {
        const pairs = [
            { judge: 'supported', human: 'unsupported' },
            { judge: 'unsupported', human: 'supported' },
        ];
        expect(cohensKappa(pairs).kappa).toBeLessThan(0);
    });

    it('returns null with nothing to compare', () => {
        expect(cohensKappa([])).toBeNull();
    });
});

describe('buildJudgeReport', () => {
    const judged = Array.from({ length: 50 }, () => ({ verdict: 'supported' }));

    it('withholds reportability until enough human labels exist', () => {
        const report = buildJudgeReport({ judged, calibration: [] });
        expect(report.reportable).toBe(false);
        expect(report.caveat).toMatch(/not reportable/);
    });

    it('still withholds it on a calibration sample that is too small', () => {
        const calibration = Array.from({ length: 12 }, () => ({ judge: 'supported', human: 'supported' }));
        expect(buildJudgeReport({ judged, calibration }).reportable).toBe(false);
    });

    it('reports once agreement is established on a large enough sample', () => {
        const calibration = Array.from({ length: 40 }, (_, i) => ({
            judge: i % 2 ? 'supported' : 'unsupported',
            human: i % 2 ? 'supported' : 'unsupported',
        }));
        const report = buildJudgeReport({ judged, calibration });
        expect(report.reportable).toBe(true);
        expect(report.calibration.kappa).toBeCloseTo(1, 5);
        expect(report.counts.supported).toBe(50);
    });

    it('counts items the judge could not answer separately from unsupported ones', () => {
        const report = buildJudgeReport({ judged: [{ verdict: 'nonsense' }, null], calibration: [] });
        expect(report.noVerdict).toBe(2);
        expect(report.counts.unsupported).toBe(0);
    });
});
