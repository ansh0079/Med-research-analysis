'use strict';

const STYLE_REASON_RE = /\b(style|too_long|too_short|format|tone|hard_to_scan|too_basic|too_complex)\b/i;
const TRUST_REASON_RE = /\b(factual|citation|unsafe|wrong|missing_evidence|overclaim|guideline|stale)\b/i;

function normalizeReason(reason) {
    return String(reason || '').trim().slice(0, 500);
}

function synopsisFeedbackReward(feedbackType, reason = '') {
    const type = String(feedbackType || '').trim();
    if (type === 'helpful') return 1;
    if (type !== 'not_helpful') return 0;
    const r = normalizeReason(reason);
    if (TRUST_REASON_RE.test(r)) return 0;
    if (STYLE_REASON_RE.test(r)) return 0.02;
    return 0;
}

function synopsisRegenerationTargets(reason = '') {
    const r = normalizeReason(reason).toLowerCase();
    const targets = new Set();
    if (/\b(bottom_line|bottom line|takeaway|clinical meaning|practice)\b/.test(r)) {
        targets.add('bottomLine');
        targets.add('clinicalMeaning');
    }
    if (/\b(main_findings|main findings|result|effect|stat|number|p-value|confidence interval|ci)\b/.test(r)) {
        targets.add('mainFindings');
        targets.add('statistics');
    }
    if (/\b(limitation|limitations|bias|weakness|weaknesses|overclaim|overclaims|trust)\b/.test(r)) {
        targets.add('limitations');
        targets.add('trustRationale');
        targets.add('whatNotToOverclaim');
    }
    if (/\b(safety|adverse|harm|contraindication)\b/.test(r)) {
        targets.add('safetyOutcomes');
    }
    if (/\b(quiz|teaching|exam|mcq|focus)\b/.test(r)) {
        targets.add('quizFocusPoints');
    }
    if (/\b(citation|citations|source|sources|evidence|guideline|stale|wrong|factual)\b/.test(r)) {
        targets.add('fullSynopsis');
    }
    return [...targets];
}

function agentFollowUpReward({ conversationHistory = [], message = '' } = {}) {
    const history = Array.isArray(conversationHistory) ? conversationHistory : [];
    const assistantTurns = history.filter((turn) => String(turn?.role || '').toLowerCase() === 'assistant').length;
    if (assistantTurns < 1) return 0;
    const words = String(message || '').trim().split(/\s+/).filter(Boolean).length;
    if (words >= 18) return 0.35;
    if (words >= 6) return 0.22;
    return 0.1;
}

function quizOutcomeRewardForAgent(attempts = []) {
    const rows = Array.isArray(attempts) ? attempts : [];
    if (!rows.length) return 0;
    const correct = rows.filter((attempt) => Boolean(attempt.isCorrect ?? attempt.is_correct === 1)).length;
    const score = correct / rows.length;
    if (score >= 0.8) return 0.7;
    if (score >= 0.6) return 0.35;
    if (score >= 0.4) return 0.05;
    return 0;
}

module.exports = {
    agentFollowUpReward,
    quizOutcomeRewardForAgent,
    synopsisFeedbackReward,
    synopsisRegenerationTargets,
};
