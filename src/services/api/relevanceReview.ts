import { API_BASE, BaseApiClient } from './core';

export type RelevanceLabel = 'on_topic' | 'adjacent' | 'off_topic';

export interface RelevanceCandidate {
  articleUid: string;
  servedRank: number | null;
  lane: string | null;
  retracted?: boolean;
  title?: string | null;
}

export interface RelevanceQueueEntry {
  queryKey: string;
  query: string;
  searchId: string;
  servedAt: string;
  candidates: RelevanceCandidate[];
}

export interface RelevanceVote {
  label: RelevanceLabel;
  reviewerId: string;
  reviewerRole: string;
  reason?: string | null;
}

export interface RelevanceScenarioCandidate extends RelevanceCandidate {
  votes: RelevanceVote[];
  label: RelevanceLabel | null;
  /** unjudged | single_reviewer | agreed | disagreed | adjudicated */
  state: string;
  reviewers: number;
  disagreed: boolean;
}

export interface RelevanceScenario {
  queryKey: string;
  query: string;
  scenarioId: string | null;
  intendedSense: string | null;
  reviewers: string[];
  candidates: RelevanceScenarioCandidate[];
  agreement: { pairs: number; observedAgreement: number | null; kappa: number | null; reportable: boolean };
  graduatable: boolean;
  blockers: string[];
}

/**
 * The clinician relevance review queue.
 *
 * These labels decide whether a ranking change counts as an improvement, so the server owns who may
 * write them and which of them may graduate into the held-out set. This client only presents what
 * the server reports: it never decides that a scenario is ready.
 */
export class RelevanceReviewApi extends BaseApiClient {
  async getQueue(limit = 25): Promise<{ labels: RelevanceLabel[]; queue: RelevanceQueueEntry[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/review/relevance/queue?limit=${limit}`);
    if (!response.ok) return this.parseErrorResponse(response);
    return response.json();
  }

  async getScenarios(query?: string): Promise<{
    labels: RelevanceLabel[];
    scenarios: RelevanceScenario[];
    summary: { total: number; graduatable: number };
  }> {
    const params = query ? `?query=${encodeURIComponent(query)}` : '';
    const response = await this.fetchWithSession(`${API_BASE}/api/review/relevance/scenarios${params}`);
    if (!response.ok) return this.parseErrorResponse(response);
    return response.json();
  }

  async recordJudgement(payload: {
    query: string;
    articleUid: string;
    label: RelevanceLabel;
    reason?: string;
    intendedSense?: string;
    scenarioId?: string;
    articleTitle?: string;
    searchId?: string;
    servedRank?: number | null;
    lane?: string | null;
  }): Promise<{ ok: true; queryKey: string; articleUid: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/review/relevance/judgements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return this.parseErrorResponse(response);
    return response.json();
  }

  async adjudicate(payload: {
    query: string;
    articleUid: string;
    finalLabel: RelevanceLabel;
    rationale?: string;
  }): Promise<{ ok: true }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/review/relevance/adjudications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return this.parseErrorResponse(response);
    return response.json();
  }

  /** Returns the fixture document for scenarios that are ready; committing it stays a human decision. */
  async exportFixture(): Promise<{ queries: unknown[]; skipped: { query: string; reasons: string[] }[]; agreement: unknown }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/review/relevance/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!response.ok) return this.parseErrorResponse(response);
    return response.json();
  }
}
