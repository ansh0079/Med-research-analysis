import React from 'react';
import type { CaseStepResponse } from '@types';
import { STEP_TYPE_LABELS } from './caseConstants';

export function StepProgressBar({ steps, currentStep, responses }: {
  steps: Array<{ type: string }>;
  currentStep: number;
  responses: CaseStepResponse[];
}) {
  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, i) => {
        const responded = responses[i];
        const isCurrent = i === currentStep;
        const meta = STEP_TYPE_LABELS[step.type] || STEP_TYPE_LABELS.presentation;
        let bgColor = 'bg-slate-200 dark:bg-slate-700';
        if (responded?.isCorrect === true) bgColor = 'bg-emerald-500';
        else if (responded?.isCorrect === false) bgColor = 'bg-red-400';
        else if (isCurrent) bgColor = 'bg-blue-500 animate-pulse';
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={`h-2 w-full rounded-full ${bgColor} transition-colors`} />
            <span className={`text-[9px] font-medium ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
              <i className={`fas ${meta.icon} mr-0.5`} />{meta.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
