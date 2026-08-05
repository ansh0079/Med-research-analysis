const TEACHING_STRATEGY_DIRECTIVES = {
    explain_then_quiz: 'Provide a clear, direct explanation first. Then immediately follow up with one targeted MCQ or reflective question to consolidate understanding.',
    question_first:    'Begin with a Socratic question to elicit the learner\'s prior understanding before explaining. Build on their answer rather than starting from scratch.',
    analogy_bridge:    'Anchor your first explanation in a concrete analogy or real-world clinical scenario before presenting the evidence. Make the mechanism intuitive before the data.',
    example_first:     'Open with a brief worked clinical example (a patient presentation or trial vignette) before explaining the underlying principle or evidence.',
};

const VALID_INTENTS = new Set(['quiz', 'case', 'guideline', 'appraisal', 'synopsis', 'agent_chat']);

const MAX_OUTPUT_TOKENS_BY_INTENT = {
    quiz: 2500,
    case: 2500,
    guideline: 2500,
    appraisal: 2500,
    synopsis: 4000,
    agent_chat: 1800,
};

module.exports = {
    TEACHING_STRATEGY_DIRECTIVES,
    VALID_INTENTS,
    MAX_OUTPUT_TOKENS_BY_INTENT,
};
