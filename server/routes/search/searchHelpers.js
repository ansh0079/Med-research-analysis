function clampLimit(val, def = 20, min = 1, max = 100) {
    const n = parseInt(String(val), 10);
    return Number.isNaN(n) ? def : Math.min(Math.max(n, min), max);
}

const logger = require('../../config/logger');
const { validateQuery, validatePagination, sanitizeArticleOutput } = require('../../utils/articles');
const { safeFetch } = require('../../utils/fetch');
const { articleFromOpenAlexWork } = require('../../services/unifiedEvidenceSearch');
const { classifyQueryIntent } = require('../../services/evidenceBouquetService');
const { parseSearchRequestQuery, parsePreviousQueries, fetchAndRankSearchArticles, prefetchTeachingArtifacts } = require('../../services/searchPipeline');
const { mergeCuratedWithLiveEvidence } = require('../../services/searchEvidenceMergeService');
const { buildSearchLearningContext, applySearchLearningBoost, publicLearningContext } = require('../../services/searchLearningService');
const { recordSearchRankingDecisions } = require('../../services/personalizationBanditService');
const { buildLearnerContext, publicLearnerContextSummary } = require('../../services/learnerContextService');
const crypto = require('crypto');
const { createAiService, PINNED_MODELS, TEMPERATURE } = require('../../services/aiService');
const { buildTopicKnowledgePrompt } = require('../../prompts');
const { resolveProvider } = require('../../utils/aiProvider');
const { generateAndStoreMCQs } = require('../../services/mcqGeneratorService');
const { guidelineMcqKey } = require('../../utils/teachingObjectKeys');
const { searchGuidelines } = require('../../services/guidelineService');
const { buildEvidenceMap, persistConsensusTeachingObject } = require('../../services/teachingObjectService');
const { enqueuePdfPreindexForArticles } = require('../../services/pdfPreindexService');
const { alignTopicClaimsWithGuidelines } = require('../../services/claimGuidelineEngine');
const { parseJsonBlock, parseJsonArrayBlock } = require('../../utils/parseJson');
const { buildProxyService } = require('../../services/externalApiProxy');
const { authenticateApiKey } = require('../../services/apiKeyService');
const { hasFeature } = require('../../config/entitlements');
const { createBudgetForAction, runWithLlmBudget } = require('../../services/llmRequestBudget');
const { persistSearchedArticles } = require('../../services/articlePersistenceService');
const { validateAiOutput } = require('../../services/aiOutputValidation');
const { publicRankingTraces } = require('../../services/searchRankingTrace');
const { explainInteractionReward } = require('../../services/rewardAttributionService');
const { attributeSearchInteractionReward } = require('../../services/searchLearningOutcomeService');

async function attachApiKeyUser(req, res, next) {
    const raw = req.headers['x-api-key'];
    if (!raw || !String(raw).startsWith('mr_live_')) return next();
    try {
        const auth = await authenticateApiKey(String(raw).trim());
        if (!auth) return res.status(401).json({ error: 'Invalid or revoked API key' });
        if (!hasFeature(auth.user, 'apiAccess')) {
            return res.status(402).json({ error: 'API access requires Pro plan or higher', feature: 'apiAccess' });
        }
        req.user = auth.user;
        req.authVia = 'api_key';
        return next();
    } catch (err) {
        logger.warn({ err }, 'API key attach failed');
        return res.status(500).json({ error: 'Authentication error' });
    }
}

const CROSSREF_BASE = 'https://api.crossref.org';

const isDev = process.env.NODE_ENV === 'development';

function setEdgeCacheHeaders(res, seconds = 300) {
    res.setHeader('Cache-Control', `public, max-age=60, s-maxage=${seconds}, stale-while-revalidate=86400`);
    res.setHeader('CDN-Cache-Control', `public, s-maxage=${seconds}`);
}

/** Unified search applies post-fetch relevance filtering; avoid CDN/browser storing pre-filter responses. */
function setNoStoreSearchHeaders(res) {
    res.setHeader('Cache-Control', 'private, no-store');
}

function shouldAutoSeedFromSearch() {
    const flag = String(process.env.AUTO_SEED_ON_SEARCH || '').toLowerCase();
    if (flag === 'true' || flag === '1') return true;
    if (flag === 'false' || flag === '0') return false;
    return process.env.NODE_ENV !== 'production';
}

module.exports = {
    clampLimit,
    attachApiKeyUser,
    setEdgeCacheHeaders,
    setNoStoreSearchHeaders,
    shouldAutoSeedFromSearch,
    isDev,
    CROSSREF_BASE,
};
