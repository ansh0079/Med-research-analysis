import React from 'react';
import { VerificationBadge } from '@components/ui/VerificationBadge';
import type { ClaimRow as ClaimRowData } from './observabilityTypes';

export function ClaimRow({ claim }: { claim: ClaimRowData }) {
  return (
    <li className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <p className="text-slate-700 dark:text-slate-200 leading-snug">{claim.claimText}</p>
        <VerificationBadge status={claim.verificationStatus} />
      </div>
    </li>
  );
}
