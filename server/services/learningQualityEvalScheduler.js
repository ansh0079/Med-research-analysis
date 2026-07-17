'use strict';

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { evaluateFixture } = require('./learningQualityEvalService');
const { withCronHeartbeat } = require('./cronHeartbeat');

const DEFAULT_FIXTURE_PATH = path.join(__dirname, '..', '..', 'tests', 'fixtures', 'learning-quality-gold.json');

let task = null;

/**
 * Nightly regression gate for the learning-content quality scorers (MCQ/case/
 * learning-plan generation). Runs the same fixture-based eval as
 * `npm run eval:learning-quality` on a schedule and logs a structured
 * pass/fail result every night — this codebase's established pattern (see
 * the other server.js schedulers) is that scheduled-task failures alert via
 * log-based monitoring (every log line here is tagged { task: 'learning-
 * quality-eval' }), not a direct paging integration, so this deliberately
 * does not call out to Slack/email/Sentry itself.
 *
 * This catches prompt-template regressions or scorer-logic drift between
 * deploys even though nothing about the ANSWERS to real user quizzes lives
 * in this fixture — it's a fixed, hand-labelled gold set (like the search
 * gold eval), not a live-traffic sample.
 */
function runLearningQualityEval(fixturePath = DEFAULT_FIXTURE_PATH) {
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    return evaluateFixture(fixture);
}

function scheduleLearningQualityEval(logger = console, { fixturePath = DEFAULT_FIXTURE_PATH } = {}) {
    if (task) return task;
    if (process.env.LEARNING_QUALITY_EVAL_CRON_DISABLED === 'true') {
        logger.info?.('Learning quality eval scheduler disabled');
        return null;
    }

    const expression = process.env.LEARNING_QUALITY_EVAL_CRON || '30 3 * * *';
    task = cron.schedule(expression, withCronHeartbeat('learning-quality-eval', async () => {
        const result = runLearningQualityEval(fixturePath);
        const { summary } = result;
        const logPayload = {
            pass: summary.pass,
            mcqPassRate: summary.mcq.passRate,
            casePassRate: summary.case.passRate,
            learningPassRate: summary.learning.passRate,
            expectationFailures: summary.expectationFailures,
        };
        if (summary.pass) {
            logger.info?.(logPayload, 'Learning quality eval passed');
        } else {
            logger.error?.(logPayload, 'Learning quality eval FAILED — content-quality regression gate did not pass');
        }
    }, { logger }), {
        timezone: process.env.TZ || 'UTC',
    });

    logger.info?.({ expression, timezone: process.env.TZ || 'UTC' }, 'Learning quality eval scheduler started');
    return task;
}

function stopLearningQualityEval() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { scheduleLearningQualityEval, stopLearningQualityEval, runLearningQualityEval };
