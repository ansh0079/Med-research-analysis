export interface UsageLimitInfo {
  limitKey: string;
  feature: string;
  used: number;
  cap: number;
  plan?: string;
  resetsAt?: string;
  upgradeRequired?: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  ai_analysis: 'AI analyses',
  ai_synthesis: 'evidence syntheses',
  aiAnalysesPerMonth: 'AI analyses',
  synthesisPerMonth: 'evidence syntheses',
  searchesPerDay: 'searches',
};

export function parseUsageLimitError(message: string): UsageLimitInfo | null {
  if (!message.startsWith('USAGE_LIMITED:')) return null;
  try {
    const json = message.slice('USAGE_LIMITED:'.length);
    return JSON.parse(json) as UsageLimitInfo;
  } catch {
    return null;
  }
}

export function formatUsageLimitMessage(info: UsageLimitInfo): string {
  const label = FEATURE_LABELS[info.feature] || FEATURE_LABELS[info.limitKey] || info.feature;
  return `You've used ${info.used}/${info.cap} ${label} this month.`;
}

export function buildUsageLimitError(info: UsageLimitInfo): string {
  return `USAGE_LIMITED:${JSON.stringify(info)}`;
}
