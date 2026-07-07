import React from 'react';
import type { SynthesisResult, Article } from '@types';
import { EvidenceAuditPanel } from '@components/search/EvidenceAuditPanel';
import { ClaimProvenanceModal } from '@components/search/ClaimProvenanceModal';
import { VerificationBadge } from '@components/ui/VerificationBadge';
import { ClinicalSafetyNotice } from '@components/ui/ClinicalSafetyNotice';
import { StudyEncounterPanel } from '@components/search/StudyEncounterPanel';
import { ConflictMatrixPanel } from '@components/search/ConflictMatrixPanel';
import { SynthesisQualityFeedback } from '@components/search/SynthesisQualityFeedback';

import { useSynthesisPanel } from './synthesis/useSynthesisPanel';
import { SynthesisAnswerGrounding } from './synthesis/SynthesisAnswerGrounding';
import { SynthesisClinicalActionCard } from './synthesis/SynthesisClinicalActionCard';
import { SynthesisClinicalBottomLine } from './synthesis/SynthesisClinicalBottomLine';
import { SynthesisClinicalImplications } from './synthesis/SynthesisClinicalImplications';
import { SynthesisAgreement } from './synthesis/SynthesisAgreement';
import { SynthesisConsensus } from './synthesis/SynthesisConsensus';
import { SynthesisConflicts } from './synthesis/SynthesisConflicts';
import { SynthesisEvidenceDisagreement } from './synthesis/SynthesisEvidenceDisagreement';
import { SynthesisFollowUpQuestions } from './synthesis/SynthesisFollowUpQuestions';
import { SynthesisGradeCertainty } from './synthesis/SynthesisGradeCertainty';
import { SynthesisGuidelineAlignment } from './synthesis/SynthesisGuidelineAlignment';
import { SynthesisKeyFindings } from './synthesis/SynthesisKeyFindings';
import { SynthesisLimitationsGaps } from './synthesis/SynthesisLimitationsGaps';
import { SynthesisOverallAnswer } from './synthesis/SynthesisOverallAnswer';
import { SynthesisPaperContributions } from './synthesis/SynthesisPaperContributions';
import { SynthesisPracticeImpact } from './synthesis/SynthesisPracticeImpact';
import { SynthesisSourcePapers } from './synthesis/SynthesisSourcePapers';
import { SynthesisStatistics } from './synthesis/SynthesisStatistics';
import { SynthesisStudyDesigns } from './synthesis/SynthesisStudyDesigns';
import { SynthesisUncertainties } from './synthesis/SynthesisUncertainties';

interface SynthesisPanelProps {
  result: SynthesisResult;
  articles: Article[];
  onClose: () => void;
  onGenerateCase?: () => void;
  onSearch?: (query: string) => void;
}

const SynthesisPanelComponent: React.FC<SynthesisPanelProps> = ({ result, articles, onClose, onGenerateCase, onSearch }) => {
  const {
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
  } = useSynthesisPanel(result, articles);

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

        {(result.jobKey || claimsLoading) && (
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Grounded claims</p>
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Journal club pack</p>
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300 max-h-64 overflow-y-auto font-mono">
              {JSON.stringify(journalPack, null, 2)}
            </pre>
          </div>
        )}

        {s.clinicalActionCard && (
          <SynthesisClinicalActionCard
            card={s.clinicalActionCard}
            citationIssuePaths={citationIssuePaths}
            citationIssueErrors={citationIssueErrors}
            articles={articles}
          />
        )}

        {s.practiceImpact && (
          <SynthesisPracticeImpact
            practiceImpact={s.practiceImpact}
            citationIssuePaths={citationIssuePaths}
            citationIssueErrors={citationIssueErrors}
          />
        )}

        {s.evidenceDisagreement && (
          <SynthesisEvidenceDisagreement
            disagreement={s.evidenceDisagreement}
            articles={articles}
            citationIssuePaths={citationIssuePaths}
            citationIssueErrors={citationIssueErrors}
          />
        )}

        {(result.conflictMatrix?.length ?? 0) > 0 && (
          <ConflictMatrixPanel
            conflictMatrix={result.conflictMatrix!}
            guidelineAlignment={result.guidelineAlignment}
            articles={articles}
          />
        )}

        {s.overallAnswer && (
          <SynthesisOverallAnswer
            overallAnswer={s.overallAnswer}
            citationIssuePaths={citationIssuePaths}
            citationIssueErrors={citationIssueErrors}
          />
        )}

        <SynthesisAnswerGrounding citedCount={citedStudyIndices.size} sourceCoverage={sourceCoverage} />

        <SynthesisGradeCertainty grade={grade} gradeRationale={s.gradeRationale} />

        {!s.clinicalActionCard && s.clinicalBottomLine && (
          <SynthesisClinicalBottomLine
            clinicalBottomLine={s.clinicalBottomLine}
            citationIssuePaths={citationIssuePaths}
            citationIssueErrors={citationIssueErrors}
          />
        )}

        {s.clinicalImplications && (
          <SynthesisClinicalImplications
            clinicalImplications={s.clinicalImplications}
            citationIssuePaths={citationIssuePaths}
            citationIssueErrors={citationIssueErrors}
          />
        )}

        {s.agreement && s.agreement.length > 0 && (
          <SynthesisAgreement agreement={s.agreement} />
        )}

        {s.consensus && (
          <SynthesisConsensus
            consensus={s.consensus}
            citationIssuePaths={citationIssuePaths}
            citationIssueErrors={citationIssueErrors}
          />
        )}

        {totalDesigns > 0 && (
          <SynthesisStudyDesigns studyDesigns={s.studyDesigns ?? {}} totalDesigns={totalDesigns} />
        )}

        {s.keyFindings?.length > 0 && (
          <SynthesisKeyFindings
            findings={s.keyFindings}
            articles={articles}
            citationIssuePaths={citationIssuePaths}
            citationIssueErrors={citationIssueErrors}
            onOpenProvenance={openProvenanceForFinding}
          />
        )}

        {s.statistics?.length > 0 && (
          <SynthesisStatistics statistics={s.statistics} articles={articles} />
        )}

        {s.conflicts?.length > 0 && (
          <SynthesisConflicts conflicts={s.conflicts} />
        )}

        {(s.limitations || s.researchGaps) && (
          <SynthesisLimitationsGaps limitations={s.limitations} researchGaps={s.researchGaps} />
        )}

        {s.uncertainties && s.uncertainties.length > 0 && (
          <SynthesisUncertainties uncertainties={s.uncertainties} />
        )}

        {s.followUpQuestions && s.followUpQuestions.length > 0 && onSearch && (
          <SynthesisFollowUpQuestions
            questions={s.followUpQuestions}
            onSearch={onSearch}
            onClose={onClose}
          />
        )}

        {s.paperContributions && s.paperContributions.length > 0 && (
          <SynthesisPaperContributions contributions={s.paperContributions} articles={articles} />
        )}

        <SynthesisGuidelineAlignment
          alignment={alignment}
          alignmentLoading={alignmentLoading}
          alignmentError={alignmentError}
          onCheck={checkAlignment}
        />

        <SynthesisSourcePapers articles={articles} />

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
