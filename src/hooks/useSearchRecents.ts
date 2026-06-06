import { useEffect, useMemo, useState } from 'react';
import { api } from '@services/api';
import {
  mergeSearchRecents,
  readLocalTopicRecents,
  type SearchRecentEntry,
} from '@utils/searchRecents';

export function useSearchRecents(searchHistory: string[], isAuthenticated: boolean): SearchRecentEntry[] {
  const [accountRecents, setAccountRecents] = useState<string[]>([]);
  const [localTopics, setLocalTopics] = useState<string[]>(() => readLocalTopicRecents());

  useEffect(() => {
    if (!isAuthenticated) {
      setAccountRecents([]);
      return;
    }
    void api.getSearchHistory()
      .then((r) => setAccountRecents((r.history || []).map((h) => h.query).filter(Boolean)))
      .catch(() => setAccountRecents([]));
  }, [isAuthenticated]);

  useEffect(() => {
    const refresh = () => setLocalTopics(readLocalTopicRecents());
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [searchHistory]);

  return useMemo(
    () => mergeSearchRecents(searchHistory, localTopics, accountRecents),
    [searchHistory, localTopics, accountRecents]
  );
}
