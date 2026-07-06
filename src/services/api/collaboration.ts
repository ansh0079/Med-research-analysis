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
  CollectionDetail,
  CollabComment,
  CollabActivity,
  CollabInvitation,
  CollabNotification,
} from '@types';

export class CollaborationApi extends BaseApiClient {
  async getBillingUsage(): Promise<{
    plan: string;
    planLabel: string;
    yearMonth: string;
    meters: Record<string, {
      limitKey: string;
      label: string;
      used: number;
      cap: number | null;
      unlimited: boolean;
      percentUsed: number;
      nearLimit: boolean;
      atLimit: boolean;
      resetsAt: string;
    }>;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/billing/usage`);
    if (!response.ok) throw new Error('Failed to fetch usage');
    return response.json();
  }

  async getBillingStatus(): Promise<{
    status: string; plan: string; role: string;
    currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean;
    trialStartedAt: string | null; trialEndsAt: string | null; hasUsedTrial: boolean;
    stripeConfigured: boolean;
    plans: Array<{ id: string; name: string; amount: number; currency: string; interval: string; features: string[]; available: boolean }>;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/billing/status`);
    if (!response.ok) throw new Error('Failed to fetch billing status');
    return response.json();
  }

  async createCheckoutSession(plan: string): Promise<{ url: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/billing/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async openBillingPortal(): Promise<{ url: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/billing/portal`, {
      method: 'POST',
    });
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async getCollections(): Promise<{ collections: CollectionSummary[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/collections`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch collections');
    return response.json();
  }

  async createCollection(name: string, description?: string): Promise<{ collection: CollectionSummary }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to create collection');
    return response.json();
  }

  async addArticleToCollection(collectionId: string, article: Article): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/collaboration/collections/${collectionId}/articles`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article }),
      }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to add article to collection');
  }

  async deleteCollection(collectionId: string): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/collaboration/collections/${collectionId}`,
      { method: 'DELETE' }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to delete collection');
  }

  async getCollection(collectionId: string): Promise<CollectionDetail> {
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/collections/${collectionId}`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch collection');
    return response.json();
  }

  async updateCollection(
    collectionId: string,
    updates: Partial<Pick<CollectionDetail, 'name' | 'description' | 'isPublic' | 'tags'>>
  ): Promise<CollectionDetail> {
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/collections/${collectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to update collection');
    return response.json();
  }

  async shareCollection(
    collectionId: string,
    userEmail: string,
    permission: 'read' | 'write' | 'admin' = 'read',
    message?: string
  ): Promise<CollabInvitation> {
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/collections/${collectionId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail, permission, message }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async updateCollectionMemberPermission(
    collectionId: string,
    userId: string,
    permission: 'read' | 'write' | 'admin'
  ): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/collaboration/collections/${collectionId}/members/${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission }),
      }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to update member permission');
  }

  async removeCollectionMember(collectionId: string, userId: string): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/collaboration/collections/${collectionId}/members/${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to remove member');
  }

  async getComments(params: { collectionId?: string; articleId?: string }): Promise<CollabComment[]> {
    const query = new URLSearchParams();
    if (params.collectionId) query.set('collectionId', params.collectionId);
    if (params.articleId) query.set('articleId', params.articleId);
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/comments?${query.toString()}`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch comments');
    return response.json();
  }

  async postComment(payload: {
    articleId?: string;
    collectionId?: string;
    content: string;
    parentId?: string;
  }): Promise<CollabComment> {
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) await this.parseErrorResponse(response);
    return response.json();
  }

  async addCommentReaction(commentId: string, emoji: string): Promise<CollabComment> {
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/comments/${commentId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to add reaction');
    return response.json();
  }

  async removeCommentReaction(commentId: string, emoji: string): Promise<CollabComment> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/collaboration/comments/${commentId}/reactions/${encodeURIComponent(emoji)}`,
      { method: 'DELETE' }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to remove reaction');
    return response.json();
  }

  async getActivity(params: { collectionId?: string; articleId?: string; limit?: number }): Promise<CollabActivity[]> {
    const query = new URLSearchParams();
    if (params.collectionId) query.set('collectionId', params.collectionId);
    if (params.articleId) query.set('articleId', params.articleId);
    if (params.limit) query.set('limit', String(params.limit));
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/activity?${query.toString()}`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch activity');
    return response.json();
  }

  async getInvitations(): Promise<CollabInvitation[]> {
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/invitations`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch invitations');
    return response.json();
  }

  // Named distinctly from acceptInvitation(token) above, which is for team invitations
  // (different endpoint, different identifier shape).
  async acceptCollabInvitation(invitationId: string): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/invitations/${invitationId}/accept`, {
      method: 'POST',
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to accept invitation');
  }

  async declineCollabInvitation(invitationId: string): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/invitations/${invitationId}/decline`, {
      method: 'POST',
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to decline invitation');
  }

  async getNotifications(): Promise<CollabNotification[]> {
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/notifications`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/collaboration/notifications/${notificationId}/read`, {
      method: 'POST',
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to mark notification read');
  }

  async getTeams(): Promise<{ teams: import('@types').Team[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch teams');
    return response.json();
  }

  async createTeam(name: string): Promise<{ team: import('@types').Team }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to create team');
    return response.json();
  }

  async updateTeam(teamId: string, updates: { name?: string; plan?: string; memberLimit?: number }): Promise<{ team: import('@types').Team }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to update team');
    return response.json();
  }

  async getTeam(teamId: string): Promise<{ team: import('@types').Team; members: import('@types').TeamMember[]; role: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch team');
    return response.json();
  }

  async inviteTeamMember(teamId: string, email: string, role?: string): Promise<{ invitation: { email: string; role: string; token: string; expiresAt: string } }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to invite member');
    return response.json();
  }

  async acceptInvitation(token: string): Promise<{ success: boolean; teamId: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/invitations/${token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to accept invitation');
    return response.json();
  }

  async getTeamCollections(teamId: string): Promise<{ collections: import('@types').TeamCollection[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}/collections`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch team collections');
    return response.json();
  }

  async createTeamCollection(teamId: string, name: string, description?: string): Promise<{ collection: import('@types').TeamCollection }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to create team collection');
    return response.json();
  }

  async addArticleToTeamCollection(teamId: string, collectionId: string, article: Article): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/teams/${teamId}/collections/${collectionId}/articles`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article }),
      }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to add article to team collection');
  }

  async deleteTeamCollection(teamId: string, collectionId: string): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/teams/${teamId}/collections/${collectionId}`,
      { method: 'DELETE' }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to delete team collection');
  }

  async getTeamCollection(teamId: string, collectionId: string): Promise<{ collection: import('@types').TeamCollection & { articles?: Article[] } }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}/collections/${collectionId}`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch team collection');
    return response.json();
  }

  async removeArticleFromTeamCollection(teamId: string, collectionId: string, articleId: string): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/teams/${teamId}/collections/${collectionId}/articles/${encodeURIComponent(articleId)}`,
      { method: 'DELETE' }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to remove article from collection');
  }

  async getTeamActivity(teamId: string): Promise<{
    activity: Array<{ id: number; message: string; createdAt: string; userId: string | null; userName: string | null }>;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}/activity`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch team activity');
    return response.json();
  }

  async getTeamAssignments(teamId: string): Promise<{
    assignments: Array<{
      id: string;
      title: string;
      assigneeUserId: string | null;
      assigneeName: string | null;
      dueDate: string | null;
      status: string;
      createdAt: string;
      createdBy: string;
    }>;
  }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}/assignments`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to fetch team assignments');
    return response.json();
  }

  async createTeamAssignment(
    teamId: string,
    data: { title: string; assigneeUserId?: string; dueDate?: string }
  ): Promise<{ assignment: { id: string; title: string; assigneeUserId: string | null; dueDate: string | null; status: string } }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create assignment');
    }
    return response.json();
  }

  async deleteTeamAssignment(teamId: string, assignmentId: string): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/teams/${teamId}/assignments/${assignmentId}`,
      { method: 'DELETE' }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to delete assignment');
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/teams/${teamId}/members/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to remove team member');
  }

  async updateTeamMemberRole(teamId: string, userId: string, role: 'member' | 'admin'): Promise<void> {
    const response = await this.fetchWithSession(
      `${API_BASE}/api/teams/${teamId}/members/${encodeURIComponent(userId)}/role`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      }
    );
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to update member role');
  }

  async getGuidelinesForTopic(topic: string): Promise<{ topic: string; guidelines: import('@types').GuidelineEntry[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/guidelines?topic=${encodeURIComponent(topic)}`);
    if (!response.ok) throw new Error('Failed to fetch guidelines');
    return response.json();
  }

  async getGuidelineSources(): Promise<{ sources: import('@types').GuidelineSource[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/guidelines/sources`);
    if (!response.ok) throw new Error('Failed to fetch guideline sources');
    return response.json();
  }

  async getGuidelineContradictions(topic: string): Promise<import('@types').GuidelineContradictionResponse> {
    const response = await this.fetchWithSession(`${API_BASE}/api/guidelines/contradictions?topic=${encodeURIComponent(topic)}`);
    if (!response.ok) throw new Error('Failed to fetch guideline contradictions');
    return response.json();
  }

  async browseGuidelines(options: { query?: string; status?: string; sourceBody?: string; limit?: number; offset?: number } = {}): Promise<import('@types').GuidelineListResponse> {
    const params = new URLSearchParams();
    if (options.query) params.set('query', options.query);
    if (options.status) params.set('status', options.status);
    if (options.sourceBody) params.set('sourceBody', options.sourceBody);
    if (options.limit != null) params.set('limit', String(options.limit));
    if (options.offset != null) params.set('offset', String(options.offset));
    const response = await this.fetchWithSession(`${API_BASE}/api/guidelines/browse?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to browse guidelines');
    return response.json();
  }

  async runAggregateMemory(): Promise<{ topics: number; message: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/aggregate-memory`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to run aggregate memory');
    return response.json();
  }

  async getAggregateMemoryStats(): Promise<{ topicsWithAttempts: number; totalAttempts: number; topicsWithMemory: number; topTopics: { normalized_topic: string; attempts: number; users: number }[] }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/aggregate-memory/stats`);
    if (!response.ok) throw new Error('Failed to get aggregate memory stats');
    return response.json();
  }

  async fetchPracticePool(options: { count?: number; difficulty?: string; type?: string } = {}): Promise<{ questions: unknown[]; total: number }> {
    const params = new URLSearchParams();
    if (options.count) params.set('count', String(options.count));
    if (options.difficulty) params.set('difficulty', options.difficulty);
    if (options.type) params.set('type', options.type);
    const response = await this.fetchWithSession(`${API_BASE}/api/quiz/pool?${params.toString()}`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to load practice pool');
    return response.json();
  }

  async listGuidelines(options: { query?: string; status?: string; sourceBody?: string; limit?: number; offset?: number } = {}): Promise<import('@types').GuidelineListResponse> {
    const params = new URLSearchParams();
    if (options.query) params.set('query', options.query);
    if (options.status) params.set('status', options.status);
    if (options.sourceBody) params.set('sourceBody', options.sourceBody);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/guidelines?${params.toString()}`);
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to list guidelines');
    return response.json();
  }

  async updateGuideline(id: number, payload: Record<string, unknown>) {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/guidelines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to update guideline');
    return response.json();
  }

  async reviewGuideline(id: number) {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/guidelines/${id}/review`, {
      method: 'POST',
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to review guideline');
    return response.json();
  }

  async staleGuideline(id: number) {
    const response = await this.fetchWithSession(`${API_BASE}/api/admin/guidelines/${id}/stale`, {
      method: 'POST',
    });
    if (response.status === 401) throw new Error('AUTH_REQUIRED');
    if (!response.ok) throw new Error('Failed to mark guideline stale');
    return response.json();
  }
}
