import { API_BASE, BaseApiClient } from './core';
import type {
  Article,
  SearchFilters,
  AnalysisType,
  AnalysisResult,
  CollectionSummary,
  SavedAlert,
  Annotation,
  SynthesisResult,
  ReviewProject,
  ReviewArticle,
  ReviewCriteria,
  PrismaCounts,
  PicoExtraction,
  CaseModeResult,
  CaseLearningMode,
  ArticleSynopsisResult,
  SearchResponse,
  AgentGuidance,
  TopicKnowledge,
  TopicKnowledgeListResponse,
  TopicKnowledgeProposal,
  TopicKnowledgeProposalListResponse,
  LearningHealthResponse,
  LearningRecommendation,
} from '@types';

export class LearningApi extends BaseApiClient {
  async getLearningProfile(): Promise<{ profile: import('@types').LearningProfile | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/profile`);
    if (response.status === 404) return { profile: null };
    if (!response.ok) throw new Error('Failed to load learning profile');
    return response.json();
  }

  async saveLearningProfile(data: Partial<import('@types').LearningProfile>): Promise<{ profile: import('@types').LearningProfile }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to save learning profile');
    return response.json();
  }

  async getTopicMemory(topic: string): Promise<{ memory: import('@types').UserTopicMemory | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/topic-memory/${encodeURIComponent(topic)}`);
    if (!response.ok) throw new Error('Failed to load topic memory');
    return response.json();
  }

  async listTopicMemory(limit = 20, offset = 0): Promise<{ memories: import('@types').UserTopicMemory[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/topic-memory?limit=${limit}&offset=${offset}`);
    if (!response.ok) throw new Error('Failed to load topic memories');
    return response.json();
  }

  async getTopicProposals(topic: string): Promise<{ proposals: import('@types').TopicKnowledgeProposal[]; total: number }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/topic-proposals/${encodeURIComponent(topic)}`);
    if (!response.ok) throw new Error('Failed to load topic proposals');
    return response.json();
  }

  async submitQuizAttempt(data: import('@types').QuizAttemptSubmission): Promise<{
    saved: number;
    mastery: { overall: number; byType: Record<string, number> };
    remediation?: {
      missedCount: number;
      targets: Array<{
        outlineNodeId: string | null;
        questionType: string;
        sourceArticleUid: string | null;
        sourceArticleTitle: string | null;
        prompt: string;
      }>;
      nextReviewAt: string;
    };
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/quiz-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to submit quiz attempt');
    return response.json();
  }

  async getPromptVariantMetrics(days = 14): Promise<{
    days: number;
    variants: Array<{
      promptVariant: string;
      attempts: number;
      correct: number;
      accuracy: number | null;
      avgConfidence: number | null;
    }>;
  }> {
    const params = new URLSearchParams({ days: String(days) });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/prompt-variant-metrics?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to load prompt variant metrics');
    return response.json();
  }

  async getQuizEvalDataset(params: { limit?: number; topic?: string } = {}): Promise<{
    generatedAt: string;
    topic: string | null;
    count: number;
    byType: Record<string, number>;
    dataset: Array<{
      questionId: string;
      topic: string;
      normalizedTopic: string;
      questionType: string;
      questionText: string;
      groundTruthAnswer: string;
      confidence: number;
      sourceArticleUid: string | null;
      outlineNodeId: string | null;
      claimKey: string | null;
      conceptHash: string | null;
      promptVariant: string | null;
      createdAt: string;
    }>;
  }> {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.topic) query.set('topic', params.topic);
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/quiz-eval-dataset?${query.toString()}`);
    if (!response.ok) throw new Error('Failed to load quiz eval dataset');
    return response.json();
  }

  async createStudyRun(
    topic: string,
    curriculumTopicId?: number
  ): Promise<{ run: import('@types').StudyRun; outline: import('@types').StudyRunOutline; resumed?: boolean }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/study-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, ...(curriculumTopicId != null ? { curriculumTopicId } : {}) }),
    });
    if (!response.ok) throw new Error('Failed to start study run');
    return response.json();
  }

  async listCurricula(): Promise<{ curricula: import('@types').CurriculumListItem[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/curricula`);
    if (!response.ok) throw new Error('Failed to load curricula');
    return response.json();
  }

  async getCurriculum(slug: string): Promise<{
    curriculum: import('@types').CurriculumDetail;
    progress: Record<number, import('@types').TopicCurriculumProgress>;
    examSummary: import('@types').CurriculumExamSummary | null;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/curricula/${encodeURIComponent(slug)}`);
    if (!response.ok) throw new Error('Failed to load curriculum');
    return response.json();
  }

  async getStudyRuns(status = 'active'): Promise<{ runs: import('@types').StudyRun[] }> {
    const params = new URLSearchParams({ status });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/study-runs?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to load study runs');
    return response.json();
  }

  async getStudyRun(id: number): Promise<{ run: import('@types').StudyRun; outline: import('@types').StudyRunOutline }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/study-runs/${id}`);
    if (!response.ok) throw new Error('Failed to load study run');
    return response.json();
  }

  async updateStudyRun(id: number, data: Partial<Pick<import('@types').StudyRun, 'status' | 'progress' | 'nodeCoverage'>>): Promise<{ run: import('@types').StudyRun }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/study-runs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update study run');
    return response.json();
  }

  async getQuizHistory(topic?: string): Promise<{ attempts: import('@types').QuizAttempt[] }> {
    const url = topic ? `${API_BASE}/api/learning/quiz-history/${encodeURIComponent(topic)}` : `${API_BASE}/api/learning/quiz-history`;
    const response = await this.fetchWithSession(url);
    if (!response.ok) throw new Error('Failed to load quiz history');
    return response.json();
  }

  async createAgentSession(topic: string, title?: string): Promise<{ conversation: import('@types').AgentConversation }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/agent/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, title }),
    });
    if (!response.ok) throw new Error('Failed to create agent session');
    return response.json();
  }

  async getAgentSessions(topic?: string): Promise<{ conversations: import('@types').AgentConversation[] }> {
    const params = topic ? `?topic=${encodeURIComponent(topic)}` : '';
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/agent/conversations${params}`);
    if (!response.ok) throw new Error('Failed to load agent sessions');
    return response.json();
  }

  async getAgentSession(id: number): Promise<{ conversation: import('@types').AgentConversation }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/agent/conversations/${id}`);
    if (!response.ok) throw new Error('Failed to load agent session');
    return response.json();
  }

  async appendAgentMessages(id: number, messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: string }>): Promise<{ conversation: import('@types').AgentConversation }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/agent/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (!response.ok) throw new Error('Failed to append agent messages');
    return response.json();
  }

  async deleteAgentSession(id: number): Promise<{ success: boolean }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/agent/conversations/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete agent session');
    return response.json();
  }

  async getTopicMastery(topic?: string): Promise<{ mastery: import('@types').UserTopicMastery | import('@types').UserTopicMastery[] }> {
    const url = topic ? `${API_BASE}/api/learning/mastery/${encodeURIComponent(topic)}` : `${API_BASE}/api/learning/mastery`;
    const response = await this.fetchWithSession(url);
    if (!response.ok) throw new Error('Failed to load topic mastery');
    return response.json();
  }

  async getCompetencyRecord(topic: string): Promise<{
    topic: string;
    overallAccuracy: number | null;
    totalAttempts: number;
    totalCorrect: number;
    sessionCount: number;
    firstQuizDate: string | null;
    lastQuizDate: string | null;
    sessionSummaries: Array<{ date: string; total: number; correct: number; accuracyPct: number }>;
    papersSeen: Array<{ uid: string; missCount: number; hitCount: number }>;
    weakAreas: Array<{ type: string; accuracyPct: number; attempted: number }>;
    evidenceBasis: Array<{ title: string; whySeminal?: string; evidenceStrength?: string }>;
    mastery: import('@types').UserTopicMastery | null;
    topicMemoryTier: string;
    searchCount: number;
    evidenceUpdatedSinceLastQuiz: boolean;
    knowledgeUpdatedAt: string | null;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/competency/${encodeURIComponent(topic)}`);
    if (!response.ok) throw new Error('Failed to load competency record');
    return response.json();
  }

  async postQuizFeedback(payload: { topic: string; outlineNodeId: string; feedbackType: 'confusing' | 'clear' }): Promise<void> {
    await this.fetchWithSession(`${API_BASE}/api/learning/quiz-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getDueReviews(): Promise<{ total: number; groups: Array<{ topic: string; normalizedTopic: string; cards: Array<{ outlineNodeId: string; outlineLabel: string | null; intervalDays: number; repetitions: number; dueAt: string }> }> }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/due-reviews`);
    if (!response.ok) throw new Error('Failed to load due reviews');
    return response.json();
  }

  async getDueReviewCount(): Promise<{ count: number }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/due-reviews/count`);
    if (!response.ok) return { count: 0 };
    return response.json();
  }

  async getSpacedRepTopics(): Promise<{ topics: import('@types').SpacedRepTopicGroup[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/spaced-rep/topics`);
    if (!response.ok) throw new Error('Failed to load spaced repetition topics');
    return response.json();
  }

  async getMasteryCohortBenchmark(topic: string): Promise<{ cohort: import('@types').MasteryCohortBenchmark }> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/learning/mastery/${encodeURIComponent(topic)}/cohort`,
    );
    if (!response.ok) throw new Error('Failed to load cohort benchmark');
    return response.json();
  }

  async getLearningRecommendations(limit = 8): Promise<{ recommendations: LearningRecommendation[]; generatedAt: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/recommendations?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to load recommendations');
    return response.json();
  }

  async getLearningDashboard(): Promise<import('@types').LearningDashboard> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/dashboard`);
    if (!response.ok) throw new Error('Failed to load learning dashboard');
    return response.json();
  }

  async getLearningInsights(): Promise<{ insights: import('@types').LearningInsight[]; profile: import('@types').LearningProfile | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/insights`);
    if (!response.ok) throw new Error('Failed to load insights');
    return response.json();
  }

  async updateLearningProfile(data: Partial<import('@types').LearningProfile>): Promise<{ profile: import('@types').LearningProfile }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  }

  async submitCaseAttempt(data: Omit<import('@types').CaseAttempt, 'id' | 'userId' | 'normalizedTopic' | 'createdAt'>): Promise<{ attempt: import('@types').CaseAttempt }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/case-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to submit case attempt');
    return response.json();
  }

  async getCaseHistory(topic?: string): Promise<{ attempts: import('@types').CaseAttempt[] }> {
    const params = topic ? `?topic=${encodeURIComponent(topic)}` : '';
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/case-history${params}`);
    if (!response.ok) throw new Error('Failed to load case history');
    return response.json();
  }

  async logCpdSession(data: {
    activityType: import('@types').CpdActivityType;
    topic?: string;
    durationMinutes?: number;
    questionCount?: number;
    accuracyPct?: number | null;
    notes?: string;
    source?: 'auto' | 'manual';
  }): Promise<{ id: number }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/cpd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to log CPD session');
    return response.json();
  }

  async getCpdSessions(params: { startDate?: string; endDate?: string; activityType?: string; limit?: number } = {}): Promise<{ sessions: import('@types').CpdSession[] }> {
    const q = new URLSearchParams();
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    if (params.activityType) q.set('activityType', params.activityType);
    if (params.limit) q.set('limit', String(params.limit));
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/cpd?${q.toString()}`);
    if (!response.ok) throw new Error('Failed to load CPD sessions');
    return response.json();
  }

  async getCpdSummary(year?: number): Promise<{ summary: import('@types').CpdSummary }> {
    const q = year ? `?year=${year}` : '';
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/cpd/summary${q}`);
    if (!response.ok) throw new Error('Failed to load CPD summary');
    return response.json();
  }

  async downloadCpdPdf(year: number): Promise<Blob> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/cpd/export-pdf?year=${year}`);
    if (!response.ok) {
      let msg = 'Failed to export CPD PDF';
      try {
        const j = await response.json();
        if (j.error) msg = j.error;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    return response.blob();
  }

  async createPortfolioReflection(data: {
    reflectionType: 'CBD' | 'mini-CEX' | 'DOPS';
    sourceType?: 'quiz' | 'case' | 'manual';
    topic: string;
    whatHappened: string;
    whatILearned: string;
    whatIWillChange: string;
    evidenceUsed: string;
    supervisorDiscussion?: string;
    status?: 'draft' | 'submitted';
    linkedCpdSessionId?: number | null;
  }): Promise<{ reflection: import('@types').PortfolioReflection }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/reflections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to save portfolio reflection');
    return response.json();
  }

  async getPortfolioReflections(params: { topic?: string; status?: string; limit?: number } = {}): Promise<{ reflections: import('@types').PortfolioReflection[] }> {
    const q = new URLSearchParams();
    if (params.topic) q.set('topic', params.topic);
    if (params.status) q.set('status', params.status);
    if (params.limit) q.set('limit', String(params.limit));
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/reflections?${q.toString()}`);
    if (!response.ok) throw new Error('Failed to load portfolio reflections');
    return response.json();
  }

  async draftPortfolioReflection(reflectionType: 'CBD' | 'mini-CEX' | 'DOPS', topic: string): Promise<{
    draft: { whatHappened: string; whatILearned: string; whatIWillChange: string; evidenceUsed: string };
    reflectionType: string;
    topic: string;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/reflections/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reflectionType, topic }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to generate reflection draft');
    return response.json();
  }

  async updatePortfolioReflection(id: number, data: Partial<{
    reflectionType: 'CBD' | 'mini-CEX' | 'DOPS';
    sourceType: 'quiz' | 'case' | 'manual';
    topic: string;
    whatHappened: string;
    whatILearned: string;
    whatIWillChange: string;
    evidenceUsed: string;
    supervisorDiscussion: string;
    status: 'draft' | 'discussed' | 'exported' | 'submitted';
    linkedCpdSessionId: number | null;
  }>): Promise<{ reflection: import('@types').PortfolioReflection }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/reflections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update portfolio reflection');
    return response.json();
  }

  async logLearningEvent(data: {
    eventType: string;
    topic?: string;
    claimKey?: string;
    sourceType?: string;
    sourceId?: string | number;
    payload?: Record<string, unknown>;
  }): Promise<{ ok: boolean }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to log learning event');
    return response.json();
  }
}
