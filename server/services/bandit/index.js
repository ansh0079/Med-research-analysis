'use strict';

const {
    POLICY_SEARCH_RANKING,
    POLICY_RECOMMENDATION,
    POLICY_QUIZ_CLAIM_SELECTION,
    POLICY_SYNOPSIS_STYLE,
    POLICY_TEACHING_STRATEGY,
    POLICY_CASE_DIFFICULTY,
    SEARCH_RANKING_ARMS,
    SYNOPSIS_STYLE_ARMS,
    TEACHING_STRATEGY_ARMS,
    CASE_DIFFICULTY_ARMS,
    caseDifficultyArmId,
    RECOMMENDATION_STRATEGY_ARMS,
    RECOMMENDATION_ARM_BY_TYPE,
    DUE_REVIEW_FLOOR_SLOT,
    MIN_PULLS_FOR_USER_ARM,
    FULL_PULLS_FOR_USER_ARM,
} = require('./constants');

const {
    isBanditEnabled,
    hierarchicalUserWeight,
    blendedArmSample,
    recommendationContextFeatures,
    searchRankingContextFeatures,
    contextualArmPriorBoost,
    chooseArmBySamplesContextual,
    softmaxPropensities,
    sampleBeta,
} = require('./sampling');

const {
    selectSearchRankingArm,
    immediateImpressionReward,
    recordSearchRankingDecisions,
} = require('./searchRankingPolicy');

const {
    applyRecommendationBandit,
    applyDueReviewPriorityFloor,
    isDueReviewItem,
} = require('./recommendationPolicy');
const { selectSynopsisStyleArm } = require('./synopsisStylePolicy');
const { selectTeachingStrategyArm } = require('./teachingStrategyPolicy');
const { selectCaseDifficultyArm } = require('./caseDifficultyPolicy');
const { applyQuizClaimSelectionBandit } = require('./quizClaimPolicy');
const { recordBanditReward, reconcileImpressionRewards } = require('./rewards');

module.exports = {
    POLICY_SEARCH_RANKING,
    POLICY_RECOMMENDATION,
    POLICY_QUIZ_CLAIM_SELECTION,
    POLICY_SYNOPSIS_STYLE,
    POLICY_TEACHING_STRATEGY,
    POLICY_CASE_DIFFICULTY,
    SEARCH_RANKING_ARMS,
    SYNOPSIS_STYLE_ARMS,
    TEACHING_STRATEGY_ARMS,
    CASE_DIFFICULTY_ARMS,
    caseDifficultyArmId,
    recommendationContextFeatures,
    searchRankingContextFeatures,
    contextualArmPriorBoost,
    chooseArmBySamplesContextual,
    softmaxPropensities,
    RECOMMENDATION_STRATEGY_ARMS,
    RECOMMENDATION_ARM_BY_TYPE,
    DUE_REVIEW_FLOOR_SLOT,
    applyDueReviewPriorityFloor,
    isDueReviewItem,
    MIN_PULLS_FOR_USER_ARM,
    FULL_PULLS_FOR_USER_ARM,
    isBanditEnabled,
    hierarchicalUserWeight,
    blendedArmSample,
    selectSearchRankingArm,
    selectSynopsisStyleArm,
    selectTeachingStrategyArm,
    selectCaseDifficultyArm,
    applyQuizClaimSelectionBandit,
    immediateImpressionReward,
    recordSearchRankingDecisions,
    applyRecommendationBandit,
    recordBanditReward,
    reconcileImpressionRewards,
    sampleBeta,
};
