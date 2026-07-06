'use strict';

const logger = require('../config/logger');
const { CLAIM_VERIFICATION, stableClaimKey } = require('./teachingObjectService');

const CLAIM_REF_PATTERN = /\[(?:CLAIM-[a-f0-9]{8,}|RES-\d+|MEM-\d+|G\d+)[^\]]*\]/i;

function mapExtractedClaim(sentence, { topic, objectKey, ordinal }) {
    const text = String(sentence).trim();
    return {
        claimKey: stableClaimKey(objectKey, text),
        ordinal,
        claimText: text,
        evidenceQuote: null,
        sourcePath: 'agent.answer',
        topic,
        conceptKey: 'agent_grounded_answer',
        confidence: 0.45,
        verificationStatus: CLAIM_VERIFICATION.AGENT_DRAFT,
        verificationReason: 'Claim was extracted from an agent chat answer and has not been source-verified.',
    };
}

/**
 * Regex fallback — sentence-boundary extraction for citation-marked claims.
 */
function extractGroundedClaimsFromReply(reply, { topic, objectKey }) {
    return String(reply || '')
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length >= 40 && sentence.length <= 700 && CLAIM_REF_PATTERN.test(sentence))
        .slice(0, 6)
        .map((sentence, ordinal) => mapExtractedClaim(sentence, { topic, objectKey, ordinal }));
}

/**
 * Structured claim extraction via LLM JSON output. Falls back to regex on error.
 */
async function extractGroundedClaimsStructured(reply, { topic, objectKey }, ai, provider, model) {
    try {
        const parsed = await ai.callStructured(
            `Extract grounded claims from this medical AI assistant reply. A grounded claim is a factual clinical assertion explicitly backed by a citation marker in the text (e.g. [RES-1], [MEM-3], [CLAIM-...], [G1]).

Reply:
${String(reply || '').slice(0, 4000)}

Topic: ${topic}

Return JSON with this exact shape:
{"claims":[{"text":"<claim text, 40-700 chars>","citations":["RES-1"]}]}

Rules:
- Only include claims that have at least one explicit citation marker
- Do not fabricate citations
- Max 6 claims
- If no grounded claims exist, return {"claims":[]}`,
            provider,
            model,
            { temperature: 0.0, maxOutputTokens: 600, timeoutMs: 10000 }
        );
        const claims = Array.isArray(parsed?.claims) ? parsed.claims : [];
        return claims
            .filter((c) => c?.text && String(c.text).length >= 40 && String(c.text).length <= 700)
            .slice(0, 6)
            .map((c, ordinal) => mapExtractedClaim(String(c.text), { topic, objectKey, ordinal }));
    } catch (err) {
        logger.debug({ err }, 'Structured claim extraction failed; using regex fallback');
        return extractGroundedClaimsFromReply(reply, { topic, objectKey });
    }
}

module.exports = {
    extractGroundedClaimsFromReply,
    extractGroundedClaimsStructured,
    mapExtractedClaim,
};
