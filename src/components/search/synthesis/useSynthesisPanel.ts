import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@services/api';
import type { Article, GuidelineAlignment, SynthesisResult } from '@types';
import type { AiJobClaimRow } from '@components/search/ClaimProvenanceModal';
import { GRADE_CONFIG } from './synthesisPanelConfig';

export interface UseSynthesisPanelReturn {
  s: SynthesisResult['synthesis'];
  grade: typeof GRADE_CONFIG[keyof typeof GRADE_CONFIG];
  totalDesigns: number;
  citedStudyIndices: Set<number>;
  sourceCoverage: number;
  citationIssuePaths: Set<string>;
  citationIssueErrors: Map<string, string[]>;
  alignment: GuidelineAlignment | null;
  alignmentLoading: boolean;
  alignmentError: string | null;
  jobClaims: AiJobClaimRow[];
  claimsLoading: boolean;
  provClaim: AiJobClaimRow | null;
  setProvClaim: (claim: AiJobClaimRow | null) => void;
  journalLoading: boolean;
  journalPack: Record<string, unknown> | null;
  journalErr: string | null;
  exportSynthesis: () => void;
  checkAlignment: () => Promise<void>;
  openProvenanceForFinding: (findingText: string, studyIndices?: number[]) => void;
  runJournalClub: () => void;
}

export function useSynthesisPanel(
  result: SynthesisResult,
  articles: Article[]
): UseSynthesisPanelReturn {
  const s = result.synthesis;

  const citationIssuePaths = useMemo(
    () => new Set((result.citationValidation?.issues ?? []).map((i: { path: string }) => i.path)),
    [result.citationValidation]
  );
  const citationIssueErrors = useMemo(
    () => new Map((result.citationValidation?.issues ?? []).map((i: { path: string; errors: string[] }) => [i.path, i.errors])),
    [result.citationValidation]
  );
  const grade = GRADE_CONFIG[s.evidenceGrade] ?? GRADE_CONFIG.LOW;
  const totalDesigns = Object.values(s.studyDesigns ?? {}).reduce(
    (a: number, b) => a + ((b as number) ?? 0),
    0
  );
  const citedStudyIndices = useMemo(
    () => new Set<number>([
      ...(s.keyFindings ?? []).flatMap((finding) => finding.studyIndices ?? []),
      ...(s.statistics ?? []).map((stat) => stat.studyIndex),
      ...(s.conflicts ?? []).flatMap((conflict) => [
        ...(conflict.studiesFor ?? []),
        ...(conflict.studiesAgainst ?? []),
      ]),
      ...(s.evidenceDisagreement?.strongestSupportingTrial?.studyIndex != null
        ? [s.evidenceDisagreement.strongestSupportingTrial.studyIndex]
        : []),
      ...(s.evidenceDisagreement?.strongestContradictingTrial?.studyIndex != null
        ? [s.evidenceDisagreement.strongestContradictingTrial.studyIndex]
        : []),
    ].filter((idx) => Number.isFinite(idx))),
    [s]
  );
  const sourceCoverage = articles.length > 0
    ? Math.round((citedStudyIndices.size / Math.min(articles.length, 15)) * 100)
    : 0;

  const [alignment, setAlignment] = useState<GuidelineAlignment | null>(null);
  const [alignmentLoading, setAlignmentLoading] = useState(false);
  const [alignmentError, setAlignmentError] = useState<string | null>(null);
  const [jobClaims, setJobClaims] = useState<AiJobClaimRow[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [provClaim, setProvClaim] = useState<AiJobClaimRow | null>(null);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalPack, setJournalPack] = useState<Record<string, unknown> | null>(null);
  const [journalErr, setJournalErr] = useState<string | null>(null);

  // Fire-and-forget CPD log when a synthesis is first viewed
  const cpdLoggedRef = useRef(false);
  useEffect(() => {
    if (cpdLoggedRef.current || result.cached) return;
    cpdLoggedRef.current = true;
    api.learning.logCpdSession({
      activityType: 'synthesis',
      topic: result.topic,
      durationMinutes: 3,
      source: 'auto',
    }).catch(() => { /* non-critical */ });
  }, [result.topic, result.cached]);

  const exportSynthesis = useCallback(() => {
    const payload = {
      topic: result.topic,
      articleCount: result.articleCount,
      generatedAt: result.timestamp,
      synthesis: result.synthesis,
      sources: result.sources ?? result.audit?.retrievedContext ?? [],
      guidelineAlignment: alignment,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'evidence-synthesis'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [alignment, result]);

  const checkAlignment = useCallback(async () => {
    setAlignmentLoading(true);
    setAlignmentError(null);
    try {
      const data = await api.ai.checkGuidelineAlignment(result.topic, s.consensus, articles.slice(0, 15));
      setAlignment(data);
    } catch (err: unknown) {
      setAlignmentError(err instanceof Error ? err.message : 'Failed to check guidelines');
    } finally {
      setAlignmentLoading(false);
    }
  }, [result.topic, s.consensus, articles]);

  const jobKey = result.jobKey ?? null;
  useEffect(() => {
    if (!jobKey) {
      setJobClaims([]);
      return;
    }
    setClaimsLoading(true);
    api.ai.getAiJobClaims(jobKey)
      .then((r) => setJobClaims(r.claims as AiJobClaimRow[]))
      .catch(() => setJobClaims([]))
      .finally(() => setClaimsLoading(false));
  }, [jobKey]);

  const openProvenanceForFinding = useCallback(
    (findingText: string, studyIndices?: number[]) => {
      const t = findingText.slice(0, 72).trim().toLowerCase();
      const uidList = (studyIndices || [])
        .map((i) => articles[Number(i) - 1]?.uid)
        .filter(Boolean) as string[];
      const hit = jobClaims.find(
        (c) =>
          t.length > 6 &&
          (c.claimText.toLowerCase().includes(t) ||
            t.includes(c.claimText.slice(0, Math.min(48, c.claimText.length)).toLowerCase()))
      );
      if (hit) setProvClaim(hit);
      else {
        setProvClaim({
          claimKey: `inline-${Date.now().toString(36)}`,
          claimText: findingText,
          sourceIds: uidList,
          evidenceQuote: null,
          validationStatus: 'synthesis_excerpt',
        });
      }
    },
    [jobClaims, articles]
  );

  const runJournalClub = useCallback(() => {
    setJournalErr(null);
    setJournalLoading(true);
    api.ai.generateJournalClub(result.topic, articles, 'auto')
      .then((r) => setJournalPack(r.pack))
      .catch((e: unknown) => setJournalErr(e instanceof Error ? e.message : 'Journal club failed'))
      .finally(() => setJournalLoading(false));
  }, [articles, result.topic]);

  return {
    s,
    grade,
    totalDesigns,
    citedStudyIndices,
    sourceCoverage,
    citationIssuePaths,
    citationIssueErrors,
    alignment,
    alignmentLoading,
    alignmentError,
    jobClaims,
    claimsLoading,
    provClaim,
    setProvClaim,
    journalLoading,
    journalPack,
    journalErr,
    exportSynthesis,
    checkAlignment,
    openProvenanceForFinding,
    runJournalClub,
  };
}
