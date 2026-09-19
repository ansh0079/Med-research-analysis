'use strict';

const { getProviderCandidates } = require('../utils/aiProvider');
const { getSharedAiService, TEMPERATURE } = require('./aiService');
const logger = require('../config/logger');

/**
 * Asks a model whether a claim follows from the passage it cites.
 *
 * This is the one question the structural pass cannot answer, and the one that
 * matters: a claim can share every word with its passage and still assert
 * something the passage does not say.
 *
 * Two constraints are built in rather than left to the caller.
 *
 * A judge drawn from the same family as the generator is not independent
 * evidence about the generator — it shares its blind spots and will wave
 * through the errors it would itself make. So the judge is always run over a
 * sample that a human also labels, and its numbers are reported next to its
 * agreement with those labels. A judged rate quoted without an agreement figure
 * is not a measurement, and buildJudgeReport refuses to produce one.
 *
 * And the judge sees only the claim and the passage. Giving it the topic or the
 * source title invites it to rate plausibility instead of entailment, which is
 * exactly the failure being looked for.
 */

/** Verdicts the judge may return. Anything else is treated as unusable. */
const VERDICTS = ['supported', 'partially_supported', 'unsupported', 'passage_unusable'];

function buildJudgePrompt({ claimText, evidenceQuote }) {
    return `You are auditing whether a clinical claim is supported by the passage it cites.

Judge ONLY whether the passage states or directly entails the claim. Do not use
outside knowledge. A claim may be true in medicine and still be unsupported by
this passage — that is "unsupported", not "supported".

PASSAGE:
"""${String(evidenceQuote || '').slice(0, 4000)}"""

CLAIM:
"""${String(claimText || '').slice(0, 2000)}"""

Reply with JSON only:
{"verdict": "supported" | "partially_supported" | "unsupported" | "passage_unusable",
 "reason": "<one sentence, quoting the decisive words from the passage if there are any>"}

"partially_supported": the passage supports part of the claim but the claim
  generalises beyond it, or adds a qualifier the passage does not carry.
"passage_unusable": the passage is truncated, is metadata or markup, or is not
  prose that could support anything.`;
}

function parseVerdict(raw) {
    const value = raw && typeof raw === 'object' ? raw : {};
    const verdict = String(value.verdict || '').trim().toLowerCase();
    if (!VERDICTS.includes(verdict)) return null;
    return { verdict, reason: String(value.reason || '').slice(0, 400) };
}

/**
 * @returns {Promise<{verdict: string, reason: string, provider: string, model: string}|null>}
 *   null when no provider could produce a usable verdict — never a default
 *   verdict, because "the judge could not answer" and "the claim is supported"
 *   must not collapse into the same value.
 */
async function judgeClaim({ claimText, evidenceQuote }, { serverConfig = {}, fetchImpl } = {}) {
    const candidates = getProviderCandidates({}, serverConfig);
    if (!candidates.length) return null;

    const ai = getSharedAiService({ serverConfig, fetchImpl });
    const prompt = buildJudgePrompt({ claimText, evidenceQuote });

    for (const { provider, model } of candidates) {
        try {
            const raw = await ai.callStructured(prompt, provider, model, {
                temperature: TEMPERATURE?.analysis ?? 0.2,
                maxOutputTokens: 512,
            });
            const parsed = parseVerdict(raw);
            if (parsed) return { ...parsed, provider, model };
            logger.warn({ provider, model }, 'evidenceSupportJudge: unusable verdict shape');
        } catch (error) {
            logger.warn({ provider, model, err: error.message }, 'evidenceSupportJudge: provider failed');
        }
    }
    return null;
}

/**
 * Cohen's kappa between judge and human labels over the same items.
 *
 * Raw agreement is not enough: if 90% of claims are supported, a judge that
 * always says "supported" agrees 90% of the time and has measured nothing.
 * Kappa is what separates that from a judge that is actually discriminating.
 */
function cohensKappa(pairs) {
    const usable = pairs.filter((p) => p && p.judge && p.human);
    const n = usable.length;
    if (n === 0) return null;

    const labels = [...new Set(usable.flatMap((p) => [p.judge, p.human]))];
    let observed = 0;
    for (const p of usable) if (p.judge === p.human) observed += 1;
    const po = observed / n;

    let pe = 0;
    for (const label of labels) {
        const judgeShare = usable.filter((p) => p.judge === label).length / n;
        const humanShare = usable.filter((p) => p.human === label).length / n;
        pe += judgeShare * humanShare;
    }
    if (pe === 1) return { n, observedAgreement: po, expectedAgreement: pe, kappa: null };
    return { n, observedAgreement: po, expectedAgreement: pe, kappa: (po - pe) / (1 - pe) };
}

/**
 * Refuses to report a judged rate without calibration evidence beside it.
 *
 * @param {{judged: Array<{verdict: string}>, calibration: Array<{judge: string, human: string}>}} input
 */
function buildJudgeReport({ judged = [], calibration = [] } = {}) {
    const counts = {};
    for (const verdict of VERDICTS) counts[verdict] = 0;
    let unusable = 0;
    for (const item of judged) {
        if (item && VERDICTS.includes(item.verdict)) counts[item.verdict] += 1;
        else unusable += 1;
    }

    const agreement = cohensKappa(calibration);
    return {
        judged: judged.length,
        noVerdict: unusable,
        counts,
        calibration: agreement,
        // The caller must not quote the rates above without this being true.
        reportable: Boolean(agreement && agreement.n >= 30 && agreement.kappa !== null),
        caveat: agreement && agreement.n >= 30
            ? null
            : 'Judged rates are not reportable until at least 30 human-labelled items establish agreement.',
    };
}

module.exports = {
    judgeClaim, buildJudgePrompt, parseVerdict, cohensKappa, buildJudgeReport, VERDICTS,
};
