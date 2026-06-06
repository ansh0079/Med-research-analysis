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
  TeachingVignetteResult,
  SearchResponse,
  AgentGuidance,
  TopicKnowledge,
  TopicKnowledgeListResponse,
  TopicKnowledgeProposal,
  TopicKnowledgeProposalListResponse,
  LearningHealthResponse,
  LearningRecommendation,
} from '@types';

export class AiApi extends BaseApiClient {
  async generateQuizFromEvidence(
    topic: string,
    articles: Article[],
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed',
    count = 3
  ): Promise<{ questions: import('@types').QuizQuestion[]; topic: string; provider: string; disclaimer: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/quiz/from-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, articles, difficulty, count }),
    });
    if (!response.ok) throw new Error('Failed to generate quiz from evidence');
    return response.json();
  }

  async analyzeWithAI(
    text: string,
    options: { type?: AnalysisType; provider?: string; model?: string } = {}
  ): Promise<AnalysisResult> {
    return this.withRetry(() => this._analyzeWithAI(text, options));
  }

  protected async _analyzeWithAI(
    text: string,
    options: { type?: AnalysisType; provider?: string; model?: string } = {}
  ): Promise<AnalysisResult> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        analysisType: options.type || 'comprehensive',
        provider: options.provider,
        model: options.model,
      }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  analyzeWithAIStream(
    text: string,
    options: { type?: AnalysisType; provider?: string; model?: string } = {},
    callbacks: {
      onChunk?: (chunk: string) => void;
      onResult?: (result: AnalysisResult) => void;
      onError?: (error: Error) => void;
      onDone?: () => void;
    } = {}
  ): () => void {
    const abortController = new AbortController();
    const { onChunk, onResult, onError, onDone } = callbacks;

    const run = async () => {
      try {
        const response = await this.fetchWithSession(`${API_BASE}/api/ai/analyze/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            analysisType: options.type || 'comprehensive',
            provider: options.provider,
            model: options.model,
          }),
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          await this.parseErrorResponse(response);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        let streamOpen = true;
        while (streamOpen) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const block of lines) {
            const eventMatch = block.match(/^event: (\w+)$/m);
            const dataMatch = block.match(/^data: (.+)$/m);
            if (!eventMatch || !dataMatch) continue;
            const event = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);

            if (event === 'chunk' && onChunk) onChunk(data.text);
            if (event === 'result' && onResult) onResult(data as AnalysisResult);
            if (event === 'error') throw new Error(data.message || 'Stream error');
            if (event === 'done') {
              streamOpen = false;
              break;
            }
          }
        }
        onDone?.();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          onError?.(err as Error);
        }
      }
    };

    run();
    return () => abortController.abort();
  }

  async getSynopsis(
    article: Article,
    options?: { async?: boolean; pollIntervalMs?: number; maxAttempts?: number; topic?: string }
  ): Promise<ArticleSynopsisResult> {
    const useAsync = options?.async ?? false;
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/synopsis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article, async: useAsync, topic: options?.topic }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    const initial = (await response.json()) as ArticleSynopsisResult;
    if (!useAsync || response.status === 200) return initial;
    const jobKey = initial.jobKey;
    if (!jobKey) return initial;
    const interval = options?.pollIntervalMs ?? 1200;
    const maxAttempts = options?.maxAttempts ?? 90;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval));
      const { job } = await this.getAiGenerationJob(jobKey);
      if (job.status === 'failed') {
        throw new Error(job.errorMessage || 'Synopsis job failed');
      }
      if (job.status === 'completed' && job.result && typeof job.result === 'object') {
        return { ...(job.result as ArticleSynopsisResult), jobKey, status: 'completed' };
      }
    }
    throw new Error('Synopsis generation timed out');
  }

  async synthesizeEvidence(
    topic: string,
    articles: Article[],
    opts?: { async?: boolean }
  ): Promise<SynthesisResult> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, articles, async: opts?.async !== false }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    const data = await response.json() as SynthesisResult;
    if (data.jobKey && (data.status === 'queued' || data.status === 'running')) {
      const { registerPendingSynthesisJob } = await import('@utils/pendingSynthesisJobs');
      registerPendingSynthesisJob({ jobKey: data.jobKey, topic: data.topic || topic, status: data.status });
    }
    return data;
  }

  synthesizeEvidenceStream(
    topic: string,
    articles: Article[],
    callbacks: {
      onChunk?: (chunk: string) => void;
      onResult?: (result: SynthesisResult) => void;
      onError?: (error: Error) => void;
      onDone?: () => void;
    } = {}
  ): () => void {
    const abortController = new AbortController();
    const { onChunk, onResult, onError, onDone } = callbacks;

    const run = async () => {
      try {
        const response = await this.fetchWithSession(`${API_BASE}/api/ai/synthesize/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, articles }),
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          await this.parseErrorResponse(response);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        let streamOpen = true;
        while (streamOpen) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const block of lines) {
            const eventMatch = block.match(/^event: (\w+)$/m);
            const dataMatch = block.match(/^data: (.+)$/m);
            if (!eventMatch || !dataMatch) continue;
            const event = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);

            if (event === 'chunk' && onChunk) onChunk(data.text);
            if (event === 'result' && onResult) onResult(data as SynthesisResult);
            if (event === 'error') throw new Error(data.message || 'Stream error');
            if (event === 'done') {
              streamOpen = false;
              break;
            }
          }
        }
        onDone?.();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          onError?.(err as Error);
        }
      }
    };

    run();
    return () => abortController.abort();
  }

  async analyzeCase(
    caseText: string,
    provider: 'auto' | 'gemini' | 'mistral' = 'auto',
    options: {
      topic?: string;
      learningMode?: CaseModeResult['mode'];
      /** Same ranked set as topic workspace / synthesis (optional). */
      seedArticles?: Partial<Article>[];
    } = {}
  ): Promise<CaseModeResult> {
    const response = await this.fetchWithSession(`${API_BASE}/api/cases/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseText, provider, ...options }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async agentChatStream(
    topic: string,
    message: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    currentArticles: Partial<Article>[] = [],
    previousQueries: string[] = [],
    callbacks: {
      onChunk: (text: string) => void;
      onDone: (topic: string, conversationId?: number | null) => void;
      onError: (msg: string) => void;
    },
    sessionFeedback?: {
      topic: string;
      score: number;
      totalQuestions: number;
      weakAreas?: string[];
      lastExplanationTopic?: string;
    } | null,
    conversationId?: number | null,
  ): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        message,
        conversationHistory,
        currentArticles,
        previousQueries,
        sessionFeedback: sessionFeedback ?? undefined,
        conversationId: conversationId ?? undefined,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Agent request failed' }));
      callbacks.onError((err as { error?: string }).error ?? 'Agent request failed');
      return;
    }
    const reader = response.body?.getReader();
    if (!reader) { callbacks.onError('No response body'); return; }
    const decoder = new TextDecoder();
    let buf = '';
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        let event = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) { event = line.slice(7).trim(); continue; }
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (event === 'chunk' && typeof data.text === 'string') callbacks.onChunk(data.text);
            else if (event === 'done') {
              callbacks.onDone(
                data.topic ?? topic,
                data.conversationId != null ? Number(data.conversationId) : conversationId ?? null
              );
            }
            else if (event === 'error') callbacks.onError(data.message ?? 'Unknown error');
          } catch { /* malformed SSE line */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async recordAgentFeedback(payload: {
    topic: string;
    feedbackType: 'helpful' | 'not_helpful' | 'too_basic' | 'too_complex' | 'missed_question';
    conversationId?: number | null;
    messageIndex?: number | null;
    reason?: string | null;
  }): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/agent/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Failed to record agent feedback' }));
      throw new Error((err as { error?: string }).error ?? 'Failed to record agent feedback');
    }
  }

  async generateTeachingVignette(
    topic: string,
    seedArticles: Partial<Article>[],
    learningMode: CaseLearningMode = 'resident',
    provider: 'auto' | 'gemini' | 'mistral' = 'auto'
  ): Promise<TeachingVignetteResult> {
    const response = await this.fetchWithSession(`${API_BASE}/api/cases/teaching-vignette`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, seedArticles, learningMode, provider }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getAIProviders(): Promise<{ providers: Array<{ id: string; name: string; models: Array<{ id: string; name: string }> }> }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/providers`);
    if (!response.ok) return { providers: [] };
    return response.json();
  }

  async listAiGenerationJobs(options: {
    status?: string;
    jobType?: string;
    limit?: number;
  } = {}): Promise<{
    jobs: Array<{
      jobKey: string;
      jobType: string;
      status: string;
      topic?: string | null;
      errorMessage?: string | null;
      attempts: number;
      createdAt: string;
      updatedAt: string;
      startedAt?: string | null;
      completedAt?: string | null;
    }>;
  }> {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.jobType) params.set('jobType', options.jobType);
    if (options.limit) params.set('limit', String(options.limit));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/jobs${suffix}`);
    if (!response.ok) throw new Error('Failed to load AI generation jobs');
    return response.json();
  }

  async getAiGenerationJob(jobKey: string): Promise<{
    job: {
      jobKey: string;
      jobType: string;
      status: string;
      topic?: string | null;
      result?: unknown;
      errorMessage?: string | null;
      provider?: string | null;
      model?: string | null;
      audit?: unknown;
      attempts: number;
      createdAt: string;
      updatedAt: string;
      startedAt?: string | null;
      completedAt?: string | null;
    };
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/jobs/${encodeURIComponent(jobKey)}`);
    if (!response.ok) throw new Error('Failed to load AI generation job');
    return response.json();
  }

  async getAiJobClaims(jobKey: string): Promise<{
    jobKey: string;
    count: number;
    claims: Array<{
      claimKey: string;
      claimText: string;
      validationStatus?: string;
      sourceIds?: string[];
      evidenceQuote?: string | null;
      confidence?: number | null;
    }>;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/jobs/${encodeURIComponent(jobKey)}/claims`);
    if (!response.ok) throw new Error('Failed to load AI job claims');
    return response.json();
  }

  async getQuizAttemptsForClaim(
    claimKey: string,
    limit = 40
  ): Promise<{
    claimKey: string;
    count: number;
    attempts: Array<{
      id: number;
      isCorrect: boolean;
      createdAt: string;
      questionText: string;
      userAnswer?: string;
      correctAnswer?: string;
    }>;
  }> {
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await this.fetchWithSession(
      `${API_BASE}/api/learning/quiz-attempts/by-claim/${encodeURIComponent(claimKey)}?${params}`
    );
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getTeachingClaim(claimKey: string): Promise<{
    claim: import('@types').TeachingClaimReviewItem;
    synopsisSection: { path: string; label: string; content: string } | null;
    article: {
      uid: string | null;
      title: string | null;
      authors?: Array<{ name: string }>;
      doi?: string | null;
      pmid?: string | null;
      abstract?: string | null;
      journal?: string | null;
      pubdate?: string | null;
    };
  }> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/teaching-claims/${encodeURIComponent(claimKey)}`
    );
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async findClaimContradictions(
    claimKey: string,
    topic: string,
    claimText: string
  ): Promise<{ claimKey: string; query: string; articles: Article[]; count: number }> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/teaching-claims/${encodeURIComponent(claimKey)}/find-contradictions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, claimText }),
      }
    );
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async generateJournalClub(
    topic: string,
    articles: import('@types').Article[],
    provider: 'auto' | 'gemini' | 'mistral' = 'auto'
  ): Promise<{
    topic: string;
    provider: string;
    pack: Record<string, unknown>;
    memoryContext?: { teachingObjects: number; groundedClaims: number };
    disclaimer?: string;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/journal-club`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, articles, provider }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getQualityReport(articleId: string): Promise<{ quality: import('@types').QualityScore }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/articles/${articleId}/quality`);
    if (!response.ok) throw new Error('Failed to fetch quality report');
    return response.json();
  }

  async checkRetraction(articleId: string, doi?: string, pmid?: string): Promise<{ retraction: import('@types').RetractionStatus }> {
    const params = new URLSearchParams();
    if (doi) params.set('doi', doi);
    if (pmid) params.set('pmid', pmid);
    const response = await this.fetchWithSession(`${API_BASE}/api/articles/${articleId}/retraction?${params}`);
    if (!response.ok) throw new Error('Failed to check retraction status');
    return response.json();
  }

  async batchCheckRetractions(articles: Array<{ uid: string; doi?: string; pmid?: string }>): Promise<{ results: Record<string, import('@types').RetractionStatus> }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/articles/retraction/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles }),
    });
    if (!response.ok) throw new Error('Failed to batch check retractions');
    return response.json();
  }

  async checkGuidelineAlignment(topic: string, synthesisConsensus: string, articles: Article[]): Promise<import('@types').GuidelineAlignment> {
    const response = await this.fetchWithSession(`${API_BASE}/api/guidelines/align`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, synthesisConsensus, articles }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Guideline alignment failed');
    return response.json();
  }

  async generateGrantSection(researchQuestion: string, articles: Article[], citationStyle?: string): Promise<import('@types').GrantResult> {
    const response = await this.fetchWithSession(`${API_BASE}/api/ai/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ researchQuestion, articles, citationStyle }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Grant writing failed');
    return response.json();
  }
}
