'use strict';

const { getLimit, resolvePlan } = require('../config/entitlements');

const yearMonth = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);

const FEATURE_SLUGS = {
    aiAnalysesPerMonth: 'ai_analysis',
    synthesisPerMonth: 'ai_synthesis',
};

function monthResetsAt(ym) {
    const [y, m] = ym.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    return `${next}-01T00:00:00Z`;
}

/**
 * @param {import('../../database')} db
 * @param {object} user
 */
async function getUserUsageSummary(db, user) {
    const plan = resolvePlan(user);
    const planId = user?.subscription_plan || plan.label?.toLowerCase?.() || 'free';
    const ym = yearMonth();
    const dt = today();

    const monthlyRows = await db.all(
        'SELECT feature, count FROM ai_usage_monthly WHERE user_id = ? AND year_month = ?',
        [user.id, ym]
    ).catch(() => []);

    const monthlyByFeature = Object.fromEntries(
        (monthlyRows || []).map((r) => [r.feature, Number(r.count) || 0])
    );

    const searchRow = await db.get(
        'SELECT count FROM search_usage_daily WHERE user_id = ? AND date = ?',
        [user.id, dt]
    ).catch(() => null);

    const buildMeter = (limitKey, label, featureSlug) => {
        const cap = getLimit(user, limitKey);
        const used = monthlyByFeature[featureSlug] || 0;
        const unlimited = cap === Infinity;
        const pct = unlimited ? 0 : (cap > 0 ? Math.round((used / cap) * 100) : 0);
        return {
            limitKey,
            label,
            used,
            cap: unlimited ? null : cap,
            unlimited,
            percentUsed: pct,
            nearLimit: !unlimited && cap > 0 && used / cap >= 0.8,
            atLimit: !unlimited && used >= cap,
            resetsAt: limitKey.includes('Day')
                ? `${dt}T23:59:59Z`
                : monthResetsAt(ym),
        };
    };

    const searchCap = getLimit(user, 'searchesPerDay');
    const searchUsed = Number(searchRow?.count) || 0;
    const searchUnlimited = searchCap === Infinity;

    return {
        plan: planId,
        planLabel: plan.label,
        yearMonth: ym,
        meters: {
            aiAnalysesPerMonth: buildMeter('aiAnalysesPerMonth', 'AI analyses', FEATURE_SLUGS.aiAnalysesPerMonth),
            synthesisPerMonth: buildMeter('synthesisPerMonth', 'Evidence synthesis', FEATURE_SLUGS.ai_synthesis),
            searchesPerDay: {
                limitKey: 'searchesPerDay',
                label: 'Searches today',
                used: searchUsed,
                cap: searchUnlimited ? null : searchCap,
                unlimited: searchUnlimited,
                percentUsed: searchUnlimited ? 0 : (searchCap > 0 ? Math.round((searchUsed / searchCap) * 100) : 0),
                nearLimit: !searchUnlimited && searchCap > 0 && searchUsed / searchCap >= 0.8,
                atLimit: !searchUnlimited && searchUsed >= searchCap,
                resetsAt: `${dt}T23:59:59Z`,
            },
        },
    };
}

module.exports = { getUserUsageSummary, FEATURE_SLUGS, monthResetsAt };
