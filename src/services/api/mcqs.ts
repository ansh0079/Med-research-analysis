import { API_BASE, BaseApiClient } from './core';

export interface CuratedTopicSummary {
  topicKey: string;
  displayName: string;
  count: number;
  storedRowCount?: number;
  coverageNote?: string | null;
}

export interface CuratedSourceRef {
  guidelineId?: string | null;
  sourceBody?: string | null;
  sourceYear?: number | null;
  sourceUrl?: string | null;
  status?: string | null;
  excerpt: string;
}

export interface CuratedQuestion {
  id: string;
  type: 'multiple_choice';
  questionType?: 'guideline' | 'recall' | 'clinical_application' | 'trial_interpretation' | 'pitfall';
  question: string;
  options: string[];
  gradingToken: string;
  multiAnswer?: boolean;
  correctAnswer?: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  outdatedSources?: boolean;
  sourceRefs?: CuratedSourceRef[];
}

export class McqsApi extends BaseApiClient {
  async listCuratedTopics(): Promise<{ topics: CuratedTopicSummary[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/mcqs/topics`);
    if (!response.ok) throw new Error('Failed to load MCQ topics');
    return response.json();
  }

  async getCuratedTopic(topicOrKey: string): Promise<{
    topicKey: string;
    displayName: string;
    coverageNote?: string | null;
    count: number;
    questions: CuratedQuestion[];
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/topics/${encodeURIComponent(topicOrKey)}/mcqs`);
    if (!response.ok) {
      const msg = await response.json().catch(() => ({ error: 'Failed to load curated MCQs' }));
      throw new Error((msg as { error?: string }).error || 'Failed to load curated MCQs');
    }
    return response.json();
  }
}

export default McqsApi;

