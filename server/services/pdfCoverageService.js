'use strict';

/**
 * Flagship PDF / GROBID coverage helpers for synopsis trust.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

const FLAGSHIP_TOPICS_PATH = path.join(__dirname, '../config/flagshipTopics.json');
const MIN_INDEXED_WORD_COUNT = 500;

function loadFlagshipTopicsConfig(configPath = FLAGSHIP_TOPICS_PATH) {
    try {
        if (!fs.existsSync(configPath)) return { topics: [], targets: {} };
        const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return {
            topics: Array.isArray(raw?.topics) ? raw.topics : [],
            targets: raw?.targets && typeof raw.targets === 'object' ? raw.targets : {},
            version: raw?.version || 1,
        };
    } catch (err) {
        logger.warn({ err }, 'loadFlagshipTopicsConfig failed');
        return { topics: [], targets: {} };
    }
}

function flagshipTopicNames({ priority = null } = {}) {
    const { topics } = loadFlagshipTopicsConfig();
    return topics
        .filter((t) => !priority || String(t.priority || '') === String(priority))
        .map((t) => String(t.topic || '').trim())
        .filter(Boolean);
}

function landmarkPmidsFromFlagshipConfig() {
    const { topics } = loadFlagshipTopicsConfig();
    const out = [];
    const seen = new Set();
    for (const topic of topics) {
        for (const pmid of topic.landmarkPmids || []) {
            const id = String(pmid || '').trim();
            if (!id || seen.has(id)) continue;
            seen.add(id);
            out.push({
                uid: `pubmed-${id}`,
                pmid: id,
                title: `Landmark PMID ${id}`,
                topic: topic.topic,
                isFree: true,
                _source: 'flagship_landmark',
            });
        }
    }
    return out;
}

function articleLooksIndexable(article = {}) {
    return Boolean(
        article?.doi
        || article?.pmid
        || article?.pmcid
        || article?.openAccessUrl
        || article?.fullTextUrl
        || article?.isFree
        || article?.openAccess
    );
}

/**
 * Collect seminal + landmark papers for offline PDF backfill.
 */
async function collectFlagshipArticlesForPdfBackfill(db, {
    topics = [],
    limitPerTopic = 12,
    includeLandmarks = true,
    priorityOnly = null,
} = {}) {
    let topicList = Array.isArray(topics) ? topics.map(String).filter(Boolean) : [];
    if (!topicList.length) {
        topicList = flagshipTopicNames({ priority: priorityOnly });
    }
    if (!topicList.length && typeof db?.all === 'function') {
        const rows = await db.all(
            `SELECT DISTINCT topic FROM topic_knowledge ORDER BY updated_at DESC LIMIT 25`
        ).catch(() => []);
        topicList = (rows || []).map((r) => r.topic).filter(Boolean);
    }

    const articles = [];
    const seen = new Set();
    const push = (row) => {
        const key = String(row?.doi || row?.pmid || row?.pmcid || row?.uid || '').toLowerCase();
        if (!key || seen.has(key) || !articleLooksIndexable(row)) return;
        seen.add(key);
        articles.push(row);
    };

    for (const topic of topicList) {
        const knowledge = await db?.getTopicKnowledge?.(topic).catch(() => null);
        const seminal = Array.isArray(knowledge?.knowledge?.seminalPapers)
            ? knowledge.knowledge.seminalPapers
            : [];
        for (const p of seminal.slice(0, limitPerTopic)) {
            push({
                uid: p.uid || p.pmid || p.doi || `seminal-${topic}`,
                pmid: p.pmid || null,
                doi: p.doi || null,
                pmcid: p.pmcid || null,
                title: p.title || 'Untitled',
                isFree: Boolean(p.isFree || p.pmcid || p.openAccess),
                openAccess: Boolean(p.openAccess),
                openAccessUrl: p.openAccessUrl || p.fullTextUrl || null,
                fullTextUrl: p.fullTextUrl || null,
                topic,
                _source: 'flagship_seminal',
            });
        }
    }

    if (includeLandmarks) {
        const allowedTopics = new Set(topicList);
        for (const article of landmarkPmidsFromFlagshipConfig()) {
            if (allowedTopics.size && !allowedTopics.has(article.topic)) continue;
            push(article);
        }
    }

    return articles;
}

function pdfPayloadIsIndexed(payload, minWords = MIN_INDEXED_WORD_COUNT) {
    return Number(payload?.wordCount || payload?.word_count || 0) >= minWords;
}

/**
 * Per-topic landmark PDF coverage for audits.
 */
async function measureFlagshipPdfCoverage(db, {
    topics = null,
    minWords = MIN_INDEXED_WORD_COUNT,
} = {}) {
    const config = loadFlagshipTopicsConfig();
    const topicRows = Array.isArray(topics) && topics.length
        ? config.topics.filter((t) => topics.includes(t.topic))
        : config.topics;

    const rows = [];
    for (const topic of topicRows) {
        const pmids = (topic.landmarkPmids || []).map(String).filter(Boolean);
        let indexed = 0;
        const missing = [];
        for (const pmid of pmids) {
            let has = false;
            if (typeof db?.getPdfSections === 'function') {
                const payload = await db.getPdfSections(pmid).catch(() => null)
                    || await db.getPdfSections(`pubmed-${pmid}`).catch(() => null);
                has = pdfPayloadIsIndexed(payload, minWords);
            }
            if (has) indexed += 1;
            else missing.push(pmid);
        }
        const total = pmids.length;
        const ratio = total > 0 ? indexed / total : null;
        rows.push({
            topic: topic.topic,
            block: topic.block,
            priority: topic.priority,
            landmarkTotal: total,
            landmarkIndexed: indexed,
            fullTextCoverageRatio: ratio,
            missingLandmarkPmids: missing,
            meetsNorm: total === 0 ? null : ratio >= 0.6,
        });
    }

    const withLandmarks = rows.filter((r) => r.landmarkTotal > 0);
    const meetingNorm = withLandmarks.filter((r) => r.meetsNorm).length;
    return {
        minWords,
        topicCount: rows.length,
        topicsWithLandmarks: withLandmarks.length,
        topicsMeetingCoverageNorm: meetingNorm,
        coverageNormThreshold: 0.6,
        meanLandmarkCoverage: withLandmarks.length
            ? withLandmarks.reduce((sum, r) => sum + Number(r.fullTextCoverageRatio || 0), 0) / withLandmarks.length
            : null,
        topics: rows,
    };
}

module.exports = {
    FLAGSHIP_TOPICS_PATH,
    MIN_INDEXED_WORD_COUNT,
    loadFlagshipTopicsConfig,
    flagshipTopicNames,
    landmarkPmidsFromFlagshipConfig,
    collectFlagshipArticlesForPdfBackfill,
    pdfPayloadIsIndexed,
    measureFlagshipPdfCoverage,
};
