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
  /** Cross-topic synapse: topics that also cite this paper (e.g. Sepsis ↔ AKI). */
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
  /** Parsed query metadata sent to backend to tune evidence bouquet archetypes */
  parsedQuery?: {
    studyTypes?: string[];
    specificity?: SpecificityLevel;
  };
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
  /** Populated when knowledge was refreshed since user's last search — describes the delta. */
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
  lowRecallLearning?: LowRecallLearning | null;
  communityInsight?: CommunityInsight | null;
  proactiveAlert?: ProactiveAlert | null;
  aiEnrichmentKey?: string | null;
  aiEnrichmentStatus?: 'pending' | 'ready' | 'failed';
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
    [key: string]: unknown;
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
      details: { topics?: Array<Record<string, unknown>>; [key: string]: unknown };
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

export interface ParsedQuery {
  original: string;
  processedQuery: string;
  topics: string[];
  yearFilters: string[];
  studyTypes: string[];
  journals: string[];
  meshTerms: string[];
  smartSort: string;
  isAdvanced: boolean;
  specificity: SpecificityLevel;
  phraseTerms: string[];
  excludedTerms: string[];
  requiredTerms: string[];
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
    paperContributions?: Array<{
      studyIndex: number;
      mainContribution: string;
      strengthAdded: string;
      practiceImpactClass?: PracticeImpactClassification;
      practiceImpactNote?: string;
    }>;
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
  /** Per-option wrong-answer rationale (keys A–D). */
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
}

export interface CollectionSummary {
  id: string;
  name: string;
  description?: string;
  articleCount: number;
  createdAt: string;
  ownerId: string;
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

export interface GuidelineAlignment {
  aligned: boolean | null;
  alignmentScore: number;
  guidelinesFound: number;
  guidelineList: Array<{
    uid: string;
    title: string;
    source: string;
    pubdate: string;
    authors: string;
    doi: string;
  }>;
  contradictions: Array<{
    guideline: string;
    recommendation: string;
    synthesisFinding: string;
    severity: 'major' | 'minor' | 'nuanced';
    explanation: string;
  }>;
  supportsGuidelines: Array<{
    guideline: string;
    finding: string;
  }>;
  gaps: string[];
  summary: string;
  checkedAt: string;
}

export interface GrantResult {
  structuredReview: {
    background: string;
    rationale: string;
    currentEvidence: string;
    limitationsOfCurrentEvidence: string[];
  };
  keyReferences: Array<{
    citation: string;
    relevance: string;
    pmid?: string;
    doi?: string;
  }>;
  evidenceGaps: Array<{
    gap: string;
    whyItMatters: string;
    howThisStudyAddressesIt: string;
  }>;
  proposedStudyDesignRationale: string;
  feasibilityNotes: string;
  wordCount: number;
  researchQuestion: string;
  citationStyle: string;
  articleCount: number;
  generatedAt: string;
}

/** Server-backed article annotation (team notes) */
export interface Annotation {
  id: string;
  articleId: string;
  text: string;
  user_name?: string;
  created_at?: string;
  position?: { x: number; y: number; page: number };
}

export interface PicoExtraction {
  population: string;
  intervention: string;
  comparison: string;
  outcomes: string[];
  studyDesign: string;
  sampleSize: number;
  followUp: string;
  confidence: number;
  missingFields: string[];
}

export interface ReviewCriteria {
  inclusion: string[];
  exclusion: string[];
}

export type OwnerType = 'session' | 'user' | 'team';

export interface ReviewProject {
  id: string;
  title: string;
  question: string;
  criteria: ReviewCriteria;
  owner_type?: OwnerType;
  owner_id?: string;
  created_at?: string;
}

export interface ReviewArticle {
  review_id: string;
  article_id: string;
  article_data: Article;
  screening_status: 'pending' | 'included' | 'excluded' | 'maybe';
  exclusion_reason?: string;
  notes?: string;
  created_at?: string;
}

export interface PrismaCounts {
  total: number;
  pending: number;
  included: number;
  excluded: number;
  maybe: number;
}

export type CaseLearningMode = 'student' | 'resident' | 'specialist' | 'exam';

export interface CaseModeResult {
  provider: string;
  model: string;
  /** Literature search string derived from the case (AI-assisted + fallback). */
  query: string;
  queryHints?: Record<string, unknown> | null;
  searchSources?: string[];
  vectorUsed?: boolean;
  caseSummary: string;
  interventions: Array<{
    name: string;
    evidenceStrength: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
    rationale: string;
    citations: number[];
  }>;
  uncertainties: string[];
  disclaimer?: string;
  safetyNotes: string;
  citations: Article[];
  cached?: boolean;
  /** Enhanced case-based learning fields (Phase 5) */
  mode?: CaseLearningMode;
  vignette?: string;
  patientPresentation?: string;
  keyDecisionPoint?: string;
  differentialReasoning?: string;
  evidenceExplanation?: string;
  paperApplications?: Array<{
    studyIndex: number;
    title: string;
    howItApplies: string;
  }>;
  caseMCQs?: QuizQuestion[];
}

export interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Record<string, string>;
  showExplanation: boolean;
  score: number;
  complete: boolean;
}

export interface GuidelineSource {
  id: string;
  name: string;
  fullName: string;
  region: string;
  specialty: string;
  domain: string;
  urlPattern: string;
}

export interface GuidelineEntry {
  id: number;
  topic: string;
  normalizedTopic: string;
  sourceBody: string;
  sourceRegion?: string;
  sourceYear?: number;
  sourceUrl?: string;
  sourceSpecialty?: string;
  sourceDomain?: string;
  recommendationText: string;
  recommendationStrength?: string;
  recommendationCertainty?: string;
  population?: string;
  intervention?: string;
  cautions?: string;
  status: 'ai_extracted' | 'human_reviewed' | 'stale' | 'superseded';
  reviewedBy?: string;
  reviewedAt?: string;
  supersededById?: number;
  lastCheckedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuidelineListResponse {
  guidelines: GuidelineEntry[];
  total: number;
  limit: number;
  offset: number;
}

// ==========================================
// Learning Agent Types
// ==========================================

export interface LearningInsight {
  type: 'weak_type' | 'review_due' | 'strength' | 'milestone' | 'onboarding' | 'coverage_gap' | 'active_run';
  severity: 'high' | 'medium' | 'low';
  icon: string;
  color: string;
  message: string;
  detail: string;
  action: string | null;
  topic: string | null;
  questionType?: string;
  studyRunId?: number;
  gapReport?: StudyRunGapReport;
}

export interface LearningProfile {
  id: number;
  userId: string;
  persona?: string;
  goals: string[];
  weakTopics: string[];
  strongTopics: string[];
  preferredDifficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  dailyGoalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: string;
  /** Drives MCQ vignette depth and question mix (server quiz prompt). */
  trainingStage?: 'preclinical' | 'early_clinical' | 'finals' | 'foundation_doctor';
  /** Default explanation style for quiz review panel. */
  defaultExplanationDepth?: 'foundation' | 'exam_focus' | 'mechanistic';
  specialtyInterest?: string | null;
  studyGoal?: string | null;
  activeCurriculumId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioReflection {
  id: number;
  userId: string;
  reflectionType: 'CBD' | 'mini-CEX' | 'DOPS';
  sourceType: 'quiz' | 'case' | 'manual' | string;
  topic: string;
  normalizedTopic: string;
  whatHappened: string;
  whatILearned: string;
  whatIWillChange: string;
  evidenceUsed: string;
  supervisorDiscussion: string;
  status: 'draft' | 'discussed' | 'exported' | 'submitted' | string;
  linkedCpdSessionId?: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Per-user signals for adaptive quiz / topic promotion (server-computed tier). */
export interface UserTopicMemory {
  userId: string;
  normalizedTopic: string;
  displayTopic?: string | null;
  searchCount: number;
  lastSearchAt?: string | null;
  topArticles: Array<{ uid: string; w?: number; at?: string | null }>;
  savedArticles: Array<{ uid: string; w?: number; at?: string | null }>;
  weakOutlineNodeIds: string[];
  memoryScore: number;
  memoryTier: 'sparse' | 'building' | 'strong';
  topPaperCount: number;
  savedPaperCount: number;
  promotedProposalAt?: string | null;
  updatedAt?: string | null;
}

export interface QuizAttempt {
  id: number;
  userId: string;
  topic: string;
  normalizedTopic: string;
  questionId: string;
  questionType: 'recall' | 'clinical_application' | 'trial_interpretation' | 'guideline' | 'pitfall';
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeMs?: number;
  confidence?: number;
  sourceArticleUid?: string;
  studyRunId?: number;
  outlineNodeId?: string | null;
  claimKey?: string | null;
  promptVariant?: string | null;
  createdAt: string;
}

export interface QuizAttemptSubmission {
  topic: string;
  studyRunId?: number;
  curriculumTopicId?: number;
  attempts: Array<{
    questionId: string;
    questionType: QuizAttempt['questionType'];
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    timeMs?: number;
    confidence?: number;
    sourceArticleUid?: string;
    sourceArticleTitle?: string | null;
    outlineNodeId?: string | null;
    outlineLabel?: string | null;
    claimKey?: string | null;
    promptVariant?: string | null;
  }>;
}

export interface StudyRunOutlineNode {
  id: string;
  kind: 'teaching_point' | 'mcq_angle' | 'source_article';
  label: string;
  sourceIndices: number[];
  articleUid?: string | null;
}

export interface StudyRunOutline {
  id: number | null;
  topic: string | null;
  nodes: StudyRunOutlineNode[];
}

export interface StudyRunGapNode extends StudyRunOutlineNode {
  seen: boolean;
  quizAttempts: number;
  correct: number;
  accuracy: number | null;
  lastAttemptAt: string | null;
}

export interface StudyRunGapReport {
  totalNodes: number;
  coveredNodes: number;
  uncoveredNodes: StudyRunGapNode[];
  weakNodes: StudyRunGapNode[];
}

export interface StudyRun {
  id: number;
  userId: string;
  topic: string;
  normalizedTopic: string;
  outlineId: number | null;
  curriculumTopicId?: number | null;
  status: 'active' | 'completed' | 'paused' | string;
  progress: {
    startedFrom?: string;
    quizAttempts?: number;
    coveredNodes?: number;
    totalNodes?: number;
    quizCompletedAt?: string;
    [key: string]: unknown;
  };
  nodeCoverage: Record<string, { seen: boolean; quizAttempts: number; correct: number; lastAttemptAt: string | null }>;
  startedAt: string;
  lastActiveAt: string;
  completedAt?: string | null;
}

export interface AgentConversation {
  id: number;
  userId: string;
  topic: string;
  normalizedTopic: string;
  title?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: string }>;
  messageCount: number;
  lastMessageAt?: string;
  createdAt: string;
}

export interface UserTopicMastery {
  id: number;
  userId: string;
  topic: string;
  normalizedTopic: string;
  overallScore: number;
  recallScore: number;
  clinicalApplicationScore: number;
  trialInterpretationScore: number;
  guidelineScore: number;
  pitfallScore: number;
  attemptsCount: number;
  correctCount: number;
  lastAttemptAt?: string;
  nextReviewAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpacedRepCardMemory {
  outlineNodeId: string;
  outlineLabel: string | null;
  intervalDays: number;
  easiness: number;
  repetitions: number;
  dueAt: string;
  lastReviewedAt?: string | null;
  daysSinceReview: number | null;
  daysUntilDue: number | null;
}

export interface SpacedRepTopicGroup {
  topic: string;
  normalizedTopic: string;
  cards: SpacedRepCardMemory[];
}

export interface MasteryCohortBenchmark {
  normalizedTopic: string;
  myScore: number;
  peerStage: string;
  peerAvg: number | null;
  peerSampleSize: number;
  foundationDoctorAvg: number | null;
  foundationDoctorSampleSize: number;
  globalAvg: number | null;
  globalSampleSize: number;
  percentileAmongPeers: number | null;
}

export interface CaseAttempt {
  id: number;
  userId: string;
  topic: string;
  normalizedTopic: string;
  caseText: string;
  caseType: 'analysis' | 'teaching_vignette';
  learningMode: string;
  userResponse: { differential?: string; management?: string; keyFindings?: string } | null;
  aiFeedback: { score?: number; strengths?: string[]; gaps?: string[]; suggestions?: string[] } | null;
  score?: number;
  seedArticleUids: string[];
  createdAt: string;
}

export type CpdActivityType = 'quiz' | 'synthesis' | 'case' | 'search' | 'study_run' | 'manual';

export interface CpdSession {
  id: number;
  activityType: CpdActivityType;
  topic: string;
  durationMinutes: number;
  questionCount: number;
  accuracyPct: number | null;
  notes: string;
  source: 'auto' | 'manual';
  createdAt: string;
}

export interface CpdSummary {
  year: number;
  totalMinutes: number;
  totalHours: number;
  byType: Record<string, { sessions: number; minutes: number; questions: number; avgAccuracy: number | null }>;
  monthly: Array<{ month: number; minutes: number; sessions: number }>;
}

export interface CurriculumTopic {
  id: number;
  blockId: number;
  displayName: string;
  suggestedQuery: string;
  sortOrder: number;
  prerequisites?: number[];
}

export interface CurriculumBlock {
  id: number;
  curriculumId: number;
  name: string;
  sortOrder: number;
  topics: CurriculumTopic[];
}

export interface CurriculumDetail {
  id: number;
  slug: string;
  name: string;
  examStageLabel: string | null;
  description: string | null;
  sortOrder: number;
  blocks: CurriculumBlock[];
}

export interface CurriculumExamSummary {
  totalTopics: number;
  topicsStarted: number;
  confident: number;
  pctTopicsTouched: number;
}

export interface CurriculumListItem {
  id: number;
  slug: string;
  name: string;
  examStageLabel: string | null;
  description: string | null;
  sortOrder: number;
  examSummary?: CurriculumExamSummary | null;
}

export interface TopicCurriculumProgress {
  status: string;
  quizAttempts: number;
  correctCount: number;
  lastScorePct: number | null;
  updatedAt: string;
}

export interface LearningRecommendation {
  type: 'review' | 'strengthen' | 'explore' | 'discover' | 'refresh' | 'case' | 'start' | 'calibrate';
  topic: string;
  normalizedTopic: string;
  reason: string;
  action: 'quiz' | 'topic' | 'case';
  priority: number;
  icon: string;
  sourceTopic?: string;
}

export interface LearningDashboard {
  profile: LearningProfile | null;
  stats: {
    currentStreak: number;
    longestStreak: number;
    totalQuizzes: number;
    totalCases: number;
    overallAccuracy: number;
    topicsStudied: number;
  };
  weakTopics: UserTopicMastery[];
  reviewQueue: UserTopicMastery[];
  dueCardCount?: number;
  curriculaOverview?: CurriculumListItem[];
  recentActivity: {
    quizzes: QuizAttempt[];
    conversations: AgentConversation[];
    cases: CaseAttempt[];
  };
  mastery: UserTopicMastery[];
  activeRuns?: StudyRun[];
}

export interface TeachingVignetteResult {
  provider: string;
  model: string;
  topic: string;
  learningMode: CaseLearningMode;
  seedCount: number;
  presentingComplaint: string;
  history: string;
  examination: string;
  investigations: string;
  differential: Array<{
    diagnosis: string;
    supporting: string;
    against: string;
    rank: number;
  }>;
  managementReasoning: string;
  teachingPoints: Array<{
    point: string;
    seedIndices: number[];
  }>;
  evidenceLinks: Array<{
    seedIndex: number;
    howItApplies: string;
  }>;
  uncertaintyFlags: string[];
  caseMCQs: QuizQuestion[];
  postCheckFlags: {
    unsupportedDrugReferences: string[];
    note: string;
  } | null;
  disclaimer: string;
  cached?: boolean;
}
