import type { QuestionType } from './analysis';

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false';
  questionType?: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  explanationDeep?: string | null;
  whyOthersWrong?: string;
  /** Per-option wrong-answer rationale (keys A–D). */
  distractorRationale?: Record<string, string> | null;
  visualExplanation?: {
    kind: 'flowchart' | 'comparison_table' | 'mechanism';
    title: string;
    steps?: string[];
    columns?: string[];
    rows?: string[][];
  } | null;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceArticle?: string;
  sourceArticleUid?: string;
  sourceReference?: string;
  sourceIndices?: number[];
  outlineNodeId?: string | null;
  /** Anchors quiz to a row from ai_generation_claims (provenance mode). */
  claimKey?: string | null;
  outlineLabel?: string | null;
  promptVariant?: string | null;
  validationStatus?: 'llm_validated' | 'validation_skipped' | string;
  topic?: string;
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

