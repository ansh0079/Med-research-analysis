const crypto = require('crypto');
const logger = require('../config/logger');

function normalizePicoExtraction(input) {
    const safe = input && typeof input === 'object' ? input : {};
    const outcomes = Array.isArray(safe.outcomes) ? safe.outcomes.map((x) => String(x)) : [];
    const confidence = Number(safe.confidence);
    const missingFields = Array.isArray(safe.missingFields) ? safe.missingFields.map((x) => String(x)) : [];
    return {
        population: String(safe.population || ''),
        intervention: String(safe.intervention || ''),
        comparison: String(safe.comparison || ''),
        outcomes,
        studyDesign: String(safe.studyDesign || 'unknown'),
        sampleSize: Number.isFinite(Number(safe.sampleSize)) ? Number(safe.sampleSize) : 0,
        followUp: String(safe.followUp || ''),
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
        missingFields,
    };
}

function parseJsonBlock(text) {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();
    try {
        return JSON.parse(trimmed);
    } catch {
        const match = trimmed.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch {
            return null;
        }
    }
}

function toCsv(rows) {
    const headers = [
        'article_id',
        'title',
        'year',
        'journal',
        'screening_status',
        'exclusion_reason',
        'population',
        'intervention',
        'comparison',
        'outcomes',
        'study_design',
        'sample_size',
        'follow_up',
        'pico_confidence',
    ];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.join(',')];
    for (const row of rows) {
        const article = row.article_data || {};
        const pico = row.extraction || {};
        lines.push([
            row.article_id,
            article.title || '',
            article.year || article.pubdate || '',
            article.journal || article.source || '',
            row.screening_status || 'pending',
            row.exclusion_reason || '',
            pico.population || '',
            pico.intervention || '',
            pico.comparison || '',
            Array.isArray(pico.outcomes) ? pico.outcomes.join('; ') : '',
            pico.studyDesign || '',
            pico.sampleSize || 0,
            pico.followUp || '',
            row.confidence || pico.confidence || 0,
        ].map(esc).join(','));
    }
    return lines.join('\n');
}

function createReviewService({ db }) {
    async function createProject({ title, question, criteria, ownerType, ownerId }) {
        const id = crypto.randomUUID();
        return db.createReviewProject({
            id,
            title: title || question || 'Untitled Review',
            question,
            criteria: criteria || {},
            ownerType: ownerType || 'session',
            ownerId,
        });
    }

    async function getProject(reviewId) {
        return db.getReviewProject(reviewId);
    }

    function normalizeTitle(title) {
        return String(title || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function titleJaccard(a, b) {
        const setA = new Set(normalizeTitle(a).split(' ').filter(w => w.length > 2));
        const setB = new Set(normalizeTitle(b).split(' ').filter(w => w.length > 2));
        if (setA.size === 0 || setB.size === 0) return 0;
        const intersection = [...setA].filter(w => setB.has(w)).length;
        return intersection / (setA.size + setB.size - intersection);
    }

    async function addArticles(reviewId, articles) {
        const existing = await db.listReviewArticles(reviewId).catch((err) => { logger.warn({ err }, 'listReviewArticles failed'); return []; });
        const duplicates = [];

        for (const newArt of articles) {
            const newTitle = normalizeTitle(newArt.title || newArt.articleId || '');
            if (!newTitle) continue;
            for (const ex of existing) {
                const exTitle = normalizeTitle(ex.article_data?.title || ex.article_id || '');
                const similarity = titleJaccard(newTitle, exTitle);
                if (similarity >= 0.8) {
                    duplicates.push({
                        newId: String(newArt.uid || newArt.articleId || ''),
                        existingId: String(ex.article_id),
                        title: newArt.title || newArt.articleId,
                        similarity: Math.round(similarity * 100),
                    });
                    break;
                }
            }
        }

        const rows = await db.addReviewArticles(reviewId, articles);
        return { articles: rows, duplicates };
    }

    async function listArticles(reviewId) {
        return db.listReviewArticles(reviewId);
    }

    async function updateScreening(reviewId, articleId, patch) {
        return db.updateReviewScreening(reviewId, articleId, patch);
    }

    async function prismaCounts(reviewId) {
        return db.getReviewPrismaCounts(reviewId);
    }

    async function upsertPico(articleId, extraction, provider, model, confidence) {
        const normalized = normalizePicoExtraction(extraction);
        return db.upsertPicoExtraction(articleId, normalized, provider, model, confidence ?? normalized.confidence);
    }

    async function getPico(articleId) {
        return db.getPicoExtraction(articleId);
    }

    async function getExtractionRows(reviewId) {
        return db.getReviewExtractionRows(reviewId);
    }

    async function exportCsv(reviewId) {
        const rows = await getExtractionRows(reviewId);
        return toCsv(rows);
    }

    return {
        createProject,
        getProject,
        addArticles,
        listArticles,
        updateScreening,
        prismaCounts,
        upsertPico,
        getPico,
        getExtractionRows,
        exportCsv,
        parseJsonBlock,
        normalizePicoExtraction,
    };
}

module.exports = {
    createReviewService,
    parseJsonBlock,
    normalizePicoExtraction,
    formatReviewCsv: toCsv,
};
