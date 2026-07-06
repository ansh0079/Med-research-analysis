import type { Article } from './article';
import type { AgentGuidance, ClinicalAnswer } from './clinical';
import type { TopicIntelligence } from './knowledge';

export type SpecificityLevel = 'experimental' | 'broad' | 'moderate' | 'strict';

export interface SearchFilters {
  sources?: import('./article').DataSource[];
  specificity?: SpecificityLevel;
  useVectorSearch?: boolean;
  yearRange?: [number, number];
  studyTypes?: string[];
  maxResults?: number;
  sortBy?: 'relevance' | 'date' | 'citations';
}

export interface ProactiveAlert {
  summary: string;
  changedPrinciples: string[];
  newPapers: string[];
  daysSinceUpdate: number;
  /** True when this is a landmark-trial greeting for a Strong Memory topic (no new update). */
  isLandmarkGreeting?: boolean;
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
