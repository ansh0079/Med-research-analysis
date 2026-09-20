'use strict';

/**
 * Shared write-policy contract. Writers keep their own tables; they call this
 * before persist. Not a monolithic write service.
 *
 * Deterministic gates (schema, concept key, item form) block from day one.
 * Entailment stays in shadow until a clinician-labelled kappa is measured.
 */

const { findWritePath } = require('./writePathInventory');
const { recordPolicyDecision } = require('./policyDecisionLog');
const { REASON_CODES, TASK_WORD_KEYS } = require('./reasonCodes');
const { originalConditionTerms } = require('../../utils/conditionQuery');
const { claimStructureFindings, mcqFormFindings, claimKind } = require('../../utils/evidenceSupport');

const MCQ_OBJECT_TYPES = new Set([
    'guideline_mcq',
    'paper_mcq',
    'cold_start_mcq',
    'live_quiz_mcq',
    'mcq',
    'quiz',
]);

function entailmentMode() {
    const mode = String(process.env.POLICY_ENTAILMENT_MODE || 'shadow').toLowerCase();
    return mode === 'block' ? 'block' : 'shadow';
}

function reason(code, detail) {
    return detail ? { code, detail } : { code };
}

function topicKey(payload = {}) {
    return String(payload.topic || payload.displayTopic || payload.normalizedTopic || '').trim();
}

function isTaskWordKey(topic) {
    const tokens = String(topic || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (!tokens.length) return true;
    return tokens.every((token) => TASK_WORD_KEYS.includes(token));
}

function hasProvenance(payload = {}) {
    return Boolean(
        payload.sourceUrl
        || payload.documentId
        || payload.pmcid
        || payload.doi
        || payload.documentUid
        || payload.provenanceUrl
    );
}

function collectMcqs(payload = {}) {
    if (Array.isArray(payload.mcqs)) return payload.mcqs;
    if (Array.isArray(payload.questions)) return payload.questions;
    if (payload.options && (payload.correctAnswer != null || payload.correct != null)) {
        return [payload];
    }
    return [];
}

function evaluateGuideline(payload = {}) {
    const blocking = [];
    if (!String(payload.sourceBody || payload.issuer || '').trim()) {
        blocking.push(reason(REASON_CODES.SCHEMA_MISSING_ISSUER));
    }
    const year = payload.sourceYear ?? payload.year ?? payload.edition;
    if (year == null || String(year).trim() === '') {
        blocking.push(reason(REASON_CODES.SCHEMA_MISSING_EDITION));
    }
    if (!hasProvenance(payload)) {
        blocking.push(reason(REASON_CODES.SCHEMA_MISSING_PROVENANCE));
    }
    evaluateConceptKey(payload, blocking);
    return { blocking, shadow: [] };
}

function evaluateConceptKey(payload, blocking) {
    const topic = topicKey(payload);
    if (payload.conceptId) return;
    if (isTaskWordKey(topic)) {
        blocking.push(reason(REASON_CODES.CONCEPT_TASK_WORD_KEY, topic || '(empty)'));
        return;
    }
    if (originalConditionTerms(topic).length === 0) {
        blocking.push(reason(REASON_CODES.CONCEPT_UNRESOLVED, topic || '(empty)'));
    }
}

function evaluateTopicKnowledge(payload = {}) {
    const blocking = [];
    evaluateConceptKey(payload, blocking);
    return { blocking, shadow: [] };
}

function evaluateTeachingObject(payload = {}) {
    const blocking = [];
    const shadow = [];
    const objectType = String(payload.objectType || '').toLowerCase();
    const body = payload.payload && typeof payload.payload === 'object' ? payload.payload : payload;

    if (MCQ_OBJECT_TYPES.has(objectType)) {
        const questions = collectMcqs(body);
        if (!questions.length) {
            blocking.push(reason(REASON_CODES.ITEM_FORM_NO_ANSWER, 'no questions'));
        }
        for (const mcq of questions) {
            const findings = mcqFormFindings(mcq);
            if (findings.some((f) => f.code === 'no_answer_key' || f.code === 'fewer_than_two_options' || f.code === 'answer_key_not_among_options')) {
                blocking.push(reason(REASON_CODES.ITEM_FORM_NO_ANSWER, findings[0]?.code));
            }
            if (findings.some((f) => f.code === 'key_is_longest_option')) {
                blocking.push(reason(REASON_CODES.ITEM_FORM_CUED));
            }
        }
    }

    const claims = Array.isArray(body.claims) ? body.claims : [];
    for (const claim of claims) {
        const kind = claimKind(claim.sourcePath);
        if (kind === 'meta') continue;
        const findings = claimStructureFindings({
            claimText: claim.claimText || claim.text,
            evidenceQuote: claim.evidenceQuote || claim.quote,
        });
        if (findings.length) {
            shadow.push(reason(REASON_CODES.ENTAILMENT_UNSUPPORTED, findings.map((f) => f.code).join(',')));
        }
    }
    return { blocking, shadow };
}

function evaluateGuidelineRefiling(payload = {}) {
    const blocking = [];
    if (!payload.guidelineId) {
        blocking.push(reason(REASON_CODES.IDENTITY_MISSING_SOURCE, 'guidelineId+canonicalNormalized'));
        return { blocking, shadow: [] };
    }
    const canonical = String(payload.canonicalNormalized || '').trim();
    const similarity = Number(payload.similarity);
    if (!canonical) {
        // Empty canonical + similarity 0 is the below-threshold marker so the
        // row is not re-embedded every batch. That is not a policy event.
        if (payload.belowThreshold === true || similarity === 0) {
            return { blocking, shadow: [] };
        }
        blocking.push(reason(REASON_CODES.IDENTITY_MISSING_SOURCE, 'guidelineId+canonicalNormalized'));
        return { blocking, shadow: [] };
    }
    if (isTaskWordKey(canonical)) {
        blocking.push(reason(REASON_CODES.CONCEPT_TASK_WORD_KEY, canonical));
    }
    // Cosine of near-identical vectors can land a float error above 1.
    if (!Number.isFinite(similarity) || similarity <= 0 || similarity > 1.0001) {
        blocking.push(reason(REASON_CODES.BRIDGE_SIMILARITY_INVALID, String(payload.similarity)));
    }
    return { blocking, shadow: [] };
}

function evaluateTopicAlias(payload = {}) {
    const blocking = [];
    if (!String(payload.topic || '').trim() || !payload.curriculumTopicId) {
        blocking.push(reason(REASON_CODES.IDENTITY_MISSING_SOURCE, 'topic+curriculumTopicId'));
        return { blocking, shadow: [] };
    }
    if (isTaskWordKey(payload.topic)) {
        blocking.push(reason(REASON_CODES.CONCEPT_TASK_WORD_KEY, String(payload.topic)));
    }
    return { blocking, shadow: [] };
}

function evaluateCurriculumTopic(payload = {}) {
    const blocking = [];
    const name = String(payload.displayName || payload.topic || '').trim();
    if (!name) {
        blocking.push(reason(REASON_CODES.CONCEPT_UNRESOLVED, '(empty)'));
    } else if (isTaskWordKey(name)) {
        blocking.push(reason(REASON_CODES.CONCEPT_TASK_WORD_KEY, name));
    }
    return { blocking, shadow: [] };
}

function evaluateGuidelineConflict(payload = {}) {
    const blocking = [];
    if (!String(payload.conflictHash || '').trim()) {
        blocking.push(reason(REASON_CODES.IDENTITY_MISSING_SOURCE, 'conflictHash'));
    }
    if (!String(payload.trialClaim || '').trim() || !String(payload.guidelineClaim || '').trim()) {
        blocking.push(reason(REASON_CODES.SCHEMA_MISSING_PROVENANCE, 'trialClaim+guidelineClaim'));
    }
    evaluateConceptKey({ topic: payload.normalizedTopic }, blocking);
    return { blocking, shadow: [] };
}

function evaluateGuidelineWatch(payload = {}) {
    const blocking = [];
    // Topic-level events (e.g. regional divergence) carry only a topic; that is a valid identity.
    const hasTopic = Boolean(String(payload.normalizedTopic || '').trim());
    if (!payload.guidelineId && !String(payload.claimKey || '').trim() && !hasTopic) {
        blocking.push(reason(REASON_CODES.IDENTITY_MISSING_SOURCE, 'guidelineId|claimKey|normalizedTopic'));
    }
    if (hasTopic) evaluateConceptKey({ topic: payload.normalizedTopic }, blocking);
    return { blocking, shadow: [] };
}

function evaluateRegistryEntry(payload = {}) {
    const blocking = [];
    evaluateConceptKey({ topic: payload.conceptName }, blocking);
    if (!String(payload.issuer || '').trim()) blocking.push(reason(REASON_CODES.SCHEMA_MISSING_ISSUER));
    const edition = payload.year ?? payload.version;
    if (edition == null || String(edition).trim() === '') blocking.push(reason(REASON_CODES.SCHEMA_MISSING_EDITION));
    if (!String(payload.sourceUrl || '').trim()) blocking.push(reason(REASON_CODES.SCHEMA_MISSING_PROVENANCE, 'sourceUrl'));
    if (!Array.isArray(payload.guidelineIds) || payload.guidelineIds.length === 0) {
        blocking.push(reason(REASON_CODES.IDENTITY_MISSING_SOURCE, 'guidelineIds'));
    }
    return { blocking, shadow: [] };
}

function evaluateRegistryVerification(payload = {}) {
    const blocking = [];
    if (!String(payload.reviewer || '').trim()) {
        blocking.push(reason(REASON_CODES.IDENTITY_MISSING_SOURCE, 'reviewer'));
    }
    if (!(Number(payload.recommendationCount) > 0)) {
        blocking.push(reason(REASON_CODES.SCHEMA_MISSING_PROVENANCE, 'no linked recommendations'));
    }
    return { blocking, shadow: [] };
}

function evaluateWrite(input = {}) {
    const writer = String(input.writer || '').trim();
    const path = findWritePath(writer);
    const family = path?.family || input.family || 'unclassified';
    const payload = input.payload && typeof input.payload === 'object' ? input.payload : {};

    let blocking = [];
    let shadow = [];
    if (family === 'guideline') {
        ({ blocking, shadow } = evaluateGuideline(payload));
    } else if (family === 'topic_knowledge') {
        ({ blocking, shadow } = evaluateTopicKnowledge(payload));
    } else if (family === 'teaching_object') {
        ({ blocking, shadow } = evaluateTeachingObject(payload));
    } else if (family === 'guideline_refiling') {
        ({ blocking, shadow } = evaluateGuidelineRefiling(payload));
    } else if (family === 'topic_alias') {
        ({ blocking, shadow } = evaluateTopicAlias(payload));
    } else if (family === 'curriculum') {
        ({ blocking, shadow } = evaluateCurriculumTopic(payload));
    } else if (family === 'guideline_conflict') {
        ({ blocking, shadow } = evaluateGuidelineConflict(payload));
    } else if (family === 'guideline_watch') {
        ({ blocking, shadow } = evaluateGuidelineWatch(payload));
    } else if (family === 'registry_entry') {
        ({ blocking, shadow } = evaluateRegistryEntry(payload));
    } else if (family === 'registry_verification') {
        ({ blocking, shadow } = evaluateRegistryVerification(payload));
    }

    if (entailmentMode() === 'block' && shadow.length) {
        blocking = blocking.concat(shadow);
        shadow = [];
    }

    const action = blocking.length ? 'reject' : 'accept';
    return {
        writer,
        family,
        action,
        allowed: action === 'accept',
        reasons: blocking,
        shadow,
        entailmentMode: entailmentMode(),
    };
}

function shouldLogDecision(verdict) {
    if (verdict.action !== 'accept') return true;
    const path = findWritePath(verdict.writer);
    return path?.logAccepts !== false;
}

async function applyWritePolicy(db, input = {}) {
    const verdict = evaluateWrite(input);
    if (!shouldLogDecision(verdict)) return verdict;
    const reasonText = [
        ...verdict.reasons.map((row) => row.code),
        ...verdict.shadow.map((row) => `shadow:${row.code}`),
    ].join(',') || null;
    await recordPolicyDecision(db, {
        writer: verdict.writer,
        family: verdict.family,
        action: verdict.action,
        reason: reasonText,
        entityType: input.entityType || verdict.family,
        entityId: input.entityId || null,
        conceptId: input.payload?.conceptId || null,
        payload: {
            reasonCodes: verdict.reasons,
            shadow: verdict.shadow,
            entailmentMode: verdict.entailmentMode,
        },
    }).catch(() => ({ recorded: false }));
    return verdict;
}

module.exports = {
    evaluateWrite,
    applyWritePolicy,
    entailmentMode,
    REASON_CODES,
    TASK_WORD_KEYS,
    MCQ_OBJECT_TYPES,
};
