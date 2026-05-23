'use strict';

const { classifyClaimGuidelineAlignment } = require('./claimGuidelineAlignmentService');

const STALE_DAYS = Number(process.env.GUIDELINE_WATCH_STALE_DAYS || 365);

async function runGuidelineWatchtowerScan(db, topic, { limit = 40 } = {}) {
    const normalized = db.normalizeTopic(topic);
    const [guidelines, claims] = await Promise.all([
        db.getGuidelinesByTopic(topic, { limit: 50 }).catch(() => []),
        db.listTeachingObjectClaimsForTopic(topic, { limit }),
    ]);

    const events = [];
    const now = Date.now();
    const regions = new Set(guidelines.map((g) => String(g.source_region || g.sourceRegion || 'international').toLowerCase()));

    for (const g of guidelines) {
        const checked = g.last_checked_at || g.lastCheckedAt;
        if (checked) {
            const ageDays = (now - new Date(checked).getTime()) / (1000 * 60 * 60 * 24);
            if (ageDays > STALE_DAYS) {
                events.push({
                    normalizedTopic: normalized,
                    guidelineId: g.id,
                    eventType: 'guideline_stale',
                    severity: 'warning',
                    message: `${g.source_body || 'Guideline'} may be outdated (last checked ${Math.round(ageDays)}d ago).`,
                    payload: { sourceBody: g.source_body, sourceYear: g.source_year },
                });
            }
        }
    }

    if (regions.size > 1) {
        events.push({
            normalizedTopic: normalized,
            eventType: 'regional_guideline_divergence',
            severity: 'info',
            message: `Multiple guideline regions stored (${[...regions].join(', ')}). Compare local vs international recommendations.`,
            payload: { regions: [...regions] },
        });
    }

    for (const claim of claims) {
        if (!claim?.claimText) continue;
        const alignment = classifyClaimGuidelineAlignment(claim, guidelines);
        if (alignment.recommendedVerificationStatus === 'guideline_conflict') {
            events.push({
                normalizedTopic: normalized,
                claimKey: claim.claimKey,
                eventType: 'claim_conflicts_guideline',
                severity: 'high',
                message: `Claim may conflict with stored guideline: "${String(claim.claimText).slice(0, 120)}…"`,
                payload: { alignment },
            });
        } else if (alignment.recommendedVerificationStatus === 'guideline_uncertain') {
            events.push({
                normalizedTopic: normalized,
                claimKey: claim.claimKey,
                eventType: 'claim_guideline_uncertain',
                severity: 'info',
                message: `Weak guideline overlap for claim: "${String(claim.claimText).slice(0, 100)}…"`,
                payload: { alignment },
            });
        }
    }

    if (typeof db.insertGuidelineWatchEvent === 'function') {
        for (const event of events.slice(0, 25)) {
            await db.insertGuidelineWatchEvent(event).catch(() => {});
        }
    }

    return { topic, normalizedTopic: normalized, guidelineCount: guidelines.length, claimCount: claims.length, events };
}

async function runGuidelineWatchtowerBatch(db, { topicLimit = 8 } = {}) {
    const rows = await db.all?.(
        `SELECT DISTINCT normalized_topic AS topic FROM teaching_object_claims
         WHERE normalized_topic IS NOT NULL AND normalized_topic != ''
         ORDER BY updated_at DESC
         LIMIT ?`,
        [topicLimit]
    ).catch(() => []);
    const results = [];
    for (const row of rows) {
        const topic = row.topic;
        if (!topic) continue;
        results.push(await runGuidelineWatchtowerScan(db, topic, { limit: 25 }));
    }
    return { scanned: results.length, results };
}

module.exports = { runGuidelineWatchtowerScan, runGuidelineWatchtowerBatch };
