import React from 'react';
import type { AgentGuidance, ClinicalAnswer, ProactiveAlert } from '@types';
import { TopicBriefClinicalAnswerPanel } from './TopicBriefClinicalAnswerPanel';

interface Props {
  liveClinicalAnswer?: ClinicalAnswer | null;
  agentGuidance?: AgentGuidance | null;
  aiEnrichmentLoading?: boolean;
  aiEnrichmentFailed?: boolean;
  proactiveAlert?: ProactiveAlert | null;
  onQuiz: () => void;
}

export const TopicBriefClinicalAnswerBlock: React.FC<Props> = ({
  liveClinicalAnswer,
  agentGuidance,
  aiEnrichmentLoading,
  aiEnrichmentFailed,
  proactiveAlert,
  onQuiz,
}) => (
  <>
    {liveClinicalAnswer && (
      <TopicBriefClinicalAnswerPanel ca={liveClinicalAnswer} proactiveAlert={proactiveAlert} onQuizUpdate={onQuiz} />
    )}
    {!liveClinicalAnswer && agentGuidance?.clinicalAnswer && (
      <TopicBriefClinicalAnswerPanel ca={agentGuidance.clinicalAnswer} proactiveAlert={proactiveAlert} onQuizUpdate={onQuiz} />
    )}
    {!liveClinicalAnswer && !agentGuidance?.clinicalAnswer && aiEnrichmentFailed && (
      <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
          Live clinical analysis could not be generated. Review the source papers directly.
        </div>
      </div>
    )}
    {!liveClinicalAnswer && !agentGuidance?.clinicalAnswer && aiEnrichmentLoading && !aiEnrichmentFailed && (
      <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
        <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
          <i className="fas fa-circle-notch fa-spin text-indigo-400" />
          <span>Generating clinical analysis…</span>
        </div>
      </div>
    )}

    {agentGuidance?.contradictions && agentGuidance.contradictions.length > 0 && (
      <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
        <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
          <i className="fas fa-scale-unbalanced text-[10px]" />
          Evidence Contradictions
        </p>
        <div className="space-y-2">
          {agentGuidance.contradictions.map((c, i) => (
            <div key={i} className="rounded-lg bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs space-y-1">
              <p className="text-amber-900 dark:text-amber-200"><span className="font-semibold">Claim:</span> {c.claim}</p>
              <p className="text-amber-800 dark:text-amber-300"><span className="font-semibold">Counter:</span> {c.counter}</p>
              {c.clinicalImplication && (
                <p className="text-amber-700 dark:text-amber-400 italic">{c.clinicalImplication}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </>
);
