'use strict';

const CoreDatabase = require('./DatabaseCore');

const MIXIN_LAYERS = [
    ['m01-search-topic-knowledge', require('./mixins/m01-search-topic-knowledge')],
    ['m02-guidelines-learning-quiz-adaptive', require('./mixins/m02-guidelines-learning-quiz-adaptive')],
    ['m03-bouquet-learning-observability-prelude', require('./mixins/m03-bouquet-learning-observability-prelude')],
    ['m04-interactions-impressions-study-runs', require('./mixins/m04-interactions-impressions-study-runs')],
    ['m05-curriculum-agent-case-mastery', require('./mixins/m05-curriculum-agent-case-mastery')],
    ['m06-sessions-saved-cache-teams', require('./mixins/m06-sessions-saved-cache-teams')],
    ['m07-analytics-vector-cache-ai-jobs', require('./mixins/m07-analytics-vector-cache-ai-jobs')],
    ['m08-review-audit-billing-cpd', require('./mixins/m08-review-audit-billing-cpd')],
    ['m09-claim-lifecycle', require('./mixins/m09-claim-lifecycle')],
    ['m10-advanced-learning', require('./mixins/m10-advanced-learning')],
    ['m11-llm-usage', require('./mixins/m11-llm-usage')],
    ['m12-topic-knowledge', require('./mixins/m12-topic-knowledge')],
    ['m13-curriculum-seed', require('./mixins/m13-curriculum-seed')],
    ['m14-users-teams', require('./mixins/m14-users-teams')],
    ['m15-topic-crosslinks', require('./mixins/m15-topic-crosslinks')],
    ['m16-personalization-bandit', require('./mixins/m16-personalization-bandit')],
    ['m17-guideline-contradictions', require('./mixins/m17-guideline-contradictions')],
    ['m18-case-sessions', require('./mixins/m18-case-sessions')],
    ['m19-account-privacy', require('./mixins/m19-account-privacy')],
];

const ALLOWED_REPLACEMENTS = {
    'm01-search-topic-knowledge->m12-topic-knowledge': new Set([
        'normalizeTopic',
        'buildTopicKnowledgeAliasesJson',
        'mergeNormalizedAliasesJson',
        'mergeVerifiedAnchorsIntoKnowledge',
        '_getTopicKnowledgeRowByAlias',
        'getTopicKnowledge',
        'mapTopicKnowledgeRow',
        'isProtectedTopicKnowledgeStatus',
        'mapTopicKnowledgeProposalRow',
        'listTopicKnowledge',
        'isTopicKnowledgeStale',
        'upsertTopicKnowledge',
        'createTopicKnowledgeProposal',
        'getTopicKnowledgeProposal',
        'listTopicKnowledgeProposals',
        'listTopicKnowledgeProposalsForUser',
        'approveTopicKnowledgeProposal',
        'rejectTopicKnowledgeProposal',
        'updateTopicKnowledge',
        'appendTopicKnowledgeVerifiedAnchor',
        'mergeTopicKnowledgeAliases',
        'markTopicKnowledgeReviewed',
    ]),
    'm05-curriculum-agent-case-mastery->m13-curriculum-seed': new Set([
        'mapCurriculumSeedTopicRow',
        'ensureCurriculum',
        'ensureCurriculumBlock',
        'upsertCurriculumSeedTopic',
        'importCurriculumSeedTopics',
        'listCurriculumSeedTopics',
        'listCurriculumSeedCandidates',
        'getCurriculumSeedStatusCounts',
        'getAdminRuntimeSetting',
        'setAdminRuntimeSetting',
        'getCurriculumSeedUsageForDate',
        'incrementCurriculumSeedUsage',
        'getCurriculumSeedTopic',
        'updateCurriculumSeedStatus',
    ]),
    'm06-sessions-saved-cache-teams->m14-users-teams': new Set([
        'createUser',
        'getUserByEmail',
        'getUserById',
        'updateUser',
        'saveArticleToUser',
        'getUserSavedArticles',
        'unsaveArticleFromUser',
        'saveArticleToTeam',
        'getTeamSavedArticles',
        'unsaveArticleFromTeam',
        'createSearchAlert',
        'getUserSearchAlerts',
        'deactivateSearchAlert',
        'createTeam',
        'getTeamById',
        'getUserTeams',
        'updateTeam',
        'deleteTeam',
        'addTeamMember',
        'getTeamMembers',
        'getTeamRoleForUser',
        'updateTeamMemberRole',
        'removeTeamMember',
        'createTeamCollection',
        'getTeamCollections',
        'getTeamCollection',
        'deleteTeamCollection',
        'addArticleToTeamCollection',
        'getTeamCollectionArticles',
        'removeArticleFromTeamCollection',
        'createTeamInvitation',
        'getTeamInvitationByToken',
        'acceptTeamInvitation',
    ]),
};

function ownMethodNames(klass) {
    return Object.getOwnPropertyNames(klass.prototype)
        .filter((name) => name !== 'constructor' && typeof klass.prototype[name] === 'function');
}

function validateMixinCollisions() {
    const owners = new Map();
    const collisions = [];

    for (const name of ownMethodNames(CoreDatabase)) {
        owners.set(name, 'DatabaseCore');
    }

    for (const [layerName, applyLayer] of MIXIN_LAYERS) {
        const Probe = applyLayer(class {});
        for (const methodName of ownMethodNames(Probe)) {
            const previous = owners.get(methodName);
            if (previous) {
                const replacement = `${previous}->${layerName}`;
                if (!ALLOWED_REPLACEMENTS[replacement]?.has(methodName)) {
                    collisions.push({ methodName, previous, next: layerName });
                }
            }
            owners.set(methodName, layerName);
        }
    }

    if (collisions.length > 0) {
        const details = collisions
            .map((c) => `${c.methodName}: ${c.previous} -> ${c.next}`)
            .join('\n');
        throw new Error(`Database mixin method collision(s) detected:\n${details}`);
    }

    return owners;
}

function composeDatabase() {
    const methodOwners = validateMixinCollisions();
    let Database = CoreDatabase;
    for (const [, applyLayer] of MIXIN_LAYERS) {
        Database = applyLayer(Database);
    }
    Object.defineProperty(Database, 'mixinLayers', {
        value: MIXIN_LAYERS.map(([name]) => name),
        enumerable: true,
    });
    Object.defineProperty(Database, 'methodOwners', {
        value: methodOwners,
        enumerable: false,
    });
    return Database;
}

module.exports = {
    composeDatabase,
    MIXIN_LAYERS: MIXIN_LAYERS.map(([name]) => name),
    validateMixinCollisions,
};
