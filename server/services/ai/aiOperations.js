'use strict';

/**
 * Every model call the app makes, by name, with the output budget and deadline it needs.
 *
 * Before this each call site chose its own maxOutputTokens and timeout, or none. With none, the
 * provider layer fell back to 2500 tokens for a long prompt and 1024 for a short one. In one week
 * that produced four silent losses, each found only by reading production usage rows: the search
 * reranker never once succeeded (deadline, then budget), the live clinical answer and nightly topic
 * evolution came back cut off at MAX_TOKENS and were discarded, and half the calls were unlabelled so
 * their failures pooled into "unspecified" where nobody could attribute them.
 *
 * A budget is a ceiling, not a cost: the model is billed for what it emits, so a generous ceiling
 * costs nothing unless the output really is that long - and a ceiling below the real output loses
 * the whole call. Size each one from what the prompt asks for, and from measured response sizes in
 * llm_usage_log when there are any (noted per entry).
 *
 * The registry supplies a value only where the caller did not pass one, so an explicit value at a
 * call site still wins. tests/unit/aiOperations.test.js fails when a call site names no operation or
 * an unregistered one; the quality-alert job reports calls that reach production unlabelled and any
 * operation that is failing.
 *
 * kind: 'interactive' - a person is waiting; 'background' - a job is.
 */

const LONG_JSON = 8192; // multi-section knowledge/synthesis objects; measured 9-20k chars
const JSON_OBJECT = 4096; // one structured object or a scored batch

const OPERATIONS = Object.freeze({
    // --- search ---
    pico_extraction: { kind: 'interactive', maxOutputTokens: 300, timeoutMs: 8000 },
    query_reformulation: { kind: 'interactive', maxOutputTokens: 200, timeoutMs: 8000 },
    intent_classification: { kind: 'interactive', maxOutputTokens: 20, timeoutMs: 4000 },
    // measured ~6k chars for 30 articles; 12s deadline failed at the tail, see articleReranker
    pico_rerank: { kind: 'interactive', maxOutputTokens: JSON_OBJECT, timeoutMs: 15000 },
    case_pico_extraction: { kind: 'interactive', maxOutputTokens: 512 },

    // --- synopsis / synthesis ---
    synopsis: { kind: 'interactive', maxOutputTokens: 2200 }, // measured 1.6-7.2k chars
    consensus_synopsis: { kind: 'interactive', maxOutputTokens: 2200 },
    synthesis: { kind: 'interactive', maxOutputTokens: LONG_JSON }, // measured 13-20k chars
    synthesis_stream: { kind: 'interactive', maxOutputTokens: LONG_JSON },
    live_clinical_answer: { kind: 'interactive', maxOutputTokens: JSON_OBJECT }, // measured 9-11k chars
    conflict_extraction: { kind: 'interactive', maxOutputTokens: 2048 }, // measured up to 7.5k chars
    guideline_synthesis: { kind: 'background', maxOutputTokens: LONG_JSON, timeoutMs: 120000 },
    guideline_merge: { kind: 'interactive', maxOutputTokens: 2000 },
    evidence_support_judge: { kind: 'background', maxOutputTokens: 512 },

    // --- article tools ---
    article_analysis: { kind: 'interactive', maxOutputTokens: JSON_OBJECT },
    plain_language_explain: { kind: 'interactive', maxOutputTokens: 2048 },
    article_pico: { kind: 'interactive', maxOutputTokens: LONG_JSON },
    article_consort: { kind: 'interactive', maxOutputTokens: JSON_OBJECT },
    article_compare: { kind: 'interactive', maxOutputTokens: JSON_OBJECT },
    journal_club: { kind: 'interactive', maxOutputTokens: LONG_JSON },
    review_assistant: { kind: 'interactive', maxOutputTokens: JSON_OBJECT },
    webpage_inference: { kind: 'interactive', maxOutputTokens: 1400 },

    // --- learning ---
    quiz: { kind: 'interactive', maxOutputTokens: JSON_OBJECT },
    cold_start_mcq: { kind: 'background', maxOutputTokens: 3000 },
    quiz_validation: { kind: 'background', maxOutputTokens: 1600 },
    quiz_safety_classifier: { kind: 'background', maxOutputTokens: 1600 },
    case_generation: { kind: 'interactive', maxOutputTokens: 3500 },
    case_to_evidence: { kind: 'interactive', maxOutputTokens: 3000 },
    reflection_draft: { kind: 'interactive', maxOutputTokens: 1500 },

    // --- topic knowledge (same prompt family: mentor message, seminal papers, teaching points) ---
    topic_knowledge_extraction: { kind: 'background', maxOutputTokens: LONG_JSON, timeoutMs: 120000 },
    topic_evolution: { kind: 'background', maxOutputTokens: LONG_JSON, timeoutMs: 120000 },
    seminal_knowledge_extraction: { kind: 'interactive', maxOutputTokens: LONG_JSON, timeoutMs: 120000 },
    community_seminal_refinement: { kind: 'background', maxOutputTokens: LONG_JSON, timeoutMs: 120000 },
    flagship_enrich_claims: { kind: 'background', maxOutputTokens: 800 },
    flagship_enrich_recommendations: { kind: 'background', maxOutputTokens: 600 },
    flagship_enrich_mcq: { kind: 'background', maxOutputTokens: 1200 },
    flagship_knowledge_script: { kind: 'background', maxOutputTokens: LONG_JSON, timeoutMs: 120000 },
    knowledge_drift_note: { kind: 'background', maxOutputTokens: 400 },

    // --- agent ---
    agent_turn: { kind: 'interactive', maxOutputTokens: JSON_OBJECT },
    agent_claim_extraction: { kind: 'interactive', maxOutputTokens: 600, timeoutMs: 10000 },
    agent_history_summary: { kind: 'interactive', maxOutputTokens: 300, timeoutMs: 6000 },
    agent_memory_summary: { kind: 'background', maxOutputTokens: 320, timeoutMs: 8000 },
    agent_memory_extract: { kind: 'background', maxOutputTokens: 280, timeoutMs: 6000 },
    agent_memory_consolidate: { kind: 'background', maxOutputTokens: 420, timeoutMs: 9000 },
});

function getOperation(name) {
    return name && Object.prototype.hasOwnProperty.call(OPERATIONS, name) ? OPERATIONS[name] : null;
}

const warned = new Set();

/**
 * Fill in the registered budget and deadline where the caller passed none. An unlabelled or
 * unregistered call still runs - refusing it in production would turn a missing label into an
 * outage - but it is logged once per name and counted by the quality-alert job.
 */
function withOperationDefaults(options = {}, logger = null) {
    const name = options?.usage?.operation;
    const op = getOperation(name);
    if (!op) {
        const key = name || '(none)';
        if (!warned.has(key)) {
            warned.add(key);
            logger?.warn?.({ operation: key }, 'AI call without a registered operation; add it to aiOperations.js');
        }
        return options;
    }
    return {
        ...options,
        maxOutputTokens: options.maxOutputTokens ?? op.maxOutputTokens,
        ...(op.timeoutMs != null || options.timeoutMs != null ? { timeoutMs: options.timeoutMs ?? op.timeoutMs } : {}),
    };
}

module.exports = { OPERATIONS, getOperation, withOperationDefaults };
