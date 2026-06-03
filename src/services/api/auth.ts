import { API_BASE, BaseApiClient } from './core';
import type { AuthUser } from './core';
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

export class AuthApi extends BaseApiClient {
  async register(data: Record<string, unknown>): Promise<{ user: AuthUser; message?: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Registration failed');
    }
    return response.json();
  }

  async getMe(): Promise<{ user: AuthUser } | null> {
    try {
      const response = await this.fetchWithSession(`${API_BASE}/api/auth/me`);
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }

  async login(credentials: Record<string, unknown>): Promise<{ user: AuthUser }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Login failed');
    }
    return response.json();
  }

  async forgotPassword(email: string): Promise<void> {
    await this.fetchWithSession(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Password reset failed');
    }
  }

  async verifyEmail(token: string): Promise<{ user: AuthUser }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Verification failed');
    }
    return response.json();
  }

  async resendVerification(): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/resend-verification`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to resend verification email');
    }
  }

  async logout() {
    try {
      await this.fetchWithSession(`${API_BASE}/api/auth/logout`, { method: 'POST' });
    } catch {
      // Best-effort server logout
    }
  }

  async updateProfile(data: { name?: string }): Promise<{ user: AuthUser }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Update failed');
    }
    return response.json();
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Password change failed');
    }
    return response.json();
  }

  async startTrial(): Promise<{ message: string; trialEndsAt: string; status: string; plan: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/billing/start-trial`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to start trial');
    }
    return response.json();
  }

  async deleteAccount(): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/me`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to delete account');
    }
  }
}
