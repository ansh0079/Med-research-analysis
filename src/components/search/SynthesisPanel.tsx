import React, { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@services/api';
import type { SynthesisResult, Article, GuidelineAlignment } from '@types';
import { EvidenceAuditPanel } from '@components/search/EvidenceAuditPanel';
import { ClaimProvenanceModal, type AiJobClaimRow } from '@components/search/ClaimProvenanceModal';
import { VerificationBadge } from '@components/ui/VerificationBadge';
import { EVIDENCE_GRADE_CONFIG } from '@components/ui/evidenceGrade';
import { ClinicalSafetyNotice } from '@components/ui/ClinicalSafetyNotice';
import { StudyEncounterPanel } from '@components/search/StudyEncounterPanel';
import { ConflictMatrixPanel } from '@components/search/ConflictMatrixPanel';
import { SynthesisQualityFeedback } from '@components/search/SynthesisQualityFeedback';
import { FollowUpQuestionsPanel } from '@components/search/FollowUpQuestionsPanel';

interface SynthesisPanelProps {
  result: SynthesisResult;
  articles: Article[];
  onClose: () => void;
  onGenerateCase?: () => void;
  onSearch?: (query: string) => void;
}

const GRADE_CONFIG = EVIDENCE_GRADE_CONFIG;

const STRENGTH_DOT: Record<string, string> = {
  strong: 'bg-emerald-500',
  moderate: 'bg-blue-500',
  weak: 'bg-amber-500',
};

const PRACTICE_IMPACT_LABEL: Record<string, string> = {
  confirms_existing_practice: 'Confirms usual practice',
  weakly_modifies_practice: 'Weakly modifies practice',
  practice_changing: 'Practice-changing',
  hypothesis_generating_only: 'Hypothesis-generating only',
  not_clinically_actionable_yet: 'Not clinically actionable yet',
};

const PRACTICE_IMPACT_CARD: Record<string, { border: string; chip: string }> = {
  practice_changing: {
    border: 'border-rose-300 dark:border-rose-700/50',
    chip: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
  },
  weakly_modifies_practice: {
    border: 'border-amber-300 dark:border-amber-700/50',
    chip: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  },
  confirms_existing_practice: {
    border: 'border-slate-200 dark:border-slate-600/60',
    chip: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  },
  hypothesis_generating_only: {
    border: 'border-violet-300 dark:border-violet-700/50',
    chip: 'bg-violet-100 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200',
  },
  not_clinically_actionable_yet: {
    border: 'border-slate-300 dark:border-slate-600/60',
    chip: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  },
};

function ArticleLink({ idx, articles }: { idx: number; articles: Article[] }) {
  const a = articles[idx - 1];
  if (!a) return null;
  const href = a.doi
    ? `https://doi.org/${a.doi}`
    : a.pmid
      ? `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`
      : null;
  const chip = (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-500/15">
      {idx}
    </span>
  );
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" title={a.title}>{chip}</a> : chip;
}

function CitationWarning({ field, errors }: { field: string; errors: string[] }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
      <i className="fas fa-triangle-exclamation text-amber-500 text-[11px] shrink-0 mt-0.5" />
      <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
        <strong>Citation unverified</strong> — {field} lacks inline source references. Treat this claim with caution and verify against the numbered papers above.
        {errors.length > 0 && <span className="block opacity-70">{errors[0]}</span>}
      </p>
    </div>
  );
}

const SynthesisPanelComponent: React.FC<SynthesisPanelProps> = ({ result, articles, onClose, onGenerateCase, onSearch }) => {
  const s = result.synthesis;
  const citationIssuePaths = new Set(
    (result.citationValidation?.issues ?? []).map((i: { path: string }) => i.path)
  );
  const citationIssueErrors = new Map(
    (result.citationValidation?.issues ?? []).map((i: { path: string; errors: string[] }) => [i.path, i.errors])
  );
  const grade = GRADE_CONFIG[s.evidenceGrade] ?? GRADE_CONFIG.LOW;
  const totalDesigns = Object.values(s.studyDesigns ?? {}).reduce((a: number, b) => a + ((b as number) ?? 0), 0);
  const citedStudyIndices = new Set<number>([
    ...(s.keyFindings ?? []).flatMap((finding) => finding.studyIndices ?? []),
    ...(s.statistics ?? []).map((stat) => stat.studyIndex),
    ...(s.conflicts ?? []).flatMap((conflict) => [...(conflict.studiesFor ?? []), ...(conflict.studiesAgainst ?? [])]),
    ...(s.evidenceDisagreement?.strongestSupportingTrial?.studyIndex != null
      ? [s.evidenceDisagreement.strongestSupportingTrial.studyIndex]
      : []),
    ...(s.evidenceDisagreement?.strongestContradictingTrial?.studyIndex != null
      ? [s.evidenceDisagreement.strongestContradictingTrial.studyIndex]
      : []),
  ].filter((idx) => Number.isFinite(idx)));
  const sourceCoverage = articles.length > 0 ? Math.round((citedStudyIndices.size / Math.min(articles.length, 15)) * 100) : 0;

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

  return (
    <div className="neo-card overflow-hidden gradient-card">
      {/* Header bar */}
      <div className="relative px-6 py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Evidence Synthesis</span>
              {result.cached && (
                <span className="badge badge-source">cached</span>
              )}
            </div>
            <h2 className="font-black text-slate-900 dark:text-white text-lg leading-tight truncate">{result.topic}</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
              {result.articleCount} papers · {new Date(result.timestamp).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close synthesis"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <ClinicalSafetyNotice className="mt-3" status="synthesis_inferred" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportSynthesis}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <i className="fas fa-file-export text-[10px]" />
            Export synthesis
          </button>
          <button
            type="button"
            onClick={runJournalClub}
            disabled={journalLoading}
            className="flex items-center gap-1.5 rounded-full border border-violet-200 dark:border-violet-800 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 transition-colors hover:bg-violet-50 dark:hover:bg-violet-950/40 disabled:opacity-50"
          >
            <i className="fas fa-chalkboard-teacher text-[10px]" />
            {journalLoading ? 'Journal club…' : 'Journal club'}
          </button>
          {onGenerateCase && (
            <button
              type="button"
              onClick={onGenerateCase}
              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-black text-white transition-colors hover:bg-emerald-500"
            >
              <i className="fas fa-stethoscope text-[10px]" />
              Generate case
            </button>
          )}
          {(result.audit?.provider || result.audit?.model) && (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {result.audit?.provider} {result.audit?.model}
            </span>
          )}
          {result.citationValidation && (
            <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
              result.citationValidation.ok
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            }`}>
              {result.citationValidation.ok ? 'Citations checked' : `${result.citationValidation.issueCount} citation issues`}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 max-h-[76vh] overflow-y-auto space-y-6">

        {/* AI Disclaimer */}
        {result.disclaimer && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 p-3">
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              <i className="fas fa-exclamation-triangle mr-1.5" />
              {result.disclaimer}
            </p>
          </div>
        )}

        <EvidenceAuditPanel
          snapshot={{
            jobKey: result.jobKey,
            jobType: 'full_synthesis',
            model: result.audit?.model ?? null,
            provider: result.audit?.provider ?? null,
            generatedAt: result.audit?.generatedAt ?? result.timestamp,
            sourceCount: result.audit?.sourceCount ?? result.articleCount,
            fullTextCoverageRatio: result.audit?.fullTextCoverageRatio ?? null,
            citationOk: result.citationValidation?.ok ?? result.audit?.citationValidation?.ok ?? null,
            citationIssueCount: result.citationValidation?.issueCount,
            retractionFlagged: Boolean(result.retractionWarning) || (Number(result.audit?.retractedInBundleCount) > 0),
            retractionChecked: result.audit?.retractionCheckedCount != null,
            humanReviewStatus: result.audit?.humanReviewStatus,
          }}
        />

        {(jobKey || claimsLoading) && (
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <SectionLabel>Grounded claims</SectionLabel>
            {claimsLoading ? (
              <p className="text-xs text-slate-400">Loading claim index…</p>
            ) : jobClaims.length === 0 ? (
              <p className="text-xs text-slate-500">
                No stored claim rows yet. Generate a fresh synthesis so the server can index claims for quiz anchoring and this panel.
              </p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {jobClaims.slice(0, 12).map((c) => (
                  <li key={c.claimKey} className="flex gap-2 items-start text-xs">
                    <button
                      type="button"
                      onClick={() => setProvClaim(c)}
                      className="shrink-0 rounded-full border border-indigo-200 dark:border-indigo-700 px-2 py-0.5 font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                    >
                      Why?
                    </button>
                    <span className="flex-1 text-slate-700 dark:text-slate-300 leading-relaxed">{c.claimText}</span>
                    <VerificationBadge status={c.validationStatus} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Inline study encounter: quiz → feedback → schedule */}
        {articles.length > 0 && (
          <StudyEncounterPanel
            topic={result.topic}
            articles={articles}
            jobClaims={jobClaims}
            guidelineConflictCount={alignment?.contradictions?.length ?? 0}
          />
        )}

        {journalErr && (
          <div className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {journalErr}
          </div>
        )}
        {journalPack && (
          <div className="rounded-2xl border border-violet-200 dark:border-violet-900/50 p-4 space-y-2 text-sm">
            <SectionLabel>Journal club pack</SectionLabel>
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300 max-h-64 overflow-y-auto font-mono">
              {JSON.stringify(journalPack, null, 2)}
            </pre>
          </div>
        )}

        {/* Clinical Action Card — first thing a practising clinician reads */}
        {s.clinicalActionCard && (
          <div className="rounded-2xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/30 overflow-hidden">
            <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/40 border-b border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2">
              <i className="fas fa-stethoscope text-emerald-600 dark:text-emerald-400 text-xs" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Clinical Bottom Line</span>
              <span className="ml-auto text-[9px] text-emerald-600/70 dark:text-emerald-500/70 italic">Not patient-specific advice — for clinical decision support</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800/60 flex items-center justify-center shrink-0 mt-0.5">
                  <i className="fas fa-check text-emerald-700 dark:text-emerald-300 text-[9px]" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">Recommendation</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">{s.clinicalActionCard.recommendation}</p>
                  {citationIssuePaths.has('clinicalActionCard.recommendation') && (
                    <CitationWarning field="Recommendation" errors={citationIssueErrors.get('clinicalActionCard.recommendation') ?? []} />
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
                  <i className="fas fa-chart-bar text-blue-600 dark:text-blue-400 text-[9px]" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-0.5">Certainty</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{s.clinicalActionCard.certainty}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
                  <i className="fas fa-exclamation text-amber-600 dark:text-amber-400 text-[9px]" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">Caveat</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{s.clinicalActionCard.caveat}</p>
                  {citationIssuePaths.has('clinicalActionCard.caveat') && (
                    <CitationWarning field="Caveat" errors={citationIssueErrors.get('clinicalActionCard.caveat') ?? []} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Practice-changing evidence detector (bundle-level) */}
        {s.practiceImpact && (
          <div className={`rounded-2xl border-2 overflow-hidden ${(PRACTICE_IMPACT_CARD[s.practiceImpact.classification] ?? PRACTICE_IMPACT_CARD.not_clinically_actionable_yet).border}`}>
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-2">
              <i className="fas fa-bolt text-amber-500 text-xs" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Practice impact</span>
              <span className={`ml-auto text-[10px] font-black uppercase tracking-wider rounded-full px-2.5 py-0.5 ${(PRACTICE_IMPACT_CARD[s.practiceImpact.classification] ?? PRACTICE_IMPACT_CARD.not_clinically_actionable_yet).chip}`}>
                {PRACTICE_IMPACT_LABEL[s.practiceImpact.classification] ?? s.practiceImpact.classification.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="p-4 space-y-3 bg-white/40 dark:bg-slate-900/20">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Monday morning</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">{s.practiceImpact.mondayMorningLine}</p>
                {citationIssuePaths.has('practiceImpact.mondayMorningLine') && (
                  <CitationWarning field="Practice impact — Monday morning" errors={citationIssueErrors.get('practiceImpact.mondayMorningLine') ?? []} />
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Why this tier</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{s.practiceImpact.rationale}</p>
                {citationIssuePaths.has('practiceImpact.rationale') && (
                  <CitationWarning field="Practice impact — rationale" errors={citationIssueErrors.get('practiceImpact.rationale') ?? []} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Evidence disagreement mode — guideline vs trials */}
        {s.evidenceDisagreement && (
          <div className={`rounded-2xl border overflow-hidden ${s.evidenceDisagreement.hasMaterialDisagreement ? 'border-amber-400 dark:border-amber-600/50 bg-amber-500/[0.06]' : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'}`}>
            <div className={`px-4 py-2 border-b flex items-center gap-2 ${s.evidenceDisagreement.hasMaterialDisagreement ? 'bg-amber-100/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50' : 'bg-slate-100/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
              <i className={`fas fa-scale-balanced text-xs ${s.evidenceDisagreement.hasMaterialDisagreement ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Evidence disagreement</span>
              {s.evidenceDisagreement.hasMaterialDisagreement ? (
                <span className="ml-auto text-[9px] font-black uppercase text-amber-700 dark:text-amber-400">Material tension</span>
              ) : (
                <span className="ml-auto text-[9px] font-bold uppercase text-slate-400">Broadly aligned</span>
              )}
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Guideline position</p>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{s.evidenceDisagreement.guidelineRecommendation}</p>
                {citationIssuePaths.has('evidenceDisagreement.guidelineRecommendation') && (
                  <CitationWarning field="Guideline position" errors={citationIssueErrors.get('evidenceDisagreement.guidelineRecommendation') ?? []} />
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-800/40 bg-emerald-500/[0.05] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Strongest supporting trial</p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{s.evidenceDisagreement.strongestSupportingTrial.summary}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {s.evidenceDisagreement.strongestSupportingTrial.studyIndex != null && (
                      <ArticleLink idx={s.evidenceDisagreement.strongestSupportingTrial.studyIndex} articles={articles} />
                    )}
                  </div>
                  {citationIssuePaths.has('evidenceDisagreement.strongestSupportingTrial.summary') && (
                    <CitationWarning field="Supporting trial" errors={citationIssueErrors.get('evidenceDisagreement.strongestSupportingTrial.summary') ?? []} />
                  )}
                </div>
                <div className="rounded-xl border border-rose-200/70 dark:border-rose-800/40 bg-rose-500/[0.05] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1">Strongest contradicting trial</p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{s.evidenceDisagreement.strongestContradictingTrial.summary}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {s.evidenceDisagreement.strongestContradictingTrial.studyIndex != null && (
                      <ArticleLink idx={s.evidenceDisagreement.strongestContradictingTrial.studyIndex} articles={articles} />
                    )}
                  </div>
                  {citationIssuePaths.has('evidenceDisagreement.strongestContradictingTrial.summary') && (
                    <CitationWarning field="Contradicting trial" errors={citationIssueErrors.get('evidenceDisagreement.strongestContradictingTrial.summary') ?? []} />
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Where the recommendation may fail</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{s.evidenceDisagreement.populationsWhereFails}</p>
                {citationIssuePaths.has('evidenceDisagreement.populationsWhereFails') && (
                  <CitationWarning field="Applicability limits" errors={citationIssueErrors.get('evidenceDisagreement.populationsWhereFails') ?? []} />
                )}
              </div>
              <div className="rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 bg-indigo-500/[0.06] p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">What would change your practice?</p>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed italic">{s.evidenceDisagreement.whatWouldChangePractice}</p>
                {citationIssuePaths.has('evidenceDisagreement.whatWouldChangePractice') && (
                  <CitationWarning field="Reflective prompt" errors={citationIssueErrors.get('evidenceDisagreement.whatWouldChangePractice') ?? []} />
                )}
              </div>
            </div>
          </div>
        )}

        {(result.conflictMatrix?.length ?? 0) > 0 && (
          <ConflictMatrixPanel
            conflictMatrix={result.conflictMatrix!}
            guidelineAlignment={result.guidelineAlignment}
            articles={articles}
          />
        )}

        {/* Overall Answer — top hero */}
        {s.overallAnswer && (
          <div className={`rounded-2xl p-5 shadow-lg ${citationIssuePaths.has('overallAnswer') ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700/60' : 'bg-gradient-to-br from-indigo-600 to-violet-600 shadow-indigo-500/20'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${citationIssuePaths.has('overallAnswer') ? 'text-amber-600 dark:text-amber-400' : 'text-white/70'}`}>Overall Answer</p>
            <p className={`text-base font-bold leading-relaxed ${citationIssuePaths.has('overallAnswer') ? 'text-amber-900 dark:text-amber-100' : 'text-white'}`}>{s.overallAnswer}</p>
            {citationIssuePaths.has('overallAnswer') && (
              <CitationWarning field="Overall Answer" errors={citationIssueErrors.get('overallAnswer') ?? []} />
            )}
          </div>
        )}

        {/* Answer grounding coverage */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Answer Grounding</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                {citedStudyIndices.size} cited source{citedStudyIndices.size !== 1 ? 's' : ''} across key findings, statistics, and conflicts.
              </p>
            </div>
            <div className="w-full sm:w-40">
              <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Coverage</span>
                <span>{sourceCoverage}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white dark:bg-slate-800">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, sourceCoverage)}%` }} />
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Treat uncited statements as lower confidence. Follow numbered chips to inspect the underlying papers.
          </p>
        </div>

        {/* GRADE certainty */}
        <div className={`rounded-2xl p-5 border ${grade.bg} ${grade.border}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">GRADE Certainty</p>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2.5 h-2.5 rounded-full ${grade.dot}`} />
            <span className={`font-black text-xl ${grade.color}`}>{grade.label}</span>
          </div>
          <div className="h-1.5 bg-slate-200/60 dark:bg-slate-700/60 rounded-full mb-3">
            <div className={`h-full ${grade.bar} ${grade.dot} rounded-full transition-all duration-700`} />
          </div>
          {s.gradeRationale && (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic">{s.gradeRationale}</p>
          )}
        </div>

        {/* Fallback: plain clinicalBottomLine for cached responses without clinicalActionCard */}
        {!s.clinicalActionCard && s.clinicalBottomLine && (
          <div className="rounded-2xl p-5 border bg-indigo-500/[0.07] dark:bg-indigo-500/10 border-indigo-500/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-3">Clinical Bottom Line</p>
            <p className="font-bold text-slate-900 dark:text-white leading-relaxed">{s.clinicalBottomLine}</p>
            {citationIssuePaths.has('clinicalBottomLine') && (
              <CitationWarning field="Clinical Bottom Line" errors={citationIssueErrors.get('clinicalBottomLine') ?? []} />
            )}
          </div>
        )}

        {/* Clinical Implications */}
        {s.clinicalImplications && (
          <div className="rounded-2xl p-4 border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Clinical Implications</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{s.clinicalImplications}</p>
            {citationIssuePaths.has('clinicalImplications') && (
              <CitationWarning field="Clinical Implications" errors={citationIssueErrors.get('clinicalImplications') ?? []} />
            )}
          </div>
        )}

        {/* What studies agree on */}
        {s.agreement && s.agreement.length > 0 && (
          <div>
            <SectionLabel>What the Evidence Agrees On</SectionLabel>
            <div className="space-y-1.5">
              {s.agreement.map((point, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <i className="fas fa-check-circle text-emerald-500 text-[11px] mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-700 dark:text-slate-300">{point}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Consensus */}
        {s.consensus && (
          <div>
            <SectionLabel>Consensus Summary</SectionLabel>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">{s.consensus}</p>
            {citationIssuePaths.has('consensus') && (
              <CitationWarning field="Consensus Summary" errors={citationIssueErrors.get('consensus') ?? []} />
            )}
          </div>
        )}

        {/* Study designs */}
        {totalDesigns > 0 && (
          <div>
            <SectionLabel>Study Design Breakdown</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(s.studyDesigns ?? {}) as [string, number][])
                .filter(([, n]) => n > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([key, n]) => (
                  <span key={key} className="badge badge-source font-mono">
                    <span className="font-black text-indigo-500">{n}×</span>
                    {' '}{key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Key Findings */}
        {s.keyFindings?.length > 0 && (
          <div>
            <SectionLabel>{s.keyFindings.length} Key Findings</SectionLabel>
            <div className="space-y-2">
              {s.keyFindings.map((f, i) => (
                <div key={i} className="flex gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${STRENGTH_DOT[f.strength] ?? 'bg-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{f.finding}</p>
                    {f.studyIndices?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap items-center">
                        {f.studyIndices.map(idx => (
                          <ArticleLink key={idx} idx={idx} articles={articles} />
                        ))}
                        <button
                          type="button"
                          onClick={() => openProvenanceForFinding(f.finding, f.studyIndices)}
                          className="ml-1 text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Show me why
                        </button>
                      </div>
                    )}
                    {(!f.studyIndices || f.studyIndices.length === 0) && (
                      <button
                        type="button"
                        onClick={() => openProvenanceForFinding(f.finding, [])}
                        className="mt-2 text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Show me why
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        {s.statistics?.length > 0 && (
          <div>
            <SectionLabel>Key Statistics</SectionLabel>
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                    <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Metric</th>
                    <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Value</th>
                    <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Meaning</th>
                    <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
                  {s.statistics.map((st, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{st.metric}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">{st.value}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{st.context}</td>
                      <td className="px-4 py-2.5">
                        <ArticleLink idx={st.studyIndex} articles={articles} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Conflicts */}
        {s.conflicts?.length > 0 && (
          <div>
            <SectionLabel>Conflicting Evidence</SectionLabel>
            <div className="space-y-2">
              {s.conflicts.map((c, i) => (
                <div key={i} className="p-4 rounded-xl bg-amber-500/[0.07] dark:bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-slate-800 dark:text-slate-200 mb-2">{c.description}</p>
                  <div className="flex gap-4 text-[10px] font-bold">
                    {c.studiesFor?.length > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">For: Studies {c.studiesFor.join(', ')}</span>
                    )}
                    {c.studiesAgainst?.length > 0 && (
                      <span className="text-red-500 dark:text-red-400">Against: Studies {c.studiesAgainst.join(', ')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Limitations + Gaps */}
        {(s.limitations || s.researchGaps) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {s.limitations && (
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Key Limitations</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{s.limitations}</p>
              </div>
            )}
            {s.researchGaps && (
              <div className="p-4 rounded-xl bg-amber-500/[0.05] dark:bg-amber-500/[0.08] border border-amber-500/15">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-2">Research Gaps</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{s.researchGaps}</p>
              </div>
            )}
          </div>
        )}

        {/* What is still uncertain */}
        {s.uncertainties && s.uncertainties.length > 0 && (
          <div>
            <SectionLabel>Still Uncertain</SectionLabel>
            <div className="space-y-1.5">
              {s.uncertainties.map((u, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                  <i className="fas fa-question-circle text-amber-500 text-[11px] mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-700 dark:text-slate-300">{u}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up question suggestions */}
        {s.followUpQuestions && s.followUpQuestions.length > 0 && onSearch && (
          <FollowUpQuestionsPanel
            questions={s.followUpQuestions}
            onSearch={(q) => { onSearch(q); onClose(); }}
          />
        )}

        {/* Paper-by-paper contribution table */}
        {s.paperContributions && s.paperContributions.length > 0 && (
          <div>
            <SectionLabel>Paper-by-Paper Contribution</SectionLabel>
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                    <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5 w-8">#</th>
                    <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Paper</th>
                    <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5 w-28">Practice</th>
                    <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Main contribution</th>
                    <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5 w-24">Strength</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
                  {s.paperContributions.map((pc, i) => {
                    const art = articles[pc.studyIndex - 1];
                    const href = art?.doi
                      ? `https://doi.org/${art.doi}`
                      : art?.pmid
                        ? `https://pubmed.ncbi.nlm.nih.gov/${art.pmid}/`
                        : null;
                    const strengthCls = pc.strengthAdded === 'strong'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : pc.strengthAdded === 'moderate'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
                    const pic = pc.practiceImpactClass;
                    const pChip = pic ? (PRACTICE_IMPACT_CARD[pic] ?? PRACTICE_IMPACT_CARD.not_clinically_actionable_yet) : null;
                    return (
                      <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-bold text-indigo-500">{pc.studyIndex}</td>
                        <td className="px-4 py-2.5 max-w-[16rem]">
                          {href ? (
                            <a href={href} target="_blank" rel="noopener noreferrer"
                              className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2 transition-colors">
                              {art?.title ?? `Study ${pc.studyIndex}`}
                            </a>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400 line-clamp-2">{art?.title ?? `Study ${pc.studyIndex}`}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 align-top">
                          {pic && pChip ? (
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold leading-tight ${pChip.chip}`}>
                              {PRACTICE_IMPACT_LABEL[pic] ?? pic.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 leading-relaxed">
                          <span className="block">{pc.mainContribution}</span>
                          {pc.practiceImpactNote ? (
                            <span className="block mt-1 text-[11px] text-slate-500 dark:text-slate-500 border-l-2 border-indigo-300/60 pl-2">{pc.practiceImpactNote}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${strengthCls}`}>
                            {pc.strengthAdded}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Guideline Alignment */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Guideline Alignment</p>
            {!alignment && !alignmentLoading && (
              <button
                type="button"
                onClick={checkAlignment}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Check vs Guidelines
              </button>
            )}
          </div>
          <div className="p-5">
            {!alignment && !alignmentLoading && !alignmentError && (
              <p className="text-xs text-slate-400 dark:text-slate-500">Compare this evidence against NICE, AHA, WHO, and SIGN guidelines.</p>
            )}
            {alignmentLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="spinner" /> Checking NICE · AHA · WHO · SIGN…
              </div>
            )}
            {alignmentError && (
              <p className="text-xs text-red-500">{alignmentError}</p>
            )}
            {alignment && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden`}>
                    <div
                      className={`impact-bar-fill ${
                        alignment.alignmentScore >= 70 ? '[background:theme(colors.emerald.500)]' : alignment.alignmentScore >= 40 ? '[background:theme(colors.amber.500)]' : '[background:theme(colors.red.500)]'
                      }`}
                      data-pct={String(Math.round(alignment.alignmentScore / 10) * 10)}
                    />
                  </div>
                  <span className="text-sm font-black text-slate-700 dark:text-slate-200 shrink-0 w-12 text-right font-mono">{alignment.alignmentScore}%</span>
                  <span className="text-xs text-slate-400 shrink-0">{alignment.guidelinesFound} guideline{alignment.guidelinesFound !== 1 ? 's' : ''}</span>
                </div>
                {alignment.summary && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">{alignment.summary}</p>
                )}
                {alignment.contradictions?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">{alignment.contradictions.length} Contradiction{alignment.contradictions.length !== 1 ? 's' : ''}</p>
                    {alignment.contradictions.map((c, i) => (
                      <div key={i} className={`p-3 rounded-xl border text-xs ${
                        c.severity === 'major'
                          ? 'bg-red-500/[0.07] border-red-500/20 text-red-700 dark:text-red-400'
                          : c.severity === 'nuanced'
                            ? 'bg-blue-500/[0.07] border-blue-500/20 text-blue-700 dark:text-blue-400'
                            : 'bg-amber-500/[0.07] border-amber-500/20 text-amber-700 dark:text-amber-400'
                      }`}>
                        <span className="font-bold">{c.guideline}</span> — {c.explanation}
                      </div>
                    ))}
                  </div>
                )}

                {/* Local policy disclaimer */}
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 px-3 py-2 text-[10px] text-slate-500 dark:text-slate-400">
                  <i className="fas fa-info-circle mr-1 text-slate-400" />
                  Always verify against your local hospital policy and national formulary before applying any recommendation.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Source papers */}
        <div>
          <SectionLabel>Papers Analysed</SectionLabel>
          <div className="space-y-1">
            {articles.slice(0, 15).map((a, i) => {
              const href = a.doi
                ? `https://doi.org/${a.doi}`
                : a.pmid
                  ? `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`
                  : null;
              return (
                <div key={a.uid} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                  <div className="flex gap-2 items-baseline">
                  <span className="font-mono font-bold text-indigo-500 shrink-0 w-5">{i + 1}.</span>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="line-clamp-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                      {a.title}
                    </a>
                  ) : (
                    <span className="line-clamp-1">{a.title}</span>
                  )}
                  {a.pubdate && <span className="text-slate-400 shrink-0 font-mono">({a.pubdate.split(' ')[0]})</span>}
                  {a._quality?.grade && (
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                      Quality {a._quality.grade}
                    </span>
                  )}
                  {a._retraction?.isRetracted && (
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                      Retracted
                    </span>
                  )}
                  </div>
                  {a.abstract && (
                    <p className="mt-2 line-clamp-2 pl-7 leading-relaxed text-slate-500 dark:text-slate-500">
                      {a.abstract}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <SynthesisQualityFeedback topic={result.topic} />

      </div>

      <ClaimProvenanceModal
        open={provClaim != null}
        onClose={() => setProvClaim(null)}
        topic={result.topic}
        articles={articles}
        claim={provClaim}
      />
    </div>
  );
};
SynthesisPanelComponent.displayName = 'SynthesisPanel';
export const SynthesisPanel = React.memo(SynthesisPanelComponent);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">{children}</p>
  );
}
