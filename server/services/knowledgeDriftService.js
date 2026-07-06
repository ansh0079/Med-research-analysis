// ==========================================
// Knowledge drift: daily scan for users with "strong" topic memory;
// surfaces potentially practice-changing new evidence as proactive alerts.
// ==========================================

const logger = require('../config/logger');
const cron = require('node-cron');
const { validateQuery } = require('../utils/articles');
const { fetchUnifiedEvidence } = require('./unifiedEvidenceSearch');
const { selectTopEvidence } = require('../utils/selectTopEvidence');
const { createAiService, TEMPERATURE } = require('./aiService');
const { resolveProvider } = require('../utils/aiProvider');

let scheduledJob = null;

function articleYear(article) {
    const y = String(article.pubdate || article.year || '').slice(0, 4);
    const n = parseInt(y, 10);
    return Number.isFinite(n) ? n : null;
}

function looksLandmarkCandidate(article, currentYear) {
    const year = articleYear(article);
    if (year && year < currentYear - 4) return false;
    const blob = `${article.title || ''} ${article.abstract || ''}`.toLowerCase();
    const trialHints = ['randomized', 'randomised', 'rct', 'double-blind', 'double blind', 'placebo-controlled',
        'multicenter', 'multicentre', 'multi-center', 'phase 3', 'phase iii', 'clinical trial'];
    const practiceHints = ['guideline', 'consensus', 'society', 'recommendation', 'statement', 'paradigm'];
    const hasTrial = trialHints.some((h) => blob.includes(h));
    const hasPractice = practiceHints.some((h) => blob.includes(h));
    const cites = Number(article.citationCount ?? article.pmcrefcount ?? 0);
    const highCite = !Number.isNaN(cites) && cites >= 40;
    const recent = year && year >= currentYear - 3;
    return (hasTrial && recent) || hasPractice || (highCite && recent);
}

function collectKnownUidSet({ userRow, topicKnowledge }) {
    const out = new Set();
    for (const raw of [userRow.top_article_uids, userRow.saved_article_uids]) {
        try {
            const arr = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw || [];
            for (const u of arr) {
                if (u) out.add(String(u));
            }
        } catch (err) {
            logger.debug({ err }, 'knowledgeDrift: failed to parse known article UID list');
        }
    }
    for (const a of topicKnowledge?.sourceArticles || []) {
        if (a?.uid) out.add(String(a.uid));
    }
    return out;
}

async function buildWhatsNewSummary({ serverConfig, fetchImpl, displayTopic, article }) {
    const { provider, model } = resolveProvider({ provider: 'auto' }, serverConfig);
    if (!provider) {
        return `New evidence surfaced for "${displayTopic}": ${article.title || 'Recent study'}. Open the topic to review context and seminal papers.`;
    }
    const ai = createAiService({ serverConfig, fetch: fetchImpl });
    const prompt = `You write concise "What's New" clinical education blurbs for specialists.

Topic: "${displayTopic}"
New paper title: ${article.title || 'Unknown'}
Year: ${articleYear(article) || 'unknown'}
Journal: ${article.journal || article.source || 'unknown'}
Abstract (trimmed): ${String(article.abstract || '').slice(0, 1200)}

In ≤3 short sentences, explain why this may matter for practice and what a clinician should verify before changing management. No bullet symbols. Plain text only.`;

    try {
        const raw = await ai.callText(prompt, provider, model, { temperature: TEMPERATURE.synopsis });
        const t = String(raw || '').trim();
        return t.length > 40 ? t.slice(0, 2000) : null;
    } catch (err) {
        logger?.debug?.({ err, displayTopic }, 'knowledgeDrift: AI summary generation failed');
        return null;
    }
}

async function runKnowledgeDriftScan({ db, serverConfig, fetchImpl, logger } = {}) {
    if (
        typeof db.listStrongMemoryUserTopicsForDrift !== 'function' ||
        typeof db.insertProactiveEvidenceAlert !== 'function'
    ) {
        return { scanned: 0, created: 0 };
    }

    const rows = await db.listStrongMemoryUserTopicsForDrift({ limit: 60 }).catch((err) => { logger.warn({ err }, 'listStrongMemoryUserTopicsForDrift failed'); return []; });
    if (!rows.length) return { scanned: 0, created: 0 };

    const currentYear = new Date().getFullYear();
    let created = 0;
    let scanned = 0;
    const f = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);

    for (const row of rows) {
        scanned += 1;
        const userId = row.user_id;
        const normalizedTopic = row.normalized_topic;
        const displayTopic = String(row.display_topic || row.normalized_topic || '').trim();
        if (!userId || !normalizedTopic || displayTopic.length < 2) continue;

        const qv = validateQuery(displayTopic);
        if (!qv.valid) continue;

        const topicKnowledge = await db.getTopicKnowledge(displayTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
        const known = collectKnownUidSet({ userRow: row, topicKnowledge });

        let raw;
        try {
            raw = await fetchUnifiedEvidence({
                query: qv.sanitized,
                safeLimit: 35,
                sourceList: ['pubmed', 'openalex'],
                serverConfig,
                fetch: f,
                vectorList: [],
            });
        } catch (e) {
            logger?.warn?.({ err: e, topic: normalizedTopic }, 'knowledgeDrift: fetchUnifiedEvidence failed');
            continue;
        }

        const ranked = selectTopEvidence(raw, 24, {});
        const fresh = ranked.filter((a) => {
            const uid = a.uid ? String(a.uid) : '';
            if (!uid || known.has(uid)) return false;
            return looksLandmarkCandidate(a, currentYear);
        });

        const pick = fresh[0];
        if (!pick?.uid) continue;

        const dup = await db.hasRecentProactiveEvidenceAlertForArticle(userId, normalizedTopic, String(pick.uid), 90);
        if (dup) continue;

        let summary = await buildWhatsNewSummary({
            serverConfig,
            fetchImpl: f,
            displayTopic,
            article: pick,
        });
        if (!summary) {
            summary = `Potentially influential new evidence for ${displayTopic}: "${pick.title || 'Recent article'}". Review in context of your saved evidence map.`;
        }

        const title = `What's New: ${displayTopic}`;
        const inserted = await db.insertProactiveEvidenceAlert({
            userId,
            normalizedTopic,
            displayTopic,
            title,
            summary,
            landmarkArticleUid: String(pick.uid),
            payload: {
                type: 'knowledge_drift',
                article: {
                    uid: pick.uid,
                    title: pick.title,
                    pubdate: pick.pubdate || pick.year,
                    journal: pick.journal || pick.source,
                    doi: pick.doi || null,
                    pmid: pick.pmid || null,
                },
            },
        });
        if (inserted) created += 1;
    }

    logger?.info?.({ scanned, alertsCreated: created }, 'knowledgeDrift: scan complete');
    return { scanned, created };
}

function scheduleKnowledgeDrift(db, serverConfig, fetchImpl, logger) {
    if (scheduledJob) {
        scheduledJob.stop();
        scheduledJob = null;
    }
    scheduledJob = cron.schedule('15 7 * * *', async () => {
        try {
            const { isBackgroundAutomationPaused } = require('./backgroundAutomationService');
            if (await isBackgroundAutomationPaused(db)) return;
            await runKnowledgeDriftScan({ db, serverConfig, fetchImpl, logger });
        } catch (e) {
            logger?.warn?.({ err: e }, 'knowledgeDrift: scheduled run failed');
        }
    });
    logger?.info?.('Knowledge drift scheduler active (daily 07:15 UTC)');
}

function stopKnowledgeDrift() {
    if (scheduledJob) {
        scheduledJob.stop();
        scheduledJob = null;
    }
}

module.exports = {
    scheduleKnowledgeDrift,
    stopKnowledgeDrift,
    runKnowledgeDriftScan,
    looksLandmarkCandidate,
    collectKnownUidSet,
};
