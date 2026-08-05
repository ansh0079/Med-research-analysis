'use strict';

const { worstStatus, pushCheck } = require('./dbUtils');

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

module.exports = {
    evaluateLearningSignals,
    evaluateSearch,
    evaluateRewards,
    evaluateJobs,
    evaluateSynopsis,
    evaluateSlo,
};
