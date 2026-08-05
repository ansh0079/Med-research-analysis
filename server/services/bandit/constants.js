'use strict';

const { assertArmSafetyOrThrow } = require('../banditSafetyGuard');

const POLICY_SEARCH_RANKING = 'search_ranking';
const POLICY_RECOMMENDATION = 'recommendation_strategy';
const POLICY_QUIZ_CLAIM_SELECTION = 'quiz_claim_selection';
const POLICY_SYNOPSIS_STYLE = 'synopsis_style';
const POLICY_TEACHING_STRATEGY = 'agent_teaching_strategy';
const POLICY_CASE_DIFFICULTY = 'case_scenario_outcome';

const SEARCH_RANKING_ARMS = {
    heuristic_default: {
        saved: 1, helpful: 1, impression: 1, missed: 1, misconception: 1, trajectory: 1, weak: 1,
    },
    engagement_heavy: {
        saved: 1.35, helpful: 1.25, impression: 1.5, missed: 0.65, misconception: 0.75, trajectory: 0.85, weak: 0.8,
    },
    misconception_heavy: {
        saved: 0.75, helpful: 0.85, impression: 0.65, missed: 1.1, misconception: 2.1, trajectory: 1, weak: 1.15,
    },
    quiz_gap_heavy: {
        saved: 0.85, helpful: 0.9, impression: 0.75, missed: 1.85, misconception: 1.2, trajectory: 1, weak: 1.3,
    },
};

const RECOMMENDATION_ARM_BY_TYPE = {
    review: 'review',
    strengthen: 'strengthen',
    explore: 'explore',
    calibrate: 'calibrate',
    discover: 'discover',
    refresh: 'refresh',
    case: 'case',
    start: 'start',
};

const MIN_PULLS_FOR_USER_ARM = Number(process.env.BANDIT_MIN_USER_PULLS || 8);
const FULL_PULLS_FOR_USER_ARM = Number(process.env.BANDIT_FULL_USER_PULLS || 30);
const MIN_GLOBAL_PULLS_FOR_POLICY = Number(process.env.BANDIT_MIN_GLOBAL_PULLS || 20);

// ─── synopsis_style arms ─────────────────────────────────────────────────────
// Each arm maps to a rendering style injected into the synopsis prompt.
// The arm config carries metadata only (no weight vector) — reward is user
// feedback (helpful / not-helpful) recorded via recordBanditReward.
const SYNOPSIS_STYLE_ARMS = {
    // `structure` keys must match SYNOPSIS_STYLE_INSTRUCTIONS in prompts/synopsis.js
    bottom_line_first: { label: 'Bottom line first', tone: 'concise', structure: 'bottom_line_first' },
    pico_structured:   { label: 'PICO structured',  tone: 'clinical', structure: 'pico_structured' },
    narrative:         { label: 'Narrative flow',   tone: 'explanatory', structure: 'narrative' },
    teaching_points:   { label: 'Teaching points',  tone: 'educational', structure: 'bullet_teaching' },
};

// ─── agent_teaching_strategy arms ───────────────────────────────────────────
// Controls how the AI tutor frames explanations: Socratic questioning,
// direct explanation, analogy-led, or worked-example-first.
const TEACHING_STRATEGY_ARMS = {
    direct:        { label: 'Direct explanation',   strategy: 'explain_then_quiz' },
    socratic:      { label: 'Socratic questioning', strategy: 'question_first' },
    analogy:       { label: 'Analogy-led',          strategy: 'analogy_bridge' },
    worked_example:{ label: 'Worked example first', strategy: 'example_first' },
};

// Case difficulty arms — arm IDs match historical rewards: difficulty:{easy|medium|hard}
const CASE_DIFFICULTY_ARMS = {
    'difficulty:easy': { difficulty: 'easy', label: 'Easy' },
    'difficulty:medium': { difficulty: 'medium', label: 'Medium' },
    'difficulty:hard': { difficulty: 'hard', label: 'Hard' },
};

function caseDifficultyArmId(difficulty) {
    const d = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
    return `difficulty:${d}`;
}

// Audit arm safety at module load — catches unsafe weight vectors before any traffic.
(function auditArmsAtStartup() {
    assertArmSafetyOrThrow(SEARCH_RANKING_ARMS, { policyType: POLICY_SEARCH_RANKING });
}());

module.exports = {
    POLICY_SEARCH_RANKING,
    POLICY_RECOMMENDATION,
    POLICY_QUIZ_CLAIM_SELECTION,
    POLICY_SYNOPSIS_STYLE,
    POLICY_TEACHING_STRATEGY,
    POLICY_CASE_DIFFICULTY,
    SEARCH_RANKING_ARMS,
    RECOMMENDATION_ARM_BY_TYPE,
    MIN_PULLS_FOR_USER_ARM,
    FULL_PULLS_FOR_USER_ARM,
    MIN_GLOBAL_PULLS_FOR_POLICY,
    SYNOPSIS_STYLE_ARMS,
    TEACHING_STRATEGY_ARMS,
    CASE_DIFFICULTY_ARMS,
    caseDifficultyArmId,
};
