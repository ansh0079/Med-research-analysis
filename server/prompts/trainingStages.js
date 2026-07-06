'use strict';

/**
 * Canonical list of medical training stages and shared normalisation helpers.
 *
 * Both `server/routes/agent.js` (scaffolding directives) and
 * `server/prompts/quiz.js` (MCQ training-level rubric) need to know the set of
 * valid training stages and how to normalise a raw stage value coming from the
 * database / user profile. Previously each file declared its own `VALID_STAGES`
 * array and its own normalisation, which had already drifted: the agent
 * collapsed `'specialist'` → `'clinician'` (because the agent's scaffolding
 * directive for the two stages is identical), while the quiz prompt keeps them
 * distinct (the specialist MCQ rubric is meaningfully different from clinician).
 *
 * This module exposes:
 *   - `TRAINING_STAGES`: the canonical ordered list of valid stages.
 *   - `normaliseTrainingStage`: validates + returns a stage (defaulting to
 *     `'finals'`), used by the quiz prompt where `specialist` is its own stage.
 *   - `normaliseAgentStage`: the same function the agent uses, which collapses
 *     `specialist` → `clinician` because their scaffolding directives are
 *     intentionally identical.
 */

const TRAINING_STAGES = Object.freeze([
    'preclinical',
    'early_clinical',
    'finals',
    'foundation_doctor',
    'clinician',
    'specialist',
]);

const DEFAULT_STAGE = 'finals';

/**
 * Validate a training stage value. Returns the stage if valid, else `null`.
 * @param {string} stage
 * @returns {string | null}
 */
function isValidStage(stage) {
    return typeof stage === 'string' && TRAINING_STAGES.includes(stage) ? stage : null;
}

/**
 * Normalise and validate a training stage for prompt-building contexts that
 * treat `specialist` as a distinct stage (e.g. the MCQ rubric). Falls back to
 * `'finals'` when the input is missing or invalid.
 *
 * @param {string|undefined} stage
 * @returns {string}
 */
function normaliseTrainingStage(stage) {
    return isValidStage(stage) || DEFAULT_STAGE;
}

/**
 * Normalise a training stage for the conversational agent, which collapses
 * `specialist` → `clinician` because the two stages share an identical
 * scaffolding directive (the agent's `stageSpecifics` map only has a
 * `clinician` entry; `specialist` is an alias).
 *
 * @param {string|undefined} stage
 * @returns {string}
 */
function normaliseAgentStage(stage) {
    const valid = isValidStage(stage);
    if (!valid) return DEFAULT_STAGE;
    if (valid === 'specialist') return 'clinician';
    return valid;
}

module.exports = {
    TRAINING_STAGES,
    DEFAULT_STAGE,
    isValidStage,
    normaliseTrainingStage,
    normaliseAgentStage,
};
