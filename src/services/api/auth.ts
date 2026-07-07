import { API_BASE, BaseApiClient } from './core';
import type { AuthUser } from './core';

export class AuthApi extends BaseApiClient {
  async register(data: Record<string, unknown>): Promise<{ user: AuthUser; message?: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      await this.parseErrorResponse(response);
    }
    return response.json();
  }

  /**
   * Returns the current session user, or `null` when the session is no
   * longer valid (401). Network errors and server failures are re-thrown
   * so callers can distinguish "logged out" from "the API is broken".
   */
  async getMe(): Promise<{ user: AuthUser } | null> {
    let response: Response;
    try {
      response = await this.fetchWithSession(`${API_BASE}/api/auth/me`);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Network error while fetching session');
    }
    if (response.status === 401) return null;
    if (!response.ok) {
      await this.parseErrorResponse(response);
    }
    return response.json();
  }

  async login(credentials: Record<string, unknown>): Promise<{ user: AuthUser }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) {
      await this.parseErrorResponse(response);
    }
    return response.json();
  }

  async forgotPassword(email: string): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      await this.parseErrorResponse(response);
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    if (!response.ok) {
      await this.parseErrorResponse(response);
    }
  }

  async verifyEmail(token: string): Promise<{ user: AuthUser }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      await this.parseErrorResponse(response);
    }
    return response.json();
  }

  async resendVerification(): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/resend-verification`, {
      method: 'POST',
    });
    if (!response.ok) {
      await this.parseErrorResponse(response);
    }
  }

  /**
   * Returns a refreshed session user, or `null` when the refresh token is no
   * longer valid (401). Network errors and server failures are re-thrown
   * so callers can distinguish "session expired" from "the API is broken".
   */
  async refreshSession(): Promise<{ user: AuthUser } | null> {
    let response: Response;
    try {
      response = await this.fetchWithSession(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Network error while refreshing session');
    }
    if (response.status === 401) return null;
    if (!response.ok) {
      await this.parseErrorResponse(response);
    }
    return response.json();
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
      await this.parseErrorResponse(response);
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
      await this.parseErrorResponse(response);
    }
    return response.json();
  }

  async startTrial(): Promise<{ message: string; trialEndsAt: string; status: string; plan: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/billing/start-trial`, {
      method: 'POST',
    });
    if (!response.ok) {
      await this.parseErrorResponse(response);
    }
    return response.json();
  }

  async changeEmail(data: { newEmail: string; password: string }): Promise<{ message: string }> {
    const response = await this.fetchWithSession(`${API_BASE}/api/auth/change-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      await this.parseErrorResponse(response);
    }
    return response.json();
  }

  async deleteAccount(): Promise<void> {
    const response = await this.fetchWithSession(`${API_BASE}/api/account`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      await this.parseErrorResponse(response);
    }
  }

  async downloadAccountData(): Promise<Blob> {
    const response = await this.fetchWithSession(`${API_BASE}/api/account/data-export`);
    if (!response.ok) {
      await this.parseErrorResponse(response);
    }
    return response.blob();
  }

  async getPreferences(): Promise<Record<string, unknown>> {
    const response = await this.fetchWithSession(`${API_BASE}/api/account/preferences`);
    if (!response.ok) throw new Error('Failed to load preferences');
    const data = await response.json();
    return data.preferences;
  }

  async savePreferences(prefs: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await this.fetchWithSession(`${API_BASE}/api/account/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    });
    if (!response.ok) throw new Error('Failed to save preferences');
    const data = await response.json();
    return data.preferences;
  }
}
