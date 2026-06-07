/**
 * Frontend types derived from shared Zod contracts (single source of truth).
 */
import { z } from 'zod';
import {
  SearchResultRankingSchema,
  PicoProfileSchema,
  ConflictItemSchema,
  LearnerContextSchema,
  LearningEventSchema,
} from '@contracts';

export type SearchResultRanking = z.infer<typeof SearchResultRankingSchema>;
export type PicoProfile = z.infer<typeof PicoProfileSchema>;
export type ConflictItem = z.infer<typeof ConflictItemSchema>;
export type LearnerContextContract = z.infer<typeof LearnerContextSchema>;
export type LearningEventContract = z.infer<typeof LearningEventSchema>;

export {
  SearchResultRankingSchema,
  PicoProfileSchema,
  ConflictItemSchema,
  LearnerContextSchema,
  LearningEventSchema,
};
