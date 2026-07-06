export interface GuidelineSource {
  id: string;
  name: string;
  fullName: string;
  region: string;
  specialty: string;
  domain: string;
  urlPattern: string;
}

export interface GuidelineEntry {
  id: number;
  topic: string;
  normalizedTopic: string;
  sourceBody: string;
  sourceRegion?: string;
  sourceYear?: number;
  sourceUrl?: string;
  sourceSpecialty?: string;
  sourceDomain?: string;
  recommendationText: string;
  recommendationStrength?: string;
  recommendationCertainty?: string;
  population?: string;
  intervention?: string;
  cautions?: string;
  status: 'ai_extracted' | 'human_reviewed' | 'stale' | 'superseded';
  reviewedBy?: string;
  reviewedAt?: string;
  supersededById?: number;
  lastCheckedAt: string;
  createdAt: string;
  updatedAt: string;
  qualityAssessment?: {
    score: number;
    level: 'high' | 'moderate' | 'low' | string;
    checks: Record<string, boolean>;
    flags: string[];
    summary: string;
  };
}

export interface GuidelineListResponse {
  guidelines: GuidelineEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface GuidelineContradiction {
  id: number;
  normalizedTopic: string;
  severity: 'major' | 'minor' | 'nuanced';
  contradictionSummary: string;
  bodyAPosition: string;
  bodyBPosition: string;
  clinicalImplication: string | null;
  aiConfidence: number;
  status: 'ai_detected' | 'human_confirmed' | 'dismissed';
  detectedAt: string;
  guidelineA: {
    id: string;
    sourceBody: string;
    sourceYear: number | null;
    sourceUrl: string | null;
    recommendationStrength: string | null;
    recommendationText: string;
  };
  guidelineB: {
    id: string;
    sourceBody: string;
    sourceYear: number | null;
    sourceUrl: string | null;
    recommendationStrength: string | null;
    recommendationText: string;
  };
}

export interface GuidelineContradictionResponse {
  topic: string;
  contradictions: GuidelineContradiction[];
  count: { total: number; major: number; minor: number; nuanced: number };
}
