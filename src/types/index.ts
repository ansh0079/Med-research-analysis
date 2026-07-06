import type { GuidelineEntry } from './learning';

import type { ConflictItem, TrialGuidelineAlignmentSummary } from './review';

export interface Author {
  name: string;
  affiliation?: string;
  orcid?: string;
}

export interface Article {
  uid: string;
  title: string;
  abstract?: string;
  authors?: Author[];
  pubdate?: string;
  year?: number;
  source?: string;
  journal?: string;
  pmcrefcount?: number;
  citationCount?: number;
  doi?: string;
  pmid?: string;
  pmcid?: string;
  volume?: string;
  pages?: string;
  articleids?: Array<{ idtype?: string; value?: string }>;
  pubtype?: string[];
  keywords?: string[];
  isFree?: boolean;
  openAccess?: boolean;
  openAccessUrl?: string;
  fullTextUrl?: string;
  _source: DataSource;
  /** Cross-topic synapse: topics that also cite this paper (e.g. Sepsis â†” AKI). */
  _synapseTopics?: string[];
  /** OpenAlex-derived signals used for ranking (when source is OpenAlex or merged union). */
  _openalexMetrics?: {
    fwci: number | null;
    citationPercentile: number | null;
    isTopCitationPercentile: boolean;
    sourceIsCore: boolean;
    issnL: string | null;
  };
  _impact?: ImpactScore;
  _teachingObjectBoost?: number;
  _semanticScore?: number;
  _quality?: QualityScore;
  _retraction?: RetractionStatus;
  _ebmScore?: number;
  _ebmLabel?: { label: string; short: string };
  _isPreprint?: boolean;
  /** Rank before personalization, based on evidence/relevance signals. */
  _evidenceRank?: number;
  /** Rank after learner personalization has been applied. */
  _learningRank?: number;
  _rankMovedByLearning?: boolean;
  _rankReasons?: string[];
  _ranking?: {
    compositeScore?: number;
    archetype?: string;
    citations?: number;
    year?: number;
  };
  /** Auditable ranking decomposition (search pipeline). */
  _rankingTrace?: import('../contracts').SearchResultRanking;
  _learningBoost?: number;
  _banditArmId?: string | null;
  _decisionId?: number | null;
  _missedQuizCount?: number;
}

export type DataSource = 'pubmed' | 'semantic' | 'crossref' | 'openalex';

export interface ImpactScore {
  score: number;
  level: 'high' | 'medium' | 'low';
  factors: string[];
  citations: number;
  evidenceType: 'rct' | 'meta' | 'other';
  isRecent: boolean;
}

export interface QualityScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  factors: string[];
  signals: string[];
}

export interface RetractionStatus {
  isRetracted: boolean;
  retractionDate?: string;
  reason?: string;
  source: string;
}

export interface CitationRelation {
  source: string;
  target: string;
  direction: 'cites-target' | 'target-cites';
  contexts: string[];
  intents: string[];
  isInfluential: boolean;
}

export type TrustRating = 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';

/** Structured synopsis returned by POST /api/ai/synopsis */
export interface ArticleSynopsisFields {
  takeaway: string | null;
  clinicalQuestion: string | null;
  background?: string | null;
  studyDesign: string | null;
  setting?: string | null;
  population: string | null;
  inclusionCriteria?: string[];
  exclusionCriteria?: string[];
  intervention: string | null;
  comparator: string | null;
  primaryOutcome?: string | null;
  secondaryOutcomes?: string[];
  safetyOutcomes?: string[];
  outcomes: string | null;
  mainFindings: string | null;
  authorsConclusion?: string | null;
  strengths?: string[];
  weaknesses?: string[];
  clinicalMeaning: string | null;
  limitations: string | null;
  bottomLine: string | null;
  practiceImplication?: string | null;
  whatNotToOverclaim?: string[];
  quizFocusPoints?: string[];
  trustRating: TrustRating;
  trustRationale: string | null;
}

export interface ArticleSynopsisResult {
  synopsis?: ArticleSynopsisFields;
  articleId?: string;
  provider?: string;
  model?: string;
  timestamp?: string;
  disclaimer?: string;
  cached?: boolean;
  /** Durable job / queued response */
  status?: 'queued' | 'running' | 'completed' | 'failed';
  jobKey?: string | null;
  errorMessage?: string | null;
  audit?: Record<string, unknown>;
  evidenceDelta?: {
    significantChange: boolean;
    summary: string | null;
    claimsChanged: number;
    safetyCautions: number;
    weakenedConclusions: number;
    pendingRegeneration?: Array<{ claimKey?: string; claimText?: string | null; status?: string; triggerReason?: string }>;
  };
}

export type SpecificityLevel = 'experimental' | 'broad' | 'moderate' | 'strict';

export interface SearchFilters {
  sources?: DataSource[];
  specificity?: SpecificityLevel;
  useVectorSearch?: boolean;
  yearRange?: [number, number];
  studyTypes?: string[];
  maxResults?: number;
  sortBy?: 'relevance' | 'date' | 'citations';
}

export type EvidenceGrade =
  | 'GUIDELINE_BACKED'
  | 'RCT_SUPPORTED'
  | 'OBSERVATIONAL_ONLY'
  | 'CONFLICTING'
  | 'LOW_CERTAINTY'
  | 'PRACTICE_CHANGING_RECENT'
  | 'EXPERT_OPINION';

export interface ClinicalAnswer {
  bottomLine: string;
  whatChangesManagement: string;
  whoItAppliesTo: string;
  whatIsUncertain: string;
  keyContraindications?: string | null;
  guidelinePosition?: string | null;
  recentPracticeChanging?: string | null;
  evidenceGrade?: EvidenceGrade;
  /** Populated when knowledge was refreshed since user's last search â€” describes the delta. */
  whatIsNew?: string | null;
  /** Proactive alert prepended when new landmark evidence arrived since last visit. */
  _proactiveAlert?: string;
}

export interface ProactiveAlert {
  summary: string;
  changedPrinciples: string[];
  newPapers: string[];
  daysSinceUpdate: number;
  /** True when this is a landmark-trial greeting for a Strong Memory topic (no new update). */
  isLandmarkGreeting?: boolean;
}

export interface Contradiction {
  claim: string;
  counter: string;
  sourceIndices: number[];
  clinicalImplication: string;
}

export interface AgentGuidance {
  topic: string;
  status: string;
  confidence: number;
  lastRefreshedAt?: string;
  mentorMessage: string;
  clinicalAnswer?: ClinicalAnswer;
  contradictions?: Contradiction[];
  seminalPapers: Array<{
    sourceIndex: number;
    title: string;
    whySeminal?: string;
    clinicalPrinciple?: string;
    evidenceStrength?: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
  }>;
  teachingPoints: Array<{
    claim: string;
    sourceIndices: number[];
    confidence?: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
  }>;
  /** Clinician-verified teaching anchors preserved across AI refresh. */
  verifiedAnchors?: Array<{
    id: string;
    text: string;
    verifiedAt?: string;
    verifiedBy?: string | null;
    articleUid?: string | null;
  }>;
  caseGenerationHooks?: string[];
  mcqAngles?: string[];
  sourceArticles?: Array<{
    sourceIndex: number;
    uid?: string;
    title: string;
    doi?: string | null;
    pmid?: string | null;
    pmcid?: string | null;
    isFree?: boolean;
    fullTextUrl?: string | null;
    openAccess?: boolean;
    openAccessUrl?: string | null;
    source?: string | null;
    pubdate?: string | null;
  }>;
}

export interface CommunityInsight {
  articleCount: number;
  articles: Array<{ uid: string; title: string | null }>;
  pivotTopics: string[];
}

/** Server-stored proactive alerts (e.g. knowledge drift for strong topic memory). */
export interface ProactiveEvidenceAlert {
  id: number;
  userId?: string;
  normalizedTopic: string;
  displayTopic?: string | null;
  alertKind?: string;
  title: string;
  summary?: string | null;
  payload?: Record<string, unknown> | null;
  landmarkArticleUid?: string | null;
  readAt?: string | null;
  createdAt?: string;
}

export interface SynapseGraphPayload {
  centerTopic: string;
  normalizedCenter: string;
  topicKnowledgeFound: boolean;
  nodes: Array<{ id: string; label: string; kind: string }>;
  edges: Array<{ articleUid?: string; from: string; to: string }>;
}

export interface SearchResponse {
  articles: Article[];
  count: number;
  sources: string[];
  vectorFusion?: {
    used: boolean;
    available: boolean;
    count: number;
  };
  agentGuidance?: AgentGuidance | null;
  knowledgeAvailable?: boolean;
  topicIntelligence?: TopicIntelligence | null;
  clinicalAnswer?: ClinicalAnswer | null;
  searchId?: number;
  learningContext?: SearchLearningContext;
  learnerContext?: LearnerContextSummary | null;
  lowRecallLearning?: LowRecallLearning | null;
  communityInsight?: CommunityInsight | null;
  proactiveAlert?: ProactiveAlert | null;
  aiEnrichmentKey?: string | null;
  aiEnrichmentStatus?: 'pending' | 'ready' | 'failed';
  intelligenceStatus?: 'sync' | 'deferred';
  queryIntent?: string;
  searchTelemetry?: {
    timings?: Record<string, number>;
    sources?: Record<string, { ms?: number; cached?: boolean; shared?: boolean }>;
    reformulation?: { cached?: boolean; failed?: boolean; ms?: number } | null;
    meshLookupMs?: number | null;
  };
  ranking?: Array<{
    uid?: string;
    compositeScore?: number;
    archetype?: string;
    citations?: number;
    year?: number;
    reasons?: string[];
  }>;
  rankingAttribution?: Array<{
    articleUid: string;
    decisionId?: number | null;
    banditArmId?: string | null;
  }>;
}

export interface SearchLearningContext {
  memoryTier: 'none' | 'sparse' | 'building' | 'strong' | string;
  searchCount: number;
  topPaperCount: number;
  savedPaperCount: number;
  weakOutlineNodeCount: number;
  helpfulFeedbackCount?: number;
  notHelpfulFeedbackCount?: number;
  interactionCount?: number;
  impressionCount?: number;
  personalized: boolean;
}

export interface LearnerContextSummary {
  hasPersonalization: boolean;
  memoryTier: string;
  searchCount: number;
  weakTopicCount: number;
  profileWeakTopicCount: number;
  claimMasteryCount: number;
  weakClaimCount: number;
  hasTrajectory: boolean;
  hasConversationMemory: boolean;
}

export interface LowRecallLearning {
  query: string;
  resultCount: number;
  aliases: string[];
  aliasCount: number;
}

export interface TopicIntelligence {
  topic: string;
  evidenceBouquet: {
    topPapers: Article[];
    count: number;
    rankingSignals: string[];
    ranking: Array<{
      uid: string;
      compositeScore: number;
      archetype: string;
      citations: number;
      year: number;
      reasons: string[];
    }>;
    archetypesCovered: string[];
  };
  guidelineSnapshot: {
    guidelines: GuidelineEntry[];
    count: number;
    hasReviewedGuidelines: boolean;
  };
  evidenceMap?: {
    generatedAt: string;
    freshness?: {
      effectiveConfidence?: number;
      confidenceDecay?: number;
      volatility?: string;
      priorityScore?: number;
      reason?: string;
    };
    nodes?: {
      landmarkPapers?: unknown[];
      teachingPoints?: unknown[];
      liveEvidence?: Array<{ uid: string; title: string; year?: number | null; source?: string | null; isFree?: boolean }>;
      teachingObjects?: Array<{ objectKey: string; objectType: string; articleUid?: string | null; title?: string | null; confidence?: number; claimCount?: number }>;
      groundedClaims?: Array<{
        claimKey: string;
        claimText: string;
        evidenceQuote?: string | null;
        sourcePath?: string | null;
        confidence?: number | null;
        verificationStatus?: string | null;
        verificationReason?: string | null;
        verifiedAt?: string | null;
      }>;
      relatedTopics?: Array<{ normalizedTopic: string; displayTopic: string; sharedArticles?: number }>;
      clusterArticles?: Array<{ uid: string; topicCount?: number; totalSignalCount?: number }>;
    };
    alerts?: { stale?: boolean; reason?: string; message?: string | null };
  };
  consensusSynopsis?: {
    status: 'generated' | 'insufficient_free_evidence' | 'provider_unavailable' | 'generation_failed' | string;
    jobKey?: string;
    cached?: boolean;
    topic: string;
    evidenceScope: 'free_open_access_only' | string;
    generatedAt: string;
    provider?: string;
    freePaperCount: number;
    includedArticles: Array<{
      sourceIndex: number;
      uid?: string;
      title: string;
      pmid?: string | null;
      pmcid?: string | null;
      doi?: string | null;
      journal?: string | null;
      pubdate?: string | null;
      freeFullTextUrl?: string | null;
      fullTextIndexed?: boolean;
      fullTextWordCount?: number | null;
      fullTextSections?: string[];
    }>;
    statement: string;
    clinicalBottomLine: string;
    areasOfAgreement: string[];
    areasOfUncertainty: string[];
    conflictingSignals: string[];
    evidenceStrength: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW' | string;
    strengthRationale: string;
    guidelineAlignment?: {
      status: 'aligned' | 'conflicting' | 'not_addressed' | 'guideline_stale' | 'no_guideline_supplied' | string;
      summary: string;
      guidelineRefs: number[];
    };
    whatNotToOverclaim: string[];
    quizFocusPoints: string[];
    citationValidation?: {
      ok: boolean;
      issueCount: number;
      issues: Array<{ path: string; value?: string; errors: string[] }>;
    };
    disclaimer: string;
  };
  agentGuidance?: AgentGuidance | null;
  actions: {
    canSynthesizeTop5: boolean;
    canGenerateConsensusSynopsis?: boolean;
    canGenerateMcqs: boolean;
    canGenerateCase: boolean;
    canExportBrief: boolean;
    canSaveTopic: boolean;
  };
}

export type TopicGuideStatus = 'idle' | 'none' | 'building' | 'ready' | 'pending';

export interface TopicKnowledge {
  id: number;
  topic: string;
  normalizedTopic: string;
  canonicalNormalized?: string;
  knowledge: {
    mentorMessage?: string;
    seminalPapers?: AgentGuidance['seminalPapers'];
    teachingPoints?: AgentGuidance['teachingPoints'];
    coreTeachingPoints?: AgentGuidance['teachingPoints'];
    caseGenerationHooks?: string[];
    mcqAngles?: string[];
    controversies?: unknown[];
    keywords?: string[];
    reviewedBy?: string | null;
    reviewedAt?: string;
    editedBy?: string | null;
    editedAt?: string;
  };
  sourceArticles: NonNullable<AgentGuidance['sourceArticles']>;
  status: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  lastRefreshedAt: string;
}

export interface TopicKnowledgeListResponse {
  topics: TopicKnowledge[];
  total: number;
  limit: number;
  offset: number;
}

export interface TopicKnowledgeProposal {
  id: number;
  topic: string;
  normalizedTopic: string;
  knowledge: TopicKnowledge['knowledge'];
  sourceArticles: TopicKnowledge['sourceArticles'];
  proposedStatus: string;
  confidence: number;
  reason?: string;
  createdBy?: string;
  status: 'pending_review' | 'approved' | 'rejected' | string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopicKnowledgeProposalListResponse {
  proposals: TopicKnowledgeProposal[];
  total: number;
  limit: number;
  offset: number;
}

export interface LearningHealthResponse {
  health: {
    generatedAt: string;
    topBouquetTopics: Array<{
      normalizedTopic: string;
      displayTopic: string;
      totalSignals: number;
      distinctArticles: number;
      lastSeenAt: string | null;
    }>;
    lowRecall: {
      days: number;
      items: Array<{
        normalizedTopic: string;
        displayQuery: string;
        resultCount: number;
        expandedAliases: string[];
        attemptCount: number;
        lastSeenAt: string;
      }>;
    };
    aliasSeededTopics: Array<{
      topic: string;
      normalizedTopic: string;
      confidence: number;
      aliasesNormalized: string[];
      updatedAt: string;
    }>;
    vectorUsage: {
      windowDays: number;
      used: number;
      notUsed: number;
      total: number;
      usageRate: number;
    };
    refreshCandidates: Array<{
      normalizedTopic: string;
      displayTopic: string;
      totalSignals: number;
      distinctArticles: number;
      lastRefreshedAt: string | null;
      status: string | null;
      confidence: number;
      effectiveConfidence: number;
      confidenceDecay: number;
      volatility: string;
      priorityScore: number;
      priorityReason: string;
    }>;
    schedulerRuns: Array<{
      id: number;
      runType: string;
      status: string;
      startedAt: string;
      finishedAt: string | null;
      candidatesCount: number;
      refreshedCount: number;
      skippedCount: number;
      errorCount: number;
      details: { topics?: Array<Record<string, unknown>> };
      error: string | null;
    }>;
    teachingObjects?: {
      total: number;
      byType: Array<{ objectType: string; count: number }>;
      recent: Array<{ objectKey: string; objectType: string; topic?: string | null; title?: string | null; updatedAt?: string | null }>;
      topTopics: Array<{ normalizedTopic: string; topic: string; count: number; lastUpdatedAt?: string | null }>;
    } | null;
    freshness?: {
      staleTopics: Array<{
        normalizedTopic: string;
        displayTopic: string;
        confidenceDecay: number;
        volatility: string;
        priorityScore: number;
      }>;
      strongMemoryRefresh: Array<{
        normalizedTopic: string;
        displayTopic: string;
        communityEngagementScore: number;
        memoryTier: string;
      }>;
    };
  };
}

export interface TopicEvidenceMemory {
  topic: string;
  strongEvidenceMemory: boolean;
  totalClaims: number;
  trustedClaimCount?: number;
  untestedClaimCount: number;
  guidelineConflictCount: number;
  refreshedAt?: string | null;
  daysSinceRefresh: number | null;
  lifecycleNeedsAttention?: number;
  messages: Array<{ key: string; text: string; tone: 'positive' | 'neutral' | 'warning' }>;
}

export interface TeachingClaimReviewItem {
  id?: number | string;
  objectKey?: string | null;
  claimKey: string;
  claimText: string;
  evidenceQuote?: string | null;
  sourcePath?: string | null;
  articleUid?: string | null;
  normalizedTopic?: string | null;
  conceptKey?: string | null;
  confidence?: number | null;
  verificationStatus: string;
  verificationReason?: string | null;
  verifiedAt?: string | null;
  objectType?: string | null;
  topic?: string | null;
  objectTitle?: string | null;
  quizAttempts?: number;
  quizCorrect?: number;
  curatorMetadata?: {
    examRelevant?: boolean;
    practiceChanging?: boolean;
    overclaimed?: boolean;
    paperSectionRef?: string | null;
    curatorNotes?: string | null;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type AnalysisType = 'quick' | 'comprehensive' | 'critical' | 'biomedical' | 'layperson' | 'methodology';

export interface AnalysisResult {
  result?: string;
  summary?: string;
  keyPoints?: string[];
  confidenceScore?: number;
  studyType?: string;
  evidenceLevel?: string;
  clinicalImplications?: string;
  provider?: string;
  model?: string;
  cached?: boolean;
  timestamp?: string;
  disclaimer?: string;
  _provider?: string;
  _cost?: string;
  _timestamp?: string;
}

export type QuestionType = 'recall' | 'clinical_application' | 'trial_interpretation' | 'guideline' | 'pitfall';

export type PracticeImpactClassification =
  | 'confirms_existing_practice'
  | 'weakly_modifies_practice'
  | 'practice_changing'
  | 'hypothesis_generating_only'
  | 'not_clinically_actionable_yet';

export interface SynthesisResult {
  synthesis: {
    overallAnswer?: string;
    consensus: string;
    agreement?: string[];
    evidenceGrade: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
    gradeRationale: string;
    keyFindings: Array<{
      finding: string;
      studyIndices: number[];
      strength: 'strong' | 'moderate' | 'weak';
    }>;
    conflicts: Array<{
      description: string;
      studiesFor: number[];
      studiesAgainst: number[];
    }>;
    statistics: Array<{
      metric: string;
      value: string;
      context: string;
      studyIndex: number;
    }>;
    studyDesigns: {
      metaAnalysis?: number;
      rct?: number;
      cohort?: number;
      caseControl?: number;
      crossSectional?: number;
      caseReport?: number;
      other?: number;
    };
    clinicalActionCard?: {
      recommendation: string;
      certainty: string;
      caveat: string;
    };
    clinicalBottomLine: string;
    clinicalImplications?: string;
    limitations: string;
    researchGaps: string;
    uncertainties?: string[];
    practiceImpact?: {
      classification: PracticeImpactClassification;
      mondayMorningLine: string;
      rationale: string;
    };
    evidenceDisagreement?: {
      hasMaterialDisagreement: boolean;
      guidelineRecommendation: string;
      strongestSupportingTrial: { studyIndex: number; summary: string };
      strongestContradictingTrial: { studyIndex: number | null; summary: string };
      populationsWhereFails: string;
      whatWouldChangePractice: string;
    };
    safetySignals?: Array<{
      signal: string;
      severity: 'serious' | 'moderate' | 'mild';
      studyIndices: number[];
      context: string;
    }>;
    paperContributions?: Array<{
      studyIndex: number;
      mainContribution: string;
      strengthAdded: string;
      practiceImpactClass?: PracticeImpactClassification;
      practiceImpactNote?: string;
    }>;
    followUpQuestions?: FollowUpQuestion[];
  };
  articleCount: number;
  topic: string;
  timestamp: string;
  cached?: boolean;
  sources?: Array<{
    studyIndex: number;
    uid: string;
    title: string;
    doi?: string | null;
    pmid?: string | null;
    source?: string | null;
    pubdate?: string | null;
  }>;
  retractionWarning?: string | null;
  disclaimer?: string;
  citationValidation?: {
    ok: boolean;
    issueCount: number;
    issues: Array<{ path: string; value?: string; errors: string[] }>;
  };
  audit?: {
    provider: string;
    model: string;
    promptVersion: string;
    prompt?: string;
    promptHash?: string;
    citationValidation?: {
      ok: boolean;
      issueCount: number;
      issues: Array<{ path: string; value?: string; errors: string[] }>;
    };
    retrievedContext: Array<{
      studyIndex: number;
      uid: string;
      title: string;
      doi?: string | null;
      pmid?: string | null;
      source?: string | null;
      pubdate?: string | null;
    }>;
    humanReviewStatus?: string;
    generatedAt?: string;
    fullTextCoverageRatio?: number;
    fullTextIndexedCount?: number;
    sourceCount?: number;
    retractedInBundleCount?: number;
    retractionCheckedCount?: number;
  };
  jobKey?: string;
  status?: 'queued' | 'running' | 'completed' | 'failed';
  errorMessage?: string | null;
  conflictMatrix?: ConflictItem[];
  guidelineAlignment?: TrialGuidelineAlignmentSummary | null;
}

export interface FollowUpQuestion {
  question: string;
  rationale: string;
  trigger: 'conflict' | 'uncertainty' | 'gap' | 'subgroup';
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface ChartDataPoint {
  year?: number;
  count: number;
  label?: string;
}

export interface JournalDistribution {
  journal: string;
  count: number;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false';
  questionType?: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  explanationDeep?: string | null;
  whyOthersWrong?: string;
  /** Per-option wrong-answer rationale (keys Aâ€“D). */
  distractorRationale?: Record<string, string> | null;
  visualExplanation?: {
    kind: 'flowchart' | 'comparison_table' | 'mechanism';
    title: string;
    steps?: string[];
    columns?: string[];
    rows?: string[][];
  } | null;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceArticle?: string;
  sourceArticleUid?: string;
  sourceReference?: string;
  sourceIndices?: number[];
  outlineNodeId?: string | null;
  /** Anchors quiz to a row from ai_generation_claims (provenance mode). */
  claimKey?: string | null;
  outlineLabel?: string | null;
  promptVariant?: string | null;
  validationStatus?: 'llm_validated' | 'validation_skipped' | string;
  topic?: string;
}

export interface SavedAlert {
  id: number;
  session_id: string;
  query: string;
  sources: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  is_active: number;
  created_at: string;
  author_filter?: string | null;
  journal_filter?: string | null;
}

export interface ArticleComparison {
  overallVerdict: string;
  studyDesign: { A: string; B: string; winner: 'A' | 'B' | 'tie'; rationale: string };
  population: { A: string; B: string; comparability: 'comparable' | 'partially_comparable' | 'incomparable'; note: string };
  intervention: { A: string; B: string; equivalence: 'same' | 'similar' | 'different' };
  primaryOutcome: { A: string; B: string; outcomeCompatibility: 'same' | 'related' | 'different'; note: string };
  riskOfBias: { A: 'HIGH' | 'MODERATE' | 'LOW'; B: 'HIGH' | 'MODERATE' | 'LOW'; A_concerns: string[]; B_concerns: string[] };
  sampleSize: { A: string; B: string; powerNote: string };
  keyConflicts: string[];
  keyAgreements: string[];
  clinicalBottomLine: string;
  whichToTrust: { recommendation: 'A' | 'B' | 'both_equally' | 'neither'; rationale: string };
}

export interface CollectionSummary {
  id: string;
  name: string;
  description?: string;
  articleCount: number;
  createdAt: string;
  ownerId: string;
}

export interface CollectionCollaborator {
  userId: string;
  name: string | null;
  email: string | null;
  permission: 'read' | 'write' | 'admin';
  addedAt: string;
  addedBy: string | null;
}

export interface CollectionArticleEntry {
  articleId: string;
  article: Partial<Article>;
  addedBy: string;
  addedAt: string;
  notes: string | null;
  tags: string[];
}

/** Full collection detail â€” matches enrichCollection() in server/routes/collaboration.js */
export interface CollectionDetail {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  ownerName: string | null;
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  articleCount: number;
  articles: CollectionArticleEntry[];
  collaborators: CollectionCollaborator[];
}

export interface CommentReaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface CollabComment {
  id: string;
  articleId: string;
  collectionId: string | null;
  annotationId: string | null;
  userId: string;
  userName: string | null;
  content: string;
  parentId: string | null;
  isResolved: boolean;
  replyCount: number;
  reactions: CommentReaction[];
  createdAt: string;
  updatedAt: string;
  replies: CollabComment[];
}

export interface CollabActivity {
  id: string;
  type: string;
  userId: string | null;
  userName: string | null;
  collectionId: string | null;
  articleId: string | null;
  commentId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Note: snake_case deliberately â€” the backend returns raw DB rows for invitations,
 * not the enriched camelCase shape used elsewhere in this feature. */
export interface CollabInvitation {
  id: string;
  collection_id: string;
  collection_name: string | null;
  invited_by: string;
  invited_by_name: string | null;
  invitee_email: string;
  permission: 'read' | 'write' | 'admin';
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface CollabNotification {
  id: string;
  userId: string;
  type: string;
  title: string | null;
  body: string | null;
  isRead: boolean;
  relatedCollectionId: string | null;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: 'free' | 'pro' | 'enterprise';
  memberLimit: number;
  memberCount: number;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface TeamCollection {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  articleCount: number;
  createdAt: string;
  createdBy: string;
}

export * from './learning';
export * from './review';
