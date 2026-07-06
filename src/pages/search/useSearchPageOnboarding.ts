import { useEffect, useRef, useState } from 'react';
import type { SearchFilters } from '@types';

export function useSearchPageOnboarding(
  search: (query: string, filters: SearchFilters) => Promise<unknown>,
  filters: SearchFilters,
) {
  const [currentQuery, setCurrentQuery] = useState(() => {
    const q = sessionStorage.getItem('med_onboarding_query');
    return q || '';
  });

  // Pick up onboarding pre-selected query and run it automatically
  const onboardingSearchDone = useRef(false);
  useEffect(() => {
    if (onboardingSearchDone.current) return;
    const onboardingQuery = currentQuery || sessionStorage.getItem('med_onboarding_query');
    if (onboardingQuery) {
      onboardingSearchDone.current = true;
      sessionStorage.removeItem('med_onboarding_query');
      void search(onboardingQuery, filters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { currentQuery, setCurrentQuery };
}
