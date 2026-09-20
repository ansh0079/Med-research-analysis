'use strict';

const {
    STATUS,
    extractMaterialClaims,
    assessClaim,
    buildClaimSupport,
    isJudgeCalibrated,
    applyJudgeVerdicts,
    capVerificationForSupport,
    applyServingPolicy,
    claimSupportMode,
} = require('../../server/services/synopsisClaimSupport');
const { buildSourceVersion } = require('../../server/services/search/searchEvidenceSnapshot');

const ARTICLE = {
    uid: 'pubmed-31535829',
    pmid: '31535829',
    title: 'Dapagliflozin in patients with heart failure and reduced ejection fraction',
    abstract: 'Heart failure with reduced ejection fraction carries high mortality. '
        + 'We randomized 4744 adults with heart failure to dapagliflozin or placebo. '
        + 'Dapagliflozin reduced the risk of worsening heart failure or cardiovascular death (hazard ratio 0.74; 95% CI 0.65 to 0.85). '
        + 'Serious adverse events did not differ between groups. '
        + 'Dapagliflozin may reduce cardiovascular death in adults with heart failure; the trend in older adults was not statistically significant.',
};

const version = buildSourceVersion(ARTICLE);
const assess = (text, article = ARTICLE) => assessClaim(
    { claimId: 'c1', field: 'mainFindings', text, hadCitation: false, compound: false },
    buildSourceVersion(article),
);

describe('claim extraction', () => {
    test('splits material fields into sentences with stable ids, and strips citation markers', () => {
        const claims = extractMaterialClaims({
            bottomLine: 'Dapagliflozin reduced cardiovascular death in adults with heart failure [1]. It did not change serious adverse events [1].',
            mainFindings: ['Hazard ratio 0.74 for the primary composite outcome.', 'A second clearly separate finding sentence here.'],
            limitations: 'Not a material field so it is ignored by this check entirely.',
        });
        expect(claims.map((c) => c.claimId)).toEqual(['bottomLine:1', 'bottomLine:2', 'mainFindings:1', 'mainFindings:2']);
        expect(claims[0]).toMatchObject({ text: 'Dapagliflozin reduced cardiovascular death in adults with heart failure .', hadCitation: true });
        expect(claims[2].hadCitation).toBe(false);
    });

    test('clauses joined by ; whereas while or but are separate, individually traceable claims', () => {
        const claims = extractMaterialClaims({ mainFindings: 'Dapagliflozin reduced cardiovascular death; serious adverse events did not differ between groups.' });
        expect(claims.map((c) => c.claimId)).toEqual(['mainFindings:1.1', 'mainFindings:1.2']);
        expect(claims.every((c) => c.compound)).toBe(true);
    });

    test('an empty or absent synopsis has no claims', () => {
        expect(extractMaterialClaims({})).toEqual([]);
        expect(extractMaterialClaims({ bottomLine: 'Too short.' })).toEqual([]);
    });
});

describe('the checks the old word-overlap grounding could not make', () => {
    test('a faithful claim is consistent with the source but NOT verified: no claim is supported on overlap alone', () => {
        const a = assess('Dapagliflozin reduced the risk of worsening heart failure or cardiovascular death (hazard ratio 0.74).');
        expect(a.flags).toEqual([]);
        expect(a.status).toBe(STATUS.UNJUDGED);
        expect(a.status).not.toBe(STATUS.SUPPORTED);
        expect(a.basis).toBe('deterministic');
        expect(a.score).toBeGreaterThan(0.5);
    });

    test('reversed meaning: the same words and the same number, opposite direction', () => {
        const a = assess('Dapagliflozin increased the risk of worsening heart failure or cardiovascular death (hazard ratio 0.74).');
        expect(a.status).toBe(STATUS.UNSUPPORTED);
        expect(a.flags).toContain('direction_conflict');
    });

    test('negation flipped: "did not reduce" against a passage that says it reduced', () => {
        const a = assess('Dapagliflozin did not reduce the risk of worsening heart failure or cardiovascular death.');
        expect(a.status).toBe(STATUS.UNSUPPORTED);
        expect(a.flags).toContain('polarity_conflict');
    });

    test('a population the source never studied', () => {
        const a = assess('Dapagliflozin reduced the risk of cardiovascular death in children with heart failure.');
        expect(a.status).toBe(STATUS.UNSUPPORTED);
        expect(a.flags).toContain('population_mismatch');
    });

    test('a number that is in the source but not in the passage the claim rests on is out of context', () => {
        const a = assess('Serious adverse events did not differ between groups (hazard ratio 0.74).');
        expect(a.flags).toContain('number_out_of_context');
        expect(a.status).toBe(STATUS.PARTIAL);
        expect(a.passageIds[0]).toBe(`${version.id.slice(0, 12)}:abstract:4`);
    });

    test('a number that appears nowhere in the source is unsupported', () => {
        const a = assess('Dapagliflozin reduced the risk of worsening heart failure or cardiovascular death (hazard ratio 0.52).');
        expect(a.status).toBe(STATUS.UNSUPPORTED);
        expect(a.flags).toContain('number_not_in_source');
    });

    test('certainty the source does not carry: a hedged finding stated as demonstrated', () => {
        const a = assess('Dapagliflozin demonstrates a reduction in cardiovascular death in adults with heart failure.');
        expect(a.flags).toContain('uncertainty_dropped');
        expect(a.status).toBe(STATUS.PARTIAL);
    });

    test('recommendation strength from a trial abstract is not supported; from a guideline it is', () => {
        const claim = 'Dapagliflozin should be given to adults with heart failure to reduce cardiovascular death.';
        expect(assess(claim).flags).toContain('recommendation_strength_unsupported');
        const guideline = { ...ARTICLE, pubtype: ['Practice Guideline'], abstract: `${ARTICLE.abstract}` };
        const viaGuideline = buildClaimSupport({ mainFindings: claim }, guideline).claims[0];
        expect(viaGuideline.flags).not.toContain('recommendation_strength_unsupported');
    });

    test('a claim with nothing in the source that resembles it has no supporting passage', () => {
        const a = assess('Warfarin dosing requires periodic monitoring of the international normalised ratio in outpatients.');
        expect(a.status).toBe(STATUS.UNSUPPORTED);
        expect(a.flags).toContain('no_supporting_passage');
    });

    test('a compound claim is split, and only the unsupported half is unsupported', () => {
        const support = buildClaimSupport(
            { mainFindings: 'Dapagliflozin reduced cardiovascular death; serious adverse events increased in the treatment group.' },
            ARTICLE,
        );
        expect(support.claims.map((c) => c.claimId)).toEqual(['mainFindings:1.1', 'mainFindings:1.2']);
        expect(support.claims[0].status).toBe(STATUS.PARTIAL); // compound: needs its own evidence, not yet judged
        expect(support.claims[1].status).toBe(STATUS.UNSUPPORTED);
        expect(support.claims[1].flags).toEqual(expect.arrayContaining(['polarity_conflict']));
    });
});

describe('source availability and access state', () => {
    test('no source text is source_unavailable, never supported', () => {
        const a = assess('Dapagliflozin reduced the risk of cardiovascular death in adults.', { uid: 'x', title: '' });
        expect(a).toMatchObject({ status: STATUS.SOURCE_UNAVAILABLE, flags: ['source_text_unavailable'], passageIds: [] });
    });

    test('an abstract-only source is labelled as such, and full text as full_text', () => {
        expect(buildClaimSupport({ bottomLine: 'Dapagliflozin reduced cardiovascular death in adults with heart failure.' }, ARTICLE).accessState).toBe('abstract_only');
        const withText = { ...ARTICLE, sections: { Results: 'word '.repeat(60) } };
        expect(buildClaimSupport({ bottomLine: 'Dapagliflozin reduced cardiovascular death in adults with heart failure.' }, withText).accessState).toBe('full_text');
    });

    test('claims point at the same source version and passage ids the evidence snapshot stores', () => {
        const support = buildClaimSupport({ mainFindings: 'Dapagliflozin reduced the risk of worsening heart failure or cardiovascular death (hazard ratio 0.74).' }, ARTICLE);
        expect(support.sourceVersionId).toBe(version.id);
        expect(version.passages.map((p) => p.id)).toContain(support.claims[0].passageIds[0]);
        expect(support.claims[0].evidenceSpan).toContain('hazard ratio 0.74');
    });
});

describe('a model judge counts only once it has been calibrated against human labels', () => {
    const base = () => buildClaimSupport({ mainFindings: 'Dapagliflozin reduced the risk of worsening heart failure or cardiovascular death (hazard ratio 0.74).' }, ARTICLE).claims;
    const CALIBRATED = { kappa: 0.72, labelledItems: 200, labelledBy: 'Dr Reviewer', calibratedAt: '2026-09-20' };

    test('calibration needs kappa, enough independently labelled items, a named labeller and a date', () => {
        expect(isJudgeCalibrated(CALIBRATED)).toBe(true);
        expect(isJudgeCalibrated(null)).toBe(false);
        expect(isJudgeCalibrated({ ...CALIBRATED, kappa: 0.4 })).toBe(false);
        expect(isJudgeCalibrated({ ...CALIBRATED, labelledItems: 20 })).toBe(false);
        expect(isJudgeCalibrated({ ...CALIBRATED, labelledBy: '' })).toBe(false);
    });

    test('an uncalibrated judge saying "supported" is recorded but does not verify the claim', () => {
        const [a] = applyJudgeVerdicts(base(), { 'mainFindings:1': { verdict: 'supported', reason: 'states it' } }, null);
        expect(a).toMatchObject({ status: STATUS.UNJUDGED, basis: 'judge_uncalibrated' });
        expect(a.judge).toMatchObject({ verdict: 'supported', calibrated: false });
    });

    test('a calibrated judge can raise an unflagged claim to supported', () => {
        const [a] = applyJudgeVerdicts(base(), { 'mainFindings:1': { verdict: 'supported' } }, CALIBRATED);
        expect(a).toMatchObject({ status: STATUS.SUPPORTED, basis: 'judge' });
    });

    test('a judge cannot override a hard deterministic conflict', () => {
        const reversed = buildClaimSupport({ mainFindings: 'Dapagliflozin increased the risk of worsening heart failure or cardiovascular death (hazard ratio 0.74).' }, ARTICLE).claims;
        const [a] = applyJudgeVerdicts(reversed, { 'mainFindings:1': { verdict: 'supported' } }, CALIBRATED);
        expect(a.status).toBe(STATUS.UNSUPPORTED);
    });

    test('a judge can lower a claim, and its failure is judge_error, never a default verdict', () => {
        expect(applyJudgeVerdicts(base(), { 'mainFindings:1': { verdict: 'unsupported' } }, CALIBRATED)[0].status).toBe(STATUS.UNSUPPORTED);
        expect(applyJudgeVerdicts(base(), { 'mainFindings:1': { verdict: 'partially_supported' } }, CALIBRATED)[0].status).toBe(STATUS.PARTIAL);
        expect(applyJudgeVerdicts(base(), { 'mainFindings:1': null }, CALIBRATED)[0]).toMatchObject({ status: STATUS.JUDGE_ERROR, basis: 'judge' });
        expect(applyJudgeVerdicts(base(), { 'mainFindings:1': { verdict: 'passage_unusable' } }, CALIBRATED)[0].status).toBe(STATUS.SOURCE_UNAVAILABLE);
    });

    test('a claim the judge was not asked about is left alone', () => {
        expect(applyJudgeVerdicts(base(), {}, CALIBRATED)).toEqual(base());
    });
});

describe('verification labels and serving', () => {
    const status = (s) => ({ status: s });

    test('shadow (default): labels are never changed by claim support', () => {
        expect(claimSupportMode({})).toBe('shadow');
        expect(capVerificationForSupport('source_verified', status(STATUS.UNSUPPORTED), {})).toBe('source_verified');
    });

    test('enforce: only a supported claim keeps a provenance-asserting label', () => {
        const env = { SYNOPSIS_CLAIM_SUPPORT: 'enforce' };
        expect(capVerificationForSupport('source_verified', status(STATUS.SUPPORTED), env)).toBe('source_verified');
        expect(capVerificationForSupport('source_verified', status(STATUS.UNJUDGED), env)).toBe('abstract_only');
        expect(capVerificationForSupport('source_verified', status(STATUS.PARTIAL), env)).toBe('abstract_only');
        for (const s of [STATUS.UNSUPPORTED, STATUS.SOURCE_UNAVAILABLE, STATUS.JUDGE_ERROR]) {
            expect(capVerificationForSupport('guideline_supported', status(s), env)).toBe('unverified');
        }
        expect(capVerificationForSupport('abstract_only', status(STATUS.UNSUPPORTED), env)).toBe('abstract_only');
    });

    test('annotate (default) serves the text and lists unsupported and uncertain claims', () => {
        const synopsis = { mainFindings: 'Dapagliflozin reduced cardiovascular death in adults. Dapagliflozin increased the risk of worsening heart failure or cardiovascular death (hazard ratio 0.74).' };
        const support = buildClaimSupport(synopsis, ARTICLE);
        const served = applyServingPolicy(synopsis, support.claims, { mode: 'annotate' });
        expect(served.synopsis).toEqual(synopsis);
        expect(served.servingPolicy.unsupported.map((u) => u.claimId)).toEqual(['mainFindings:2']);
        expect(served.servingPolicy.withheld).toEqual([]);
    });

    test('withhold removes unsupported sentences from the served field and records that it did', () => {
        const synopsis = { mainFindings: 'Dapagliflozin reduced cardiovascular death in adults. Dapagliflozin increased the risk of worsening heart failure or cardiovascular death (hazard ratio 0.74).' };
        const support = buildClaimSupport(synopsis, ARTICLE);
        const served = applyServingPolicy(synopsis, support.claims, { mode: 'withhold' });
        expect(served.synopsis.mainFindings).toBe('Dapagliflozin reduced cardiovascular death in adults.');
        expect(served.servingPolicy.withheld).toEqual(['mainFindings']);
        expect(synopsis.mainFindings).toContain('increased'); // the input is not mutated
    });
});

describe('asking the judge', () => {
    const { judgeClaimSupport, judgeEnabled, loadJudgeCalibration } = require('../../server/services/synopsisClaimSupport');

    test('only claims with a passage and no hard conflict are sent, and a failing judge call becomes null (judge_error)', async () => {
        const support = buildClaimSupport({
            mainFindings: 'Dapagliflozin reduced the risk of worsening heart failure or cardiovascular death (hazard ratio 0.74). Dapagliflozin increased the risk of worsening heart failure or cardiovascular death (hazard ratio 0.74). Serious adverse events did not differ between groups.',
        }, ARTICLE);
        const seen = [];
        const judge = jest.fn(async ({ claimText }) => {
            seen.push(claimText);
            if (/did not differ/.test(claimText)) throw new Error('provider down');
            return { verdict: 'supported', reason: 'states it' };
        });
        const verdicts = await judgeClaimSupport(support.claims, { judge });
        expect(seen).toHaveLength(2); // the reversed claim is unsupported already and is not sent
        expect(verdicts['mainFindings:1']).toMatchObject({ verdict: 'supported' });
        expect(verdicts['mainFindings:2']).toBeUndefined();
        expect(verdicts['mainFindings:3']).toBeNull();
    });

    test('the judge is off by default and there is no shipped calibration record', () => {
        expect(judgeEnabled({})).toBe(false);
        expect(judgeEnabled({ SYNOPSIS_SUPPORT_JUDGE: 'on' })).toBe(true);
        expect(loadJudgeCalibration('/no/such/file.json')).toBeNull();
        expect(loadJudgeCalibration()).toBeNull(); // nothing ships one: it needs a clinician's labels
    });
});
