import React from 'react';

const LADDER_DEFS = [
  { tier: 'generated', label: 'Generated claim', statuses: ['unverified', 'agent_draft', 'synthesis_inferred'] },
  { tier: 'abstract_only', label: 'Abstract only', statuses: ['abstract_only'] },
  { tier: 'full_text_verified', label: 'Full-text verified', statuses: ['full_text_available', 'source_verified'] },
  { tier: 'guideline_supported', label: 'Guideline supported', statuses: ['guideline_supported', 'guideline_uncertain', 'guideline_conflict'] },
  { tier: 'curator_reviewed', label: 'Curator reviewed', statuses: ['human_reviewed'] },
] as const;

export function trustLadderFromVerificationStatus(status?: string | null): TrustLadderStep[] {
  const s = String(status || 'unverified').trim() || 'unverified';
  const isStale = s === 'stale_needs_refresh';
  let currentTier = 'generated';
  for (const def of LADDER_DEFS) {
    if ((def.statuses as readonly string[]).includes(s)) {
      currentTier = def.tier;
      break;
    }
  }
  const currentIdx = LADDER_DEFS.findIndex((d) => d.tier === currentTier);
  return LADDER_DEFS.map((def, idx) => ({
    tier: def.tier,
    label: def.label,
    reached: idx < currentIdx || (idx === currentIdx && !isStale),
    current: idx === currentIdx,
    stale: idx === currentIdx && isStale,
  }));
}

export type TrustLadderStep = {
  tier: string;
  label: string;
  description?: string;
  reached: boolean;
  current: boolean;
  stale?: boolean;
};

interface ClaimTrustLadderProps {
  steps: TrustLadderStep[];
  compact?: boolean;
  className?: string;
}

export function ClaimTrustLadder({ steps, compact = false, className = '' }: ClaimTrustLadderProps) {
  if (!steps?.length) return null;
  return (
    <div className={`${className}`} role="list" aria-label="Claim trust ladder">
      <ol className={`flex ${compact ? 'flex-wrap gap-1.5' : 'flex-col gap-2'}`}>
        {steps.map((step) => {
          const done = step.reached && !step.stale;
          const current = step.current;
          return (
            <li
              key={step.tier}
              role="listitem"
              className={`flex items-start gap-2 ${compact ? 'rounded-full px-2 py-0.5 text-[9px]' : 'rounded-lg px-2.5 py-1.5 text-[10px]'} font-semibold uppercase tracking-wide border ${
                current
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : done
                    ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'border-slate-200 bg-slate-50/60 text-slate-400 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-500'
              }`}
              title={step.description}
            >
              <i
                className={`fas mt-0.5 shrink-0 ${step.stale ? 'fa-clock text-amber-500' : done ? 'fa-check-circle text-emerald-500' : current ? 'fa-circle-dot text-indigo-500' : 'fa-circle text-slate-300'}`}
                aria-hidden
              />
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

