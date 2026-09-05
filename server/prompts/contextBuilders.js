'use strict';

const { AI_DISCLAIMER } = require('../services/aiConstants');
const { formatMisconceptionPromptBlock } = require('../utils/misconceptionPromptBlock');
const { formatStoredTopicKnowledgeForPrompt } = require('./_helpers');
const { formatLearnerPromptSupplement } = require('../services/learnerContextService');
const { formatConflictMatrixForPrompt } = require('../services/conflictExtractionService');

function safeText(value, max = 1200) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function buildGuidelineContextBlock(guidelines = [], { max = 4, variant = 'default' } = {}) {
    const rows = (Array.isArray(guidelines) ? guidelines : []).slice(0, max);
    if (!rows.length) return variant === 'synthesis' ? 'No guideline context provided.' : 'No guideline context provided.';
    if (variant === 'synthesis') {
        return rows.map((g, i) => `[GUIDELINE ${i + 1}]
Source: ${g.source_body || g.sourceBody || 'Guideline'}${g.source_region || g.sourceRegion ? ` (${g.source_region || g.sourceRegion})` : ''}${g.source_year || g.sourceYear ? ` — ${g.source_year || g.sourceYear}` : ''}
Recommendation: ${g.recommendation_text || g.recommendationText || ''}${g.recommendation_strength || g.recommendationStrength ? `\nStrength: ${g.recommendation_strength || g.recommendationStrength}` : ''}${g.recommendation_certainty || g.recommendationCertainty ? `\nCertainty: ${g.recommendation_certainty || g.recommendationCertainty}` : ''}${g.population ? `\nPopulation: ${g.population}` : ''}${g.cautions ? `\nCautions: ${g.cautions}` : ''}`).join('\n\n');
    }
    if (variant === 'synopsis') {
        return rows.map((g, i) => {
            const source = g.sourceBody || g.source_body || g.source || 'Guideline source';
            const year = g.sourceYear || g.source_year || '';
            const recommendation = g.recommendationText || g.recommendation_text || g.summary || '';
            const strength = g.recommendationStrength || g.recommendation_strength || '';
            const certainty = g.recommendationCertainty || g.recommendation_certainty || '';
            const population = g.population || '';
            const cautions = g.cautions || '';
            return `[G${i + 1}] ${safeText(source, 100)}${year ? ` (${safeText(year, 20)})` : ''}
Recommendation: ${safeText(recommendation, 500)}${strength ? `\nStrength: ${safeText(strength, 80)}` : ''}${certainty ? `\nCertainty: ${safeText(certainty, 80)}` : ''}${population ? `\nPopulation: ${safeText(population, 180)}` : ''}${cautions ? `\nCautions: ${safeText(cautions, 220)}` : ''}`;
        }).join('\n\n');
    }
    return rows.map((g, i) => {
        const source = g.source_body || g.sourceBody || g.source || 'Guideline';
        const year = g.source_year || g.sourceYear || '';
        const rec = g.recommendation_text || g.recommendationText || g.summary || '';
        const strength = g.recommendation_strength || g.recommendationStrength || '';
        return `[G${i + 1}] ${safeText(source, 100)}${year ? ` (${safeText(year, 20)})` : ''}
Recommendation: ${safeText(rec, 500)}${strength ? `\nStrength: ${safeText(strength, 80)}` : ''}`;
    }).join('\n\n');
}

function buildMisconceptionContextBlock(options = {}) {
    const block = formatMisconceptionPromptBlock({
        personalMisconceptions: options.personalMisconceptions,
        inferredMisconceptions: options.inferredMisconceptions,
        collectiveMisconceptions: options.collectiveMisconceptions,
        style: options.style || 'default',
    });
    return block;
}

function buildLearnerContextBlock(userContext = null, options = {}) {
    if (!userContext) return '';
    const parts = [];
    const supplement = formatLearnerPromptSupplement(userContext, {
        misconceptionLog: options.misconceptionLog || userContext.misconceptionLog || null,
    });
    if (supplement) parts.push(supplement);
    if (userContext.topicMemory) {
        const tm = userContext.topicMemory;
        parts.push(`Topic memory: searches≈${Number(tm.searchCount || 0)}, weak nodes≈${Array.isArray(tm.weakOutlineNodeIds) ? tm.weakOutlineNodeIds.length : 0}`);
    }
    return parts.length ? `LEARNER CONTEXT:\n${parts.join('\n')}\n` : '';
}

function buildConflictMatrixBlock(conflictMatrix = []) {
    return formatConflictMatrixForPrompt(conflictMatrix);
}

const FULL_TEXT_SECTION_ORDER = ['methods', 'results', 'discussion', 'conclusion'];
const SYNOPSIS_SECTION_LIMITS = { methods: 5000, results: 8000, discussion: 5000, conclusion: 3000 };
const DEFAULT_SECTION_LIMIT = 1200;

/**
 * Shared full-text excerpt builder used by synopsis, synthesis, and source blocks.
 * @param {object} article
 * @param {{ variant?: 'default'|'synthesis'|'synopsis', includeFullText?: boolean, sectionLimits?: object }} [options]
 */
function buildFullTextExcerptsBlock(article = {}, {
    variant = 'default',
    includeFullText = true,
    sectionLimits = null,
} = {}) {
    if (!includeFullText || !article._fullTextIndexed || !article._fullTextSections) return '';
    const sections = article._fullTextSections;
    const limits = sectionLimits || (variant === 'synopsis' ? SYNOPSIS_SECTION_LIMITS : {});
    const defaultLimit = variant === 'synopsis' ? 4000 : DEFAULT_SECTION_LIMIT;
    const parts = [];
    for (const key of FULL_TEXT_SECTION_ORDER) {
        const text = sections[key];
        if (text && String(text).trim().length > 20) {
            parts.push(`${key.toUpperCase()}: ${String(text).slice(0, limits[key] || defaultLimit)}`);
        }
    }
    if (!parts.length) return '';
    if (variant === 'synopsis') {
        return `\n\nFull-text excerpts (${article._fullTextWordCount || '?'} words indexed):\n${parts.join('\n')}`;
    }
    if (variant === 'synthesis') {
        return `\nFull-text excerpts (${article._fullTextWordCount || '?'} words total):\n${parts.join('\n')}`;
    }
    return `\nFull-text excerpts:\n${parts.join('\n')}`;
}

function buildSourceEvidenceBlock(articles = [], { max = 15, includeFullText = true, variant = 'default' } = {}) {
    return (Array.isArray(articles) ? articles : []).slice(0, max).map((a, i) => {
        const year = a.pubdate?.split(' ')[0] || a.year || 'unknown';
        const journal = a.source || a.journal || 'unknown';
        const fullTextBlock = buildFullTextExcerptsBlock(a, { variant, includeFullText });
        const label = variant === 'synthesis' ? 'STUDY' : 'SOURCE';
        if (variant === 'synthesis') {
            const citations = a.pmcrefcount ?? a.citationCount ?? 'unknown';
            const studyType = a.pubtype?.[0] || 'Study';
            return `[${label} ${i + 1}]
Title: ${a.title}
Journal: ${journal} (${year})
Study type: ${studyType}
Citations: ${citations}
Abstract: ${a.abstract || 'No abstract provided.'}${fullTextBlock}`;
        }
        return `[${label} ${i + 1}]
Title: ${safeText(a.title, 300)}
Journal: ${journal} (${year})
Abstract: ${safeText(a.abstract, 900) || 'No abstract.'}${fullTextBlock}`;
    }).join('\n\n');
}

function buildTopicKnowledgeBlock(topicKnowledgeRow) {
    return formatStoredTopicKnowledgeForPrompt(topicKnowledgeRow);
}

function buildSafetyDisclaimerBlock(custom = null) {
    return custom || AI_DISCLAIMER;
}

function composePromptSections(sections = []) {
    return sections.filter(Boolean).map((s) => String(s).trim()).join('\n\n');
}

module.exports = {
    buildGuidelineContextBlock,
    buildMisconceptionContextBlock,
    buildLearnerContextBlock,
    buildConflictMatrixBlock,
    buildSourceEvidenceBlock,
    buildFullTextExcerptsBlock,
    FULL_TEXT_SECTION_ORDER,
    SYNOPSIS_SECTION_LIMITS,
    buildTopicKnowledgeBlock,
    buildSafetyDisclaimerBlock,
    composePromptSections,
    safeText,
};
