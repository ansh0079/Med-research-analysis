'use strict';

/**
 * Every durable knowledge writer. Policy (accept / reject / reason) must be
 * recorded before these paths persist clinician-facing content.
 *
 * This is an inventory, not a single write service. Callers keep their own
 * tables; they share the decision log.
 */
const WRITE_PATHS = Object.freeze([
    {
        id: 'upsertTeachingObject',
        family: 'teaching_object',
        owners: [
            'server/services/ai/teachingObjectService.js',
            'server/services/agent/agentSideEffectService.js',
            'server/services/guidelineSeedService.js',
            'server/services/topic/flagshipEnrichService.js',
        ],
        policyRequired: true,
    },
    {
        id: 'createGuideline',
        family: 'guideline',
        owners: [
            'server/services/guidelineService.js',
            'server/services/topic/topicSeedJobProcessor.js',
        ],
        policyRequired: true,
    },
    {
        id: 'upsertTopicKnowledge',
        family: 'topic_knowledge',
        owners: [
            'server/services/topic/topicKnowledgeExtraction.js',
            'server/services/communitySeminalRefinementService.js',
            'server/services/curriculumSeedService.js',
        ],
        policyRequired: true,
    },
    {
        id: 'upsertRegistryEntry',
        family: 'registry_entry',
        owners: ['server/services/registry/guidelineRegistryService.js'],
        policyRequired: true,
    },
    {
        id: 'verifyRegistryEntry',
        family: 'registry_verification',
        owners: ['server/scripts/registryCurate.js'],
        policyRequired: true,
    },
    {
        id: 'upsertGuidelineRefiling',
        family: 'guideline_refiling',
        owners: ['server/services/guidelineEmbeddingRefiling.js'],
        policyRequired: true,
        logAccepts: false,
    },
    {
        id: 'recordTopicAlias',
        family: 'topic_alias',
        owners: ['server/services/teachingObjectTopicReconciliation.js'],
        policyRequired: true,
        logAccepts: false,
    },
    {
        id: 'upsertCurriculumSeedTopic',
        family: 'curriculum',
        owners: ['server/services/teachingObjectTopicReconciliation.js'],
        policyRequired: true,
    },
    {
        id: 'upsertTrialGuidelineConflictReview',
        family: 'guideline_conflict',
        owners: ['server/services/conflictExtractionService.js'],
        policyRequired: true,
    },
    {
        id: 'insertGuidelineWatchEvent',
        family: 'guideline_watch',
        owners: ['server/services/guidelines/guidelineWatchtowerService.js'],
        policyRequired: true,
    },
    {
        id: 'upsertArticleCacheVector',
        family: 'vector_cache',
        owners: [
            'server/services/vector/vectorSearchService.js',
            'server/services/ops/jobHandlers.js',
        ],
        policyRequired: false,
    },
    {
        id: 'createAiGenerationJob',
        family: 'ai_job',
        owners: ['server/services/ai/aiGenerationJobService.js'],
        policyRequired: false,
    },
    {
        id: 'persistSearchEvidenceSnapshot',
        family: 'search_snapshot',
        owners: ['server/services/search/searchEvidenceSnapshot.js'],
        policyRequired: false,
    },
    {
        id: 'recordPersonalizationArmPull',
        family: 'bandit',
        owners: ['server/services/bandit/rewards.js'],
        policyRequired: false,
    },
    {
        id: 'recordLearningEvent',
        family: 'learning',
        owners: [
            'server/services/claimRemediationService.js',
            'server/services/agent/agentSideEffectService.js',
        ],
        policyRequired: false,
    },
]);

/**
 * The only places allowed to write the teaching_objects table with a raw SQL insert instead of
 * db.upsertTeachingObject (and therefore the write policy). tests/unit/writePolicyCoverage.test.js
 * fails when a raw INSERT appears anywhere else, so a new bypass is a decision, not an accident.
 */
const RAW_TEACHING_OBJECT_INSERT_EXEMPTIONS = Object.freeze([
    {
        file: 'server/services/articlePersistenceService.js',
        reason: 'Bibliographic record of a search hit (title, abstract, ids): no generated claim, MCQ or synopsis. Runs on every search, so a policy decision row per hit would swamp policy_decisions.',
    },
    {
        file: 'server/scripts/migrateFromSqlite.js',
        reason: 'One-off copy of rows that already passed the policy in the source database.',
    },
    {
        file: 'database/mixins/m08d-teaching-objects.js',
        reason: 'The policy-gated writer itself (upsertTeachingObject).',
    },
]);

function writersRequiringPolicy() {
    return WRITE_PATHS.filter((row) => row.policyRequired);
}

function findWritePath(id) {
    return WRITE_PATHS.find((row) => row.id === id) || null;
}

module.exports = {
    WRITE_PATHS,
    RAW_TEACHING_OBJECT_INSERT_EXEMPTIONS,
    writersRequiringPolicy,
    findWritePath,
};
