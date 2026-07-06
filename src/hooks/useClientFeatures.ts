import { useEffect, useState } from 'react';
import { api } from '@services/api';

export interface ClientFeatures {
  betaMode: boolean;
  betaOpenAccess: boolean;
  vectorSearch: boolean;
}

const DEFAULT_FEATURES: ClientFeatures = {
  betaMode: false,
  betaOpenAccess: false,
  vectorSearch: false,
};

export function useClientFeatures(): ClientFeatures {
  const [features, setFeatures] = useState<ClientFeatures>(DEFAULT_FEATURES);

  useEffect(() => {
    let cancelled = false;
    void api.search.getClientConfig().then((config) => {
      if (cancelled) return;
      const betaMode = Boolean(
        (config as { betaMode?: boolean; betaOpenAccess?: boolean }).betaOpenAccess
          ?? (config as { betaMode?: boolean }).betaMode,
      );
      setFeatures({
        betaMode,
        betaOpenAccess: betaMode,
        vectorSearch: Boolean(config.features?.vectorSearch),
      });
    });
    return () => { cancelled = true; };
  }, []);

  return features;
}
