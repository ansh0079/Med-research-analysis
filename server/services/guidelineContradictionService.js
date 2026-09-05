'use strict';

const logger = require('../config/logger');
const { tokenizeGuidelineText } = require('../utils/guidelineRelevance');

const NEGATIVE_RE = /\b(do not|don't|not recommended|not routinely|is not indicated|avoid|against|no longer recommend|should not)\b/i;
const POSITIVE_RE = /\b(is recommended|are recommended|recommend|offer|first-line|is indicated|should (?:start|give|use|treat|offer))\b/i;

function guidelineText(guideline) {
    return [
        guideline?.recommendationText || guideline?.recommendation_text || '',
        guideline?.intervention || '',
        guideline?.cautions || '',
    ].join(' ');
}

function polarity(text) {
    const raw = String(text || '');
    if (NEGATIVE_RE.test(raw)) return 'negative';
    if (POSITIVE_RE.test(raw)) return 'positive';
    return 'neutral';
}

function distinctiveTokens(text) {
    return [...new Set(tokenizeGuidelineText(text).filter((token) => token.length >= 5))];
}

function tokenOverlap(aTokens, bTokens) {
    const b = new Set(bTokens);
    return aTokens.filter((token) => b.has(token));
}

function detectLexicalContradictions(guidelines = []) {
    const rows = (Array.isArray(guidelines) ? guidelines : []).filter((row) => row?.id && (row.sourceBody || row.source_body));
    const cards = [];
    for (let i = 0; i < rows.length; i += 1) {
        for (let j = i + 1; j < rows.length; j += 1) {
            const a = rows[i];
            const b = rows[j];
            const bodyA = a.sourceBody || a.source_body;
            const bodyB = b.sourceBody || b.source_body;
            if (!bodyA || !bodyB || bodyA === bodyB) continue;
            const textA = guidelineText(a);
            const textB = guidelineText(b);
            const polA = polarity(textA);
            const polB = polarity(textB);
            if (!((polA === 'positive' && polB === 'negative') || (polA === 'negative' && polB === 'positive'))) {
                continue;
            }
            const overlap = tokenOverlap(distinctiveTokens(textA), distinctiveTokens(textB));
            if (overlap.length < 2) continue;
            const [first, second] = String(a.id) < String(b.id) ? [a, b] : [b, a];
            cards.push({
                guidelineAId: first.id,
                guidelineBId: second.id,
                severity: 'minor',
                contradictionSummary: `${bodyA} and ${bodyB} give opposing recommendations on ${overlap.slice(0, 4).join(', ')}.`,
                bodyAPosition: String(first.recommendationText || first.recommendation_text || '').slice(0, 400),
                bodyBPosition: String(second.recommendationText || second.recommendation_text || '').slice(0, 400),
                clinicalImplication: 'Treat this as a cross-body conflict until a curator or LLM pass confirms severity.',
                aiConfidence: 0.34,
                source: 'lexical',
            });
        }
    }
    return cards;
}

async function refreshLexicalContradictions(db, topic) {
    if (!db?.getGuidelinesByTopic || !db?.upsertContradiction) return [];
    const guidelines = await db.getGuidelinesByTopic(topic, { limit: 40, skipRank: true }).catch(() => []);
    const cards = detectLexicalContradictions(guidelines);
    const normalizedTopic = typeof db.normalizeTopic === 'function'
        ? db.normalizeTopic(topic)
        : String(topic || '').toLowerCase();
    for (const card of cards) {
        await db.upsertContradiction({
            ...card,
            normalizedTopic,
        }).catch((err) => {
            logger.debug({ err, topic }, 'lexical contradiction upsert failed');
        });
    }
    return cards;
}

function compactContradictionCard(card) {
    const severity = String(card?.severity || 'nuanced').toUpperCase();
    const bodyA = card?.guidelineA?.sourceBody || 'Body A';
    const bodyB = card?.guidelineB?.sourceBody || 'Body B';
    const summary = String(card?.contradictionSummary || '').replace(/\s+/g, ' ').trim();
    return `- [${severity}] ${bodyA} vs ${bodyB}: ${summary.slice(0, 280)}`;
}

async function getContradictionCardsForTopic(db, topic, { limit = 6 } = {}) {
    if (!db?.getContradictionsForTopic || !topic) return [];
    const rows = await db.getContradictionsForTopic(topic).catch((err) => {
        logger.debug({ err, topic }, 'getContradictionsForTopic failed');
        return [];
    });
    return (Array.isArray(rows) ? rows : []).slice(0, Math.min(Math.max(Number(limit) || 6, 1), 12));
}

module.exports = {
    polarity,
    detectLexicalContradictions,
    refreshLexicalContradictions,
    compactContradictionCard,
    getContradictionCardsForTopic,
};
