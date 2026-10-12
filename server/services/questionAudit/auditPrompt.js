'use strict';

// The instructions a reviewer model gets for one question, and how its answer is read back.
//
// The reviewer is asked a fixed set of questions a clinician would ask of an MCQ, and must answer in a
// strict JSON shape. Anything unreadable, or any serious finding, is treated as a flag: a question only
// passes when the reviewer positively says it is correct, supported and unambiguous.

const SEVERITIES = ['none', 'minor', 'major', 'critical'];
const ISSUE_TYPES = [
    'wrong_keyed_answer',      // the keyed answer is incorrect
    'another_option_correct',  // more than one option is defensible
    'unsupported_by_evidence', // the evidence shown does not say what the question tests
    'contradicts_evidence',    // the evidence says something different
    'outdated',                // superseded by newer guidance or trials
    'unsafe',                  // following the keyed answer could harm a patient
    'explanation_inconsistent',// the explanation contradicts the keyed answer or itself, or admits extrapolation
    'wrong_attribution',       // cites a body, trial or year not in the evidence, or a reference that looks invented
    'ambiguous_stem',          // missing information needed to choose, or more than one reading
    'answer_cued',             // the keyed answer can be picked from form (length, wording) rather than knowledge
    'no_evidence_provided',    // nothing was linked to check it against
    'other',
];

function formatOptions(options) {
    if (Array.isArray(options)) return options.map((o, i) => (/^[A-E]\s*[:.)]/.test(String(o)) ? String(o) : `${String.fromCharCode(65 + i)}: ${o}`)).join('\n');
    if (options && typeof options === 'object') return Object.entries(options).map(([k, v]) => `${k}: ${v}`).join('\n');
    return '(no options)';
}

function formatEvidence(evidence = []) {
    if (!evidence.length) return 'NO EVIDENCE WAS LINKED TO THIS QUESTION.';
    return evidence.map((e, i) => {
        const head = [e.kind === 'guideline' ? 'GUIDELINE' : 'PAPER', e.source, e.year].filter(Boolean).join(' | ');
        return `[E${i + 1}] ${head}\n${String(e.text || '').slice(0, 1600)}`;
    }).join('\n\n');
}

function buildAuditPrompt({ topic, question, evidence, priorReview = null }) {
    const prior = priorReview
        ? `\nANOTHER REVIEWER FLAGGED THIS QUESTION. Check each concern yourself against the evidence and your own knowledge; do not assume they are right:\n${(priorReview.issues || []).map((i) => `- ${i.type}: ${i.detail}`).join('\n') || '- (no detail given)'}\n`
        : '';
    return `You are a senior clinician auditing a multiple-choice question in a medical education app for doctors.
Be strict: a question that teaches something wrong is worse than no question.

TOPIC: ${topic || '(unknown)'}

QUESTION:
${String(question.question || '').trim()}

OPTIONS:
${formatOptions(question.options)}

KEYED ANSWER: ${question.correctAnswer ?? question.correct ?? '(missing)'}
EXPLANATION GIVEN: ${String(question.explanation || '').trim() || '(none)'}
REFERENCE GIVEN: ${question.guidelineRef || (Array.isArray(question.sourceRefs) ? question.sourceRefs.map((s) => s.sourceBody).join(', ') : '') || '(none)'}

EVIDENCE LINKED TO THIS QUESTION:
${formatEvidence(evidence)}
${prior}
Answer these:
1. Is the keyed answer correct and the single best answer? Is any other option also defensible?
2. Does the linked evidence support what the question tests? Does it contradict it?
3. Is it current, or superseded by newer guidance or trials you know of? Is it safe?
4. Is the explanation consistent with the keyed answer and the evidence, without admitting it extrapolates?
5. Are the cited body, trial and year actually in the evidence, and do they look real?
6. Is the stem answerable without guessing, and is the keyed answer not given away by form?

Return ONLY JSON in this shape:
{"verdict":"pass"|"flag","severity":"none"|"minor"|"major"|"critical","keyedAnswerCorrect":true|false|null,"suggestedAnswer":"A-E or null","evidenceSupport":"supported"|"partial"|"not_supported"|"contradicted"|"no_evidence","issues":[{"type":"${ISSUE_TYPES.join('"|"')}","detail":"one sentence"}],"confidence":0.0}

Rules: verdict is "flag" for any major or critical issue, a wrong keyed answer, contradicted or unsupported evidence, or no linked evidence.
Minor issues (wording, style) may pass with severity "minor".`;
}

function clampSeverity(value) {
    return SEVERITIES.includes(value) ? value : 'major';
}

/**
 * Read a reviewer's reply into a normalised verdict. An unreadable reply is a flag, never a pass.
 */
function normaliseVerdict(raw) {
    const r = raw && typeof raw === 'object' ? raw : null;
    if (!r) return { verdict: 'flag', severity: 'major', issues: [{ type: 'other', detail: 'Reviewer reply could not be read' }], keyedAnswerCorrect: null, evidenceSupport: null, confidence: 0, unreadable: true };
    const issues = (Array.isArray(r.issues) ? r.issues : [])
        .map((i) => ({ type: ISSUE_TYPES.includes(i?.type) ? i.type : 'other', detail: String(i?.detail || '').slice(0, 400) }))
        .slice(0, 8);
    let severity = clampSeverity(r.severity);
    let verdict = r.verdict === 'pass' ? 'pass' : 'flag';
    const serious = r.keyedAnswerCorrect === false
        || ['contradicted', 'not_supported', 'no_evidence'].includes(r.evidenceSupport)
        || issues.some((i) => ['wrong_keyed_answer', 'contradicts_evidence', 'unsafe', 'another_option_correct'].includes(i.type));
    // The model's own "pass" does not override a serious finding it reported.
    if (serious && verdict === 'pass') verdict = 'flag';
    if (verdict === 'flag' && severity === 'none') severity = serious ? 'major' : 'minor';
    if (['major', 'critical'].includes(severity)) verdict = 'flag';
    const confidence = Math.max(0, Math.min(1, Number(r.confidence) || 0));
    return {
        verdict,
        severity,
        issues,
        keyedAnswerCorrect: typeof r.keyedAnswerCorrect === 'boolean' ? r.keyedAnswerCorrect : null,
        suggestedAnswer: typeof r.suggestedAnswer === 'string' ? r.suggestedAnswer.slice(0, 2) : null,
        evidenceSupport: ['supported', 'partial', 'not_supported', 'contradicted', 'no_evidence'].includes(r.evidenceSupport) ? r.evidenceSupport : null,
        confidence,
    };
}

module.exports = { SEVERITIES, ISSUE_TYPES, buildAuditPrompt, normaliseVerdict, formatOptions, formatEvidence };
