import { API_BASE } from './core';
import type { Article } from '@types';
import { KnowledgeAdminApi } from './knowledgeAdmin';

export class KnowledgeLearningApi extends KnowledgeAdminApi {
  async getClaimMastery(topic: string, limit = 80): Promise<{
    topic: string;
    summary: { total: number; untested: number; weak: number; mastered: number };
    claims: Array<{
      claimKey: string;
      claimText: string;
      evidenceQuote?: string | null;
      sourcePath?: string | null;
      attempts: number;
      correct: number;
      accuracy: number | null;
      /** Bayesian Knowledge Tracing probability of mastery (0-1), null if untested. */
      masteryProbability: number | null;
      masteryState: 'untested' | 'weak' | 'mastered' | string;
    }>;
  }> {
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/claim-mastery/${encodeURIComponent(topic)}?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getEvidenceJudgementProfile(topic = '', limit = 8): Promise<{
    profile: {
      topic: string | null;
      totalTaggedAttempts: number;
      generatedAt: string;
      tags: Array<{
        tag: string;
        count: number;
        wrongCount: number;
        lowConfidenceCorrectCount?: number;
        lastSeenAt: string | null;
        examples: Array<{
          topic: string | null;
          questionType: string | null;
          questionText: string;
          isCorrect: boolean;
          reasoningNote?: string | null;
          createdAt: string | null;
        }>;
      }>;
      topics: Array<{
        topic: string;
        attempts: number;
        correct: number;
        accuracy: number;
        lastAttemptAt?: string | null;
      }>;
    };
  }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (topic) params.set('topic', topic);
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/evidence-judgement-profile?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getPracticeAlerts(topic = '', limit = 20): Promise<{
    count: number;
    alerts: Array<{
      objectKey: string;
      objectType: string;
      articleUid?: string | null;
      topic?: string | null;
      normalizedTopic?: string | null;
      title: string;
      classification: string;
      rationale?: string | null;
      provider?: string | null;
      model?: string | null;
      generatedAt?: string | null;
      updatedAt?: string | null;
    }>;
  }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (topic) params.set('topic', topic);
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/practice-alerts?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getTopicStaleness(topic: string): Promise<{
    hasPrior: boolean;
    significantChange: boolean;
    changes: string[];
    latest?: { evidence_grade: string; key_finding_count: number; generated_at: string };
    prior?:  { evidence_grade: string; key_finding_count: number; generated_at: string };
  }> {
    const params = new URLSearchParams({ topic });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/staleness?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getTopicOverview(topic: string): Promise<{
    topic: string;
    activeRun: import('@types').StudyRun | null;
    practiceAlerts: Array<{
      objectKey: string; title: string; classification: string; topic?: string | null; rationale?: string | null;
    }>;
    latestSnapshot: {
      evidence_grade: string; key_finding_count: number; consensus_text: string; generated_at: string;
    } | null;
  }> {
    const params = new URLSearchParams({ topic });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/topic-overview?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getEvidenceDeltaBrief(topic: string): Promise<{
    brief: {
      topic: string;
      hasPriorReview: boolean;
      lastReviewedAt: string | null;
      claimsChanged: number;
      safetyCautions: number;
      weakenedConclusions: number;
      summary: string | null;
      significantChange: boolean;
      changes: Array<{
        claimKey: string;
        claimText: string | null;
        fromLabel: string | null;
        toLabel: string;
        reason?: string | null;
      }>;
      pendingRegeneration: Array<{ claimKey: string; claimText: string | null; status: string; triggerReason: string }>;
    };
  }> {
    const params = new URLSearchParams({ topic });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/evidence-delta?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getTopicEvidenceMemory(topic: string): Promise<{ memory: import('@types').TopicEvidenceMemory }> {
    const params = new URLSearchParams({ topic });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/topic-evidence-memory?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getClaimLifecycle(topic: string): Promise<{
    topic: string;
    summary: { totalClaims: number; needsAttention: number; pipeline: Array<{ stage: string; label: string; count: number }> };
    claims: Array<{
      claimKey: string;
      lifecycleStage: string;
      lifecycleLabel: string;
      recommendedAction: string;
      trustTier?: string;
      trustLadder?: Array<{ tier: string; label: string; reached: boolean; current: boolean; stale?: boolean }>;
    }>;
    regeneration: Array<{ claimKey: string; status: string; triggerReason: string }>;
  }> {
    const params = new URLSearchParams({ topic });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/claim-lifecycle?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async recordTopicReview(topic: string): Promise<{ review: { lastReviewedAt: string } }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/topic-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getPersonalKnowledgeGraph(topic: string): Promise<{
    graph: {
      nodes: Array<{ id: string; type: string; label: string }>;
      edges: Array<{ from: string; to: string; relation: string }>;
      weakClaims: Array<{ claimKey: string; claimText: string; reasoningHint: string }>;
      agentHooks: Array<{ claimKey: string; prompt: string }>;
    };
  }> {
    const params = new URLSearchParams({ topic });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/knowledge-graph?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getConfidenceCalibration(topic = ''): Promise<{
    profile: {
      buckets: { dangerousMisconception: number; knowledgeGap: number; needsConsolidation: number; wellCalibrated: number };
      recent: Record<string, unknown[]>;
    };
  }> {
    const params = new URLSearchParams(topic ? { topic } : {});
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/confidence-calibration?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async createLearningRound(topic: string): Promise<{ round: { id: number; items: unknown[] }; persisted: boolean }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/learning-rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getLearningRound(roundId: number): Promise<{ round: { id: number; topic: string; items: unknown[] } }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/learning-rounds/${roundId}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getCaseToEvidence(clinicalQuestion: string, topic = '', seedArticles: import('@types').Article[] = []): Promise<{
    topic?: string;
    brief: Record<string, unknown>;
    articles: Article[];
    guidelines: unknown[];
    relatedClaims: unknown[];
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/case-to-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinicalQuestion, topic, seedArticles }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getGuidelineWatchEvents(topic: string): Promise<{ events: Array<{ eventType: string; message: string; severity: string }> }> {
    const params = new URLSearchParams({ topic });
    const response = await this.fetchWithSession(`${API_BASE}/api/learning/guideline-watch?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async updateTeachingClaimCuratorMetadata(
    claimKey: string,
    metadata: {
      examRelevant?: boolean;
      practiceChanging?: boolean;
      overclaimed?: boolean;
      paperSectionRef?: string;
      curatorNotes?: string;
    }
  ): Promise<{ claim: unknown }> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/admin/teaching-claims/${encodeURIComponent(claimKey)}/curator-metadata`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      }
    );
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }}
