'use strict';

const { collectQualityMetrics } = require('./qualityMetricsService');
const { getSloStatus } = require('./observabilityMetrics');

const STATUS_RANK = {
    healthy: 0,
    insufficient_data: 1,
    watch: 2,
    degraded: 3,
};

const STATUS_SCORE = {
    healthy: 100,
    insufficient_data: 60,
    watch: 75,
    degraded: 35,
};

function clampDays(days) {
    return Math.min(90, Math.max(1, Number(days) || 7));
}

function sinceIso(days) {
    return new Date(Date.now() - clampDays(days) * 24 * 60 * 60 * 1000).toISOString();
}

function countValue(row, keys = ['count', 'cnt']) {
    if (!row) return 0;
    for (const key of keys) {
        if (row[key] != null) return Number(row[key] || 0);
    }
    return 0;
}

async function safeAll(db, sql, params = []) {
    if (!db?.all) return [];
    try {
        return await db.all(sql, params);
    } catch {
        return [];
    }
}

async function safeGet(db, sql, params = []) {
    if (!db?.get) return null;
    try {
        return await db.get(sql, params);
    } catch {
        return null;
    }
}

function worstStatus(statuses) {
    const nonEmpty = statuses.filter(Boolean);
    if (!nonEmpty.length) return 'insufficient_data';
    return nonEmpty.reduce((worst, status) =>
        STATUS_RANK[status] > STATUS_RANK[worst] ? status : worst, nonEmpty[0]);
}

function pushCheck(checks, alerts, area, {
    status,
    label,
    value = null,
    threshold = null,
    message,
    action,
}) {
    const check = { status, label, value, threshold, message, action };
    checks.push(check);
    if (status === 'watch' || status === 'degraded') {
        alerts.push({
            severity: status === 'degraded' ? 'critical' : 'warning',
            area,
            message,
            action,
        });
    }
    return check;
}

function rate(numerator, denominator) {
    return denominator > 0 ? numerator / denominator : null;
}

function countByStatus(rows, status) {
    const row = (rows || []).find((item) => String(item.status) === status);
    return countValue(row);
}

async function collectRewardStats(db, days) {
    const rows = await safeAll(
        db,
        `SELECT event_type, COUNT(*) AS count
         FROM learning_events
         WHERE occurred_at >= ?
           AND event_type IN ('search_reward_attributed', 'search_reward_skipped', 'quiz_reward_attributed')
         GROUP BY event_type`,
        [sinceIso(days)]
    );
    const counts = Object.fromEntries(rows.map((row) => [String(row.event_type), Number(row.count || 0)]));
    const searchAttributed = Number(counts.search_reward_attributed || 0);
    const searchSkipped = Number(counts.search_reward_skipped || 0);
    const quizAttributed = Number(counts.quiz_reward_attributed || 0);
    const attributed = searchAttributed + quizAttributed;
    const total = attributed + searchSkipped;

    return {
        totalSignals: total,
        attributedSignals: attributed,
        skippedSignals: searchSkipped,
        searchAttributed,
        searchSkipped,
        quizAttributed,
        attributionRate: rate(attributed, total),
    };
}

/**
 * Phase 5 — observability of user learning signals (interactions, decisions, propensity).
 */
async function collectLearningSignalStats(db, days) {
    const since = sinceIso(days);
    const [interactionRows, decisionRow, propensityRow, quizRow] = await Promise.all([
        safeAll(
            db,
            `SELECT event_type, COUNT(*) AS count
             FROM learning_events
             WHERE occurred_at >= ?
               AND event_type IN (
                 'paper_click', 'paper_save', 'paper_dwell',
                 'search_click', 'search_save', 'search_dwell'
               )
             GROUP BY event_type`,
            [since]
        ),
        safeGet(
            db,
            `SELECT COUNT(*) AS count
             FROM personalization_decisions
             WHERE created_at >= ?
               AND policy_type = 'search_ranking'`,
            [since]
        ),
        safeGet(
            db,
            `SELECT COUNT(*) AS count
             FROM personalization_decisions
             WHERE created_at >= ?
               AND policy_type = 'search_ranking'
               AND context_json LIKE '%"propensity"%'`,
            [since]
        ),
        safeGet(
            db,
            `SELECT COUNT(*) AS count
             FROM learning_events
             WHERE occurred_at >= ?
               AND event_type IN ('quiz_reward_attributed', 'quiz_attempt', 'quiz_completed')`,
            [since]
        ),
    ]);

    const interactionCounts = Object.fromEntries(
        (interactionRows || []).map((row) => [String(row.event_type), Number(row.count || 0)])
    );
    const interactionTotal = Object.values(interactionCounts).reduce((a, b) => a + b, 0);
    const decisions = countValue(decisionRow);
    const withPropensity = countValue(propensityRow);
    const quizSignals = countValue(quizRow);

    return {
        interactionTotal,
        interactionCounts,
        searchRankingDecisions: decisions,
        decisionsWithPropensity: withPropensity,
        propensityCoverage: rate(withPropensity, decisions),
        quizSignals,
        totalLearningSignals: interactionTotal + decisions + quizSignals,
    };
}

function evaluateLearningSignals(signals = {}, alerts) {
    const checks = [];
    const total = Number(signals.totalLearningSignals || 0);
    if (!total) {
        pushCheck(checks, alerts, 'learningSignals', {
            status: 'insufficient_data',
            label: 'Learning signals',
            value: 0,
            threshold: '> 0 signals',
            message: 'No recent user interaction / bandit / quiz learning signals were recorded.',
            action: 'Smoke-test search clicks, saves, and a quiz attempt; confirm event bus handlers are registered.',
        });
        return { status: worstStatus(checks.map((c) => c.status)), checks };
    }

    if (Number(signals.interactionTotal || 0) === 0) {
        pushCheck(checks, alerts, 'learningSignals', {
            status: 'watch',
            label: 'Interaction events',
            value: 0,
            threshold: '> 0 interactions',
            message: 'Bandit/quiz signals exist but paper interaction events are missing.',
            action: 'Verify POST /api/search/interaction reaches trackUserInteraction / recordLearningSignal.',
        });
    }

    const decisions = Number(signals.searchRankingDecisions || 0);
    if (decisions >= 20) {
        const coverage = Number(signals.propensityCoverage);
        if (!Number.isFinite(coverage) || coverage < 0.5) {
            pushCheck(checks, alerts, 'learningSignals', {
                status: 'watch',
                label: 'Decision propensity coverage',
                value: coverage,
                threshold: '>= 0.50',
                message: 'Search ranking decisions lack logged propensities needed for offline IPS.',
                action: 'Confirm selectSearchRankingArm logs propensity on personalization_decisions.context_json.',
            });
        } else {
            pushCheck(checks, alerts, 'learningSignals', {
                status: 'healthy',
                label: 'Decision propensity coverage',
                value: coverage,
                threshold: '>= 0.50',
                message: 'Enough propensity-labelled decisions for offline IPS evaluation.',
            });
        }
    } else {
        pushCheck(checks, alerts, 'learningSignals', {
            status: 'insufficient_data',
            label: 'Search ranking decisions',
            value: decisions,
            threshold: '>= 20',
            message: 'Too few search ranking decisions to judge propensity coverage.',
            action: 'Run authenticated searches with personalization enabled to accumulate decision logs.',
        });
    }

    if (Number(signals.interactionTotal || 0) > 0
        && !checks.some((c) => c.label === 'Interaction events')) {
        pushCheck(checks, alerts, 'learningSignals', {
            status: 'healthy',
            label: 'Interaction pipeline',
            value: signals.interactionTotal,
            threshold: '> 0',
            message: 'User interaction learning signals are flowing.',
        });
    }

    return { status: worstStatus(checks.map((c) => c.status)), checks };
}

async function collectJobStats(db, days) {
    const statusRows = await safeAll(
        db,
        `SELECT status, COUNT(*) AS count
         FROM ai_generation_jobs
         WHERE updated_at >= ?
         GROUP BY status`,
        [sinceIso(days)]
    );
    const deadLetterRow = await safeGet(
        db,
        `SELECT COUNT(*) AS count
         FROM dead_letter_jobs
         WHERE failed_at >= ?`,
        [sinceIso(days)]
    );

    return {
        queued: countByStatus(statusRows, 'queued'),
        running: countByStatus(statusRows, 'running'),
        completed: countByStatus(statusRows, 'completed'),
        failed: countByStatus(statusRows, 'failed'),
        deadLetter: countValue(deadLetterRow),
        total: statusRows.reduce((sum, row) => sum + Number(row.count || 0), 0) + countValue(deadLetterRow),
    };
}

async function collectSynopsisStats(db, days) {
    const verificationRows = await safeAll(
        db,
        `SELECT verification_status, COUNT(*) AS count
         FROM teaching_object_claims
         WHERE updated_at >= ?
         GROUP BY verification_status`,
        [sinceIso(days)]
    );
    const reviewRows = await safeAll(
        db,
        `SELECT review_state, COUNT(*) AS count
         FROM teaching_object_claims
         WHERE updated_at >= ?
         GROUP BY review_state`,
        [sinceIso(days)]
    );
    const totalRow = await safeGet(
        db,
        `SELECT COUNT(*) AS count
         FROM teaching_object_claims
         WHERE updated_at >= ?`,
        [sinceIso(days)]
    );

    const totalClaims = countValue(totalRow);
    const trusted = ['verified', 'curator_verified', 'supported']
        .reduce((sum, status) => sum + countValue(
            verificationRows.find((row) => String(row.verification_status) === status)
        ), 0);
    const riskyStatuses = ['abstract_only', 'unverified', 'guideline_conflict', 'stale_needs_refresh'];
    const risky = riskyStatuses.reduce((sum, status) => sum + countValue(
        verificationRows.find((row) => String(row.verification_status) === status)
    ), 0);
    const pendingReview = reviewRows.reduce((sum, row) => {
        const state = String(row.review_state || '');
        return state === 'approved' || state === 'reviewed' ? sum : sum + Number(row.count || 0);
    }, 0);

    return {
        totalClaims,
        trustedClaims: trusted,
        riskyClaims: risky,
        pendingReviewClaims: pendingReview,
        trustRate: rate(trusted, totalClaims),
        riskyRate: rate(risky, totalClaims),
    };
}

function evaluateSearch(search = {}, alerts) {
    const checks = [];
    const sampleSize = Number(search.sampleSize || search.impressionSearchCount || search.totalSearchCount || 0);
    if (sampleSize < 5) {
        pushCheck(checks, alerts, 'search', {
            status: 'insufficient_data',
            label: 'Search quality sample',
            value: sampleSize,
            threshold: '>= 5 searches',
            message: 'Search has too little recent interaction data to judge quality confidently.',
            action: 'Drive a small staff smoke test through representative clinical queries.',
        });
    }
    if (search.noClickRate != null && Number(search.noClickRate) > 0.65) {
        pushCheck(checks, alerts, 'search', {
            status: 'degraded',
            label: 'No-click rate',
            value: search.noClickRate,
            threshold: '<= 0.65',
            message: 'Recent searches are often ending without a useful paper interaction.',
            action: 'Inspect no-click topic samples and expand retrieval/ranking coverage.',
        });
    } else if (search.noClickRate != null && Number(search.noClickRate) > 0.5) {
        pushCheck(checks, alerts, 'search', {
            status: 'watch',
            label: 'No-click rate',
            value: search.noClickRate,
            threshold: '<= 0.50',
            message: 'No-click search rate is elevated.',
            action: 'Review the worst topic clusters before it becomes a blocker.',
        });
    }
    if (Number(search.lowRecallQueryCount || 0) > 10) {
        pushCheck(checks, alerts, 'search', {
            status: 'watch',
            label: 'Low-recall queries',
            value: Number(search.lowRecallQueryCount || 0),
            threshold: '<= 10',
            message: 'Low-recall search topics are accumulating.',
            action: 'Promote repeated low-recall topics into synonym expansion and gold-query coverage.',
        });
    }
    if (!checks.length) {
        pushCheck(checks, alerts, 'search', {
            status: 'healthy',
            label: 'Search quality',
            value: sampleSize,
            threshold: 'recent usable sample',
            message: 'Search quality signals are inside Phase 7 operating thresholds.',
        });
    }
    return { status: worstStatus(checks.map((check) => check.status)), checks };
}

function evaluateRewards(rewards = {}, alerts) {
    const checks = [];
    if (!Number(rewards.totalSignals || 0)) {
        pushCheck(checks, alerts, 'rewards', {
            status: 'insufficient_data',
            label: 'Reward attribution',
            value: 0,
            threshold: '> 0 signals',
            message: 'No recent RL reward signals were recorded.',
            action: 'Exercise search feedback, quiz attempts, and click outcomes in a staff smoke test.',
        });
    } else if (Number(rewards.attributionRate || 0) < 0.45) {
        pushCheck(checks, alerts, 'rewards', {
            status: 'degraded',
            label: 'Reward attribution rate',
            value: rewards.attributionRate,
            threshold: '>= 0.45',
            message: 'RL reward attribution is too low for safe online learning.',
            action: 'Check why search rewards are skipped and verify session/result ids are preserved.',
        });
    } else if (Number(rewards.attributionRate || 0) < 0.65) {
        pushCheck(checks, alerts, 'rewards', {
            status: 'watch',
            label: 'Reward attribution rate',
            value: rewards.attributionRate,
            threshold: '>= 0.65',
            message: 'RL reward attribution is usable but thin.',
            action: 'Track skipped reward payloads and improve attribution coverage.',
        });
    }
    if (!checks.length) {
        pushCheck(checks, alerts, 'rewards', {
            status: 'healthy',
            label: 'Reward attribution',
            value: rewards.attributionRate,
            threshold: '>= 0.65',
            message: 'Learning rewards are being attributed at an operable rate.',
        });
    }
    return { status: worstStatus(checks.map((check) => check.status)), checks };
}

function evaluateJobs(jobs = {}, alerts) {
    const checks = [];
    if (Number(jobs.deadLetter || 0) > 0) {
        pushCheck(checks, alerts, 'jobs', {
            status: 'degraded',
            label: 'Dead-letter jobs',
            value: jobs.deadLetter,
            threshold: '0',
            message: 'AI enrichment jobs have exhausted retries and moved to dead letter.',
            action: 'Open Background jobs, inspect dead-letter errors, and requeue after fixing the cause.',
        });
    }
    if (Number(jobs.failed || 0) > 10) {
        pushCheck(checks, alerts, 'jobs', {
            status: 'watch',
            label: 'Failed jobs',
            value: jobs.failed,
            threshold: '<= 10',
            message: 'Failed AI jobs are building up.',
            action: 'Retry transient failures and check provider/model errors.',
        });
    }
    if (!Number(jobs.total || 0)) {
        pushCheck(checks, alerts, 'jobs', {
            status: 'insufficient_data',
            label: 'AI jobs',
            value: 0,
            threshold: '> 0 jobs',
            message: 'No recent AI job activity was found.',
            action: 'Run one topic seed or synopsis generation to verify the durable job loop.',
        });
    }
    if (!checks.length) {
        pushCheck(checks, alerts, 'jobs', {
            status: 'healthy',
            label: 'AI jobs',
            value: jobs.total,
            threshold: 'no dead letters',
            message: 'Durable AI job health is within the Phase 7 operating threshold.',
        });
    }
    return { status: worstStatus(checks.map((check) => check.status)), checks };
}

function evaluateSynopsis(synopsis = {}, synthesis = {}, alerts) {
    const checks = [];
    if (!Number(synopsis.totalClaims || synthesis.citationValidationSample || 0)) {
        pushCheck(checks, alerts, 'synopsis', {
            status: 'insufficient_data',
            label: 'Synopsis trust sample',
            value: 0,
            threshold: '> 0 claims or citation checks',
            message: 'No recent synopsis trust sample was available.',
            action: 'Generate or refresh a paper synopsis and run claim review on it.',
        });
    }
    if (synopsis.riskyRate != null && Number(synopsis.riskyRate) > 0.35) {
        pushCheck(checks, alerts, 'synopsis', {
            status: 'degraded',
            label: 'Risky claim rate',
            value: synopsis.riskyRate,
            threshold: '<= 0.35',
            message: 'Too many synopsis claims are unverified, abstract-only, stale, or guideline-conflicted.',
            action: 'Work the clinical quality queue before expanding automated synopsis generation.',
        });
    } else if (synopsis.riskyRate != null && Number(synopsis.riskyRate) > 0.2) {
        pushCheck(checks, alerts, 'synopsis', {
            status: 'watch',
            label: 'Risky claim rate',
            value: synopsis.riskyRate,
            threshold: '<= 0.20',
            message: 'Synopsis trust is acceptable but needs curator attention.',
            action: 'Prioritize high-demand topics with abstract-only or unverified claims.',
        });
    }
    if (synthesis.citationValidationPassRate != null && Number(synthesis.citationValidationPassRate) < 0.9) {
        pushCheck(checks, alerts, 'synopsis', {
            status: 'watch',
            label: 'Citation validation pass rate',
            value: synthesis.citationValidationPassRate,
            threshold: '>= 0.90',
            message: 'Citation validation is below the preferred operating threshold.',
            action: 'Inspect failed citation validations and adjust claim extraction prompts or parsing.',
        });
    }
    if (!checks.length) {
        pushCheck(checks, alerts, 'synopsis', {
            status: 'healthy',
            label: 'Synopsis trust',
            value: synopsis.totalClaims || synthesis.citationValidationSample || 0,
            threshold: 'trust checks inside limits',
            message: 'Synopsis trust signals are inside Phase 7 thresholds.',
        });
    }
    return { status: worstStatus(checks.map((check) => check.status)), checks };
}

function evaluateSlo(slo = {}, alerts) {
    const checks = [];
    const rolling = Array.isArray(slo.rolling) ? slo.rolling : [];
    for (const item of rolling) {
        const status = item.total === 0 ? 'insufficient_data' : item.ok ? 'healthy' : 'degraded';
        pushCheck(checks, alerts, 'slo', {
            status,
            label: item.slo,
            value: item.successRate,
            threshold: 'inside rolling SLO budget',
            message: item.total === 0
                ? `${item.slo} has no rolling in-process samples yet.`
                : item.ok
                    ? `${item.slo} is inside the rolling SLO budget.`
                    : `${item.slo} is burning error budget.`,
            action: item.ok ? undefined : 'Check recent latency, synopsis failures, and off-topic search evaluations.',
        });
    }
    if (!checks.length) {
        pushCheck(checks, alerts, 'slo', {
            status: 'insufficient_data',
            label: 'SLO events',
            value: 0,
            threshold: '> 0 events',
            message: 'No SLO definitions were reported.',
            action: 'Verify observability metrics are registered during app startup.',
        });
    }
    return { status: worstStatus(checks.map((check) => check.status)), checks };
}

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
    buildProductionReadinessSummary,
    buildLearningLoopControlSummary,
    collectProductionObservability,
    collectLearningLoopControl,
    collectJobStats,
    collectRewardStats,
    collectSynopsisStats,
    collectLearningSignalStats,
    evaluateLearningSignals,
    worstStatus,
};
