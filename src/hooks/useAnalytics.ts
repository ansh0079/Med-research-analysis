import { useCallback } from 'react';
import { api } from '@services/api';

export function useAnalytics() {
  const trackSearch = useCallback((query: string, metadata?: Record<string, unknown>) => {
    api.documents.logEvent('search_performed', { query, ...metadata }).catch((err: Error) => {
      if (import.meta.env.DEV) console.error('Analytics failed', err);
    });
  }, []);

  const trackFeatureUsage = useCallback((feature: string, metadata?: Record<string, unknown>) => {
    api.documents.logEvent('feature_usage', { feature, ...metadata }).catch(() => {});
  }, []);

  return { trackSearch, trackFeatureUsage };
}
