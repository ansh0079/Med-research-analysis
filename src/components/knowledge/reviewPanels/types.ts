export interface SeminalPaper {
  sourceIndex: number;
  title: string;
  clinicalPrinciple: string;
  year?: string;
  doi?: string;
}

export interface TeachingPointDraft {
  claim: string;
  sourceIndices: number[];
  confidence: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
}

export type ActiveTab = 'edit' | 'preview' | 'sources' | 'claims' | 'health';
