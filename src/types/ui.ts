export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface ChartDataPoint {
  year?: number;
  count: number;
  label?: string;
}

export interface JournalDistribution {
  journal: string;
  count: number;
}

export interface SavedAlert {
  id: number;
  session_id: string;
  query: string;
  sources: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  is_active: number;
  created_at: string;
  author_filter?: string | null;
  journal_filter?: string | null;
}

export interface ArticleComparison {
  overallVerdict: string;
  studyDesign: { A: string; B: string; winner: 'A' | 'B' | 'tie'; rationale: string };
  population: { A: string; B: string; comparability: 'comparable' | 'partially_comparable' | 'incomparable'; note: string };
  intervention: { A: string; B: string; equivalence: 'same' | 'similar' | 'different' };
  primaryOutcome: { A: string; B: string; outcomeCompatibility: 'same' | 'related' | 'different'; note: string };
  riskOfBias: { A: 'HIGH' | 'MODERATE' | 'LOW'; B: 'HIGH' | 'MODERATE' | 'LOW'; A_concerns: string[]; B_concerns: string[] };
  sampleSize: { A: string; B: string; powerNote: string };
  keyConflicts: string[];
  keyAgreements: string[];
  clinicalBottomLine: string;
  whichToTrust: { recommendation: 'A' | 'B' | 'both_equally' | 'neither'; rationale: string };
}
