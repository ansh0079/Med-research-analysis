'use strict';

const { collectQualityMetrics } = require('../qualityMetricsService');
const { getSloStatus } = require('../observabilityMetrics');
const { clampDays, worstStatus, STATUS_SCORE } = require('./dbUtils');
const {
    collectRewardStats,
    collectLearningSignalStats,
    collectJobStats,
    collectSynopsisStats,
} = require('./collectors');
const {
    evaluateLearningSignals,
    evaluateSearch,
    evaluateRewards,
    evaluateJobs,
    evaluateSynopsis,
    evaluateSlo,
} = require('./evaluators');

function buildLearningLoopControlSummary({
    rewardStats = {},
    learningSignalStats = {},
    jobStats = {},
    generatedAt = new Date().toISOString(),
    windowDays = 7,
} = {}) {
    const blockers = [];
    const warnings = [];
    const checks = [];

    const totalRewards = Number(rewardStats.totalSignals || 0);
    const attributionRate = rewardStats.attributionRate == null ? null : Number(rewardStats.attributionRate);
    const totalLearningSignals = Number(learningSignalStats.totalLearningSignals || 0);
    const decisions = Number(learningSignalStats.searchRankingDecisions || 0);
    const propensityCoverage = learningSignalStats.propensityCoverage == null
        ? null
        : Number(learningSignalStats.propensityCoverage);
    const deadLetterJobs = Number(jobStats.deadLetter || 0);

    if (deadLetterJobs > 0) {
        blockers.push('Dead-letter learning or enrichment jobs are present.');
        checks.push({
            status: 'blocked',
            label: 'Durable job health',
            value: deadLetterJobs,
            threshold: '0 dead-letter jobs',
        });
    } else {
        checks.push({
            status: 'pass',
            label: 'Durable job health',
            value: deadLetterJobs,
            threshold: '0 dead-letter jobs',
        });
    }

    if (totalRewards > 0 && (!Number.isFinite(attributionRate) || attributionRate < 0.45)) {
        blockers.push('Reward attribution is too low for safe online learning.');
        checks.push({
            status: 'blocked',
            label: 'Reward attribution',
            value: attributionRate,
            threshold: '>= 0.45',
        });
    } else if (totalRewards > 0 && attributionRate < 0.65) {
        warnings.push('Reward attribution is usable but thin; keep close watch during beta.');
        checks.push({
            status: 'warn',
            label: 'Reward attribution',
            value: attributionRate,
            threshold: '>= 0.65 preferred',
        });
    } else if (totalRewards > 0) {
        checks.push({
            status: 'pass',
            label: 'Reward attribution',
            value: attributionRate,
            threshold: '>= 0.65 preferred',
        });
    } else {
        warnings.push('No reward signals yet; keep the loop in observe-only until beta interactions arrive.');
        checks.push({
            status: 'observe',
            label: 'Reward attribution',
            value: 0,
            threshold: '> 0 reward signals',
        });
    }

    if (decisions >= 20 && (!Number.isFinite(propensityCoverage) || propensityCoverage < 0.5)) {
        blockers.push('Ranking decisions do not have enough propensity coverage for offline learning checks.');
        checks.push({
            status: 'blocked',
            label: 'Propensity coverage',
            value: propensityCoverage,
            threshold: '>= 0.50',
        });
    } else if (decisions >= 20) {
        checks.push({
            status: 'pass',
            label: 'Propensity coverage',
            value: propensityCoverage,
            threshold: '>= 0.50',
        });
    } else {
        warnings.push('Not enough ranking decisions yet to validate propensity coverage.');
        checks.push({
            status: 'observe',
            label: 'Ranking decisions',
            value: decisions,
            threshold: '>= 20',
        });
    }

    let mode = 'observe_only';
    if (blockers.length) {
        mode = 'safe_heuristic_fallback';
    } else if (totalLearningSignals > 0 && totalRewards > 0 && attributionRate >= 0.65 && (decisions < 20 || propensityCoverage >= 0.5)) {
        mode = 'learning_enabled';
    }

    const onlineLearningSafe = mode === 'learning_enabled';
    const actions = blockers.length
        ? [
            'Keep ranking policy in heuristic fallback until blockers clear.',
            'Inspect dead-letter jobs, skipped reward attribution, and personalization decision context.',
        ]
        : mode === 'observe_only'
            ? [
                'Run beta smoke searches, clicks, saves, dwell events, and quiz attempts to collect first signals.',
                'Enable online updates only after reward attribution and propensity checks have samples.',
            ]
            : [
                'Proceed with beta learning enabled and monitor attribution, propensity coverage, and dead-letter jobs daily.',
            ];

    return {
        generatedAt,
        windowDays: clampDays(windowDays),
        mode,
        onlineLearningSafe,
        checks,
        blockers,
        warnings,
        actions,
        metrics: {
            rewardStats,
            learningSignalStats,
            jobStats,
        },
    };
}

function buildProductionReadinessSummary({
    qualityMetrics = {},
    slo = {},
    rewardStats = {},
    jobStats = {},
    synopsisStats = {},
    learningSignalStats = {},
    generatedAt = new Date().toISOString(),
    windowDays = 7,
} = {}) {
    const alerts = [];
    const search = evaluateSearch(qualityMetrics.search, alerts);
    const rewards = evaluateRewards(rewardStats, alerts);
    const jobs = evaluateJobs(jobStats, alerts);
    const synopsis = evaluateSynopsis(synopsisStats, qualityMetrics.synthesis, alerts);
    const sloSection = evaluateSlo(slo, alerts);
    const learningSignals = evaluateLearningSignals(learningSignalStats, alerts);
    const learningControl = buildLearningLoopControlSummary({
        rewardStats,
        learningSignalStats,
        jobStats,
        generatedAt,
        windowDays,
    });
    const sections = {
        search: { ...search, metrics: qualityMetrics.search || {} },
        rewards: { ...rewards, metrics: rewardStats },
        jobs: { ...jobs, metrics: jobStats },
        synopsis: { ...synopsis, metrics: { ...synopsisStats, synthesis: qualityMetrics.synthesis || {} } },
        slo: { ...sloSection, metrics: slo },
        learningSignals: { ...learningSignals, metrics: learningSignalStats },
    };
    const sectionStatuses = Object.values(sections).map((section) => section.status);
    const status = worstStatus(sectionStatuses);
    const score = Math.round(
        sectionStatuses.reduce((sum, sectionStatus) => sum + STATUS_SCORE[sectionStatus], 0) / sectionStatuses.length
    );

    return {
        generatedAt,
        windowDays: clampDays(windowDays),
        status,
        score,
        sections,
        learningControl,
        alerts: alerts.slice(0, 12),
        actions: alerts.map((alert) => alert.action).filter(Boolean).slice(0, 8),
    };
}

async function collectLearningLoopControl(db, { days = 7 } = {}) {
    const safeDays = clampDays(days);
    const [rewardStats, jobStats, learningSignalStats] = await Promise.all([
        collectRewardStats(db, safeDays),
        collectJobStats(db, safeDays),
        collectLearningSignalStats(db, safeDays),
    ]);
    return buildLearningLoopControlSummary({
        rewardStats,
        jobStats,
        learningSignalStats,
        generatedAt: new Date().toISOString(),
        windowDays: safeDays,
    });
}

async function collectProductionObservability(db, { days = 7 } = {}) {
    const safeDays = clampDays(days);
    const [qualityMetrics, rewardStats, jobStats, synopsisStats, learningSignalStats] = await Promise.all([
        collectQualityMetrics(db, safeDays),
        collectRewardStats(db, safeDays),
        collectJobStats(db, safeDays),
        collectSynopsisStats(db, safeDays),
        collectLearningSignalStats(db, safeDays),
    ]);
    return buildProductionReadinessSummary({
        qualityMetrics,
        slo: getSloStatus(),
        rewardStats,
        jobStats,
        synopsisStats,
        learningSignalStats,
        generatedAt: new Date().toISOString(),
        windowDays: safeDays,
    });
}

module.exports = {
    buildLearningLoopControlSummary,
    buildProductionReadinessSummary,
    collectLearningLoopControl,
    collectProductionObservability,
};
