const { buildSynthesisPrompt } = require('./synthesis');
const { buildQuizPrompt } = require('./quiz');
const { buildSeminalKnowledgeExtractionPrompt, buildTopicKnowledgePrompt } = require('./knowledge');
const { buildAnalysisPrompt, buildPicoExtractionPrompt, buildScreeningAssistPrompt } = require('./analysis');
const { buildCaseSearchQueryPrompt, buildCaseEvidencePrompt } = require('./case');
const { buildTeachingVignettePrompt } = require('./teaching');
const { buildSynopsisPrompt, buildJournalClubPrompt } = require('./synopsis');
const { buildGuidelineQuizPrompt } = require('./guidelineQuiz');
const { formatStoredTopicKnowledgeForPrompt } = require('./_helpers');

module.exports = {
    buildSynthesisPrompt,
    buildQuizPrompt,
    buildSeminalKnowledgeExtractionPrompt,
    buildTopicKnowledgePrompt,
    buildAnalysisPrompt,
    buildPicoExtractionPrompt,
    buildScreeningAssistPrompt,
    buildCaseSearchQueryPrompt,
    buildCaseEvidencePrompt,
    buildTeachingVignettePrompt,
    buildSynopsisPrompt,
    buildJournalClubPrompt,
    buildGuidelineQuizPrompt,
    formatStoredTopicKnowledgeForPrompt,
    ...require('./contextBuilders'),
};
