import { API_BASE, BaseApiClient } from './core';
import type {
  Article,
  AgentGuidance,
  TopicKnowledge,
  TopicKnowledgeListResponse,
  TopicKnowledgeProposal,
  TopicKnowledgeProposalListResponse,
} from '@types';

export class KnowledgeCoreApi extends BaseApiClient {
  async getTopicKnowledge(topic: string): Promise<{ found: boolean; agentGuidance: AgentGuidance | null; updatedAt?: string; lastRefreshedAt?: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge/${encodeURIComponent(topic)}`);
    // 404/401 are legitimate "not built yet / not authenticated" signals.
    // 5xx and network errors must propagate so callers can distinguish a
    // missing topic from a broken backend.
    if (response.status === 404 || response.status === 401) {
      return { found: false, agentGuidance: null };
    }
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async refreshTopicKnowledge(topic: string): Promise<{ agentGuidance: AgentGuidance; topicKnowledge: TopicKnowledge }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return (await response.json()) as { agentGuidance: AgentGuidance; topicKnowledge: TopicKnowledge };
  }

  async reviewTopicKnowledge(topic: string): Promise<{ found: boolean; agentGuidance?: AgentGuidance | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge/${encodeURIComponent(topic)}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async verifyTopicKnowledgeAnchor(
    topic: string,
    body: { claimText: string; articleUid?: string | null }
  ): Promise<{ topicKnowledge: TopicKnowledge; agentGuidance: AgentGuidance | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge/${encodeURIComponent(topic)}/verify-anchor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async listEvidenceAlerts(options: { limit?: number; unreadOnly?: boolean; topic?: string } = {}): Promise<{
    alerts: import('@types').ProactiveEvidenceAlert[];
  }> {
    const params = new URLSearchParams();
    if (options.limit != null) params.set('limit', String(options.limit));
    if (options.unreadOnly) params.set('unread', '1');
    if (options.topic) params.set('topic', options.topic);
    const response = await this.fetchWithSession(`${API_BASE}/api/me/evidence-alerts?${params}`);
    if (response.status === 404 || response.status === 401) {
      return { alerts: [] };
    }
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async markEvidenceAlertRead(id: number): Promise<{ alert: import('@types').ProactiveEvidenceAlert }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/me/evidence-alerts/${encodeURIComponent(String(id))}/read`, {
      method: 'POST',
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  /**
   * Download the admin audit log as CSV. Goes through `fetchWithSession` so the
   * request carries the session/CSRF headers and benefits from 401 refresh.
   */
  async exportAuditLog(options: { dateFrom?: string; dateTo?: string } = {}): Promise<Blob> {
    const params = new URLSearchParams();
    if (options.dateFrom) params.set('dateFrom', options.dateFrom);
    if (options.dateTo) params.set('dateTo', options.dateTo);
    const url = `${API_BASE}/api/admin/audit-log/export${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithSession(url);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.blob();
  }

  async getSynapseGraph(topic: string): Promise<import('@types').SynapseGraphPayload> {
    const response = await this.fetchWithSession(`${API_BASE}/api/topics/${encodeURIComponent(topic)}/synapse-graph`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async proposeTopicKnowledge(
    topic: string,
    articles: Article[]
  ): Promise<{ proposal: TopicKnowledgeProposal; agentGuidance: AgentGuidance | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/search/${encodeURIComponent(topic)}/propose-knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async listTopicKnowledge(options: { query?: string; status?: string; limit?: number; offset?: number } = {}): Promise<TopicKnowledgeListResponse> {
    const params = new URLSearchParams();
    if (options.query) params.set('q', options.query);
    if (options.status) params.set('status', options.status);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async updateTopicKnowledge(
    topic: string,
    payload: { knowledge: TopicKnowledge['knowledge']; sourceArticles?: TopicKnowledge['sourceArticles']; status?: string; confidence?: number }
  ): Promise<{ topicKnowledge: TopicKnowledge; agentGuidance: AgentGuidance | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge/${encodeURIComponent(topic)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async listTopicKnowledgeProposals(
    options: { topic?: string; status?: string; limit?: number; offset?: number } = {}
  ): Promise<TopicKnowledgeProposalListResponse> {
    const params = new URLSearchParams();
    if (options.topic) params.set('topic', options.topic);
    if (options.status) params.set('status', options.status);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge-proposals?${params}`);
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async approveTopicKnowledgeProposal(
    id: number
  ): Promise<{ proposal: TopicKnowledgeProposal; topicKnowledge: TopicKnowledge; agentGuidance: AgentGuidance | null }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge-proposals/${encodeURIComponent(String(id))}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async rejectTopicKnowledgeProposal(id: number): Promise<{ proposal: TopicKnowledgeProposal }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/knowledge-proposals/${encodeURIComponent(String(id))}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

}
