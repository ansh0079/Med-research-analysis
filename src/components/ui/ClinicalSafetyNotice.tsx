import React from 'react';
import { VerificationBadge } from './VerificationBadge';

interface ClinicalSafetyNoticeProps {
  className?: string;
  status?: string | null;
  showDisclaimer?: boolean;
}

export function ClinicalSafetyNotice({ className = '', status, showDisclaimer = true }: ClinicalSafetyNoticeProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 ${className}`}>
      {status ? <VerificationBadge status={status} /> : null}
      {showDisclaimer ? (
        <span>AI-generated — verify against primary sources and local guidelines before clinical use.</span>
      ) : null}
    </div>
  );
}
