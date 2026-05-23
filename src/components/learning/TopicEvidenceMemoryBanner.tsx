import React from 'react';

export type EvidenceMemoryMessage = {
  key: string;
  text: string;
  tone: 'positive' | 'neutral' | 'warning';
};

interface TopicEvidenceMemoryBannerProps {
  messages: EvidenceMemoryMessage[];
  className?: string;
}

const TONE_STYLE: Record<EvidenceMemoryMessage['tone'], string> = {
  positive: 'text-emerald-700 dark:text-emerald-300',
  neutral: 'text-slate-600 dark:text-slate-300',
  warning: 'text-amber-700 dark:text-amber-300',
};

const TONE_ICON: Record<EvidenceMemoryMessage['tone'], string> = {
  positive: 'fa-database',
  neutral: 'fa-circle-info',
  warning: 'fa-triangle-exclamation',
};

export function TopicEvidenceMemoryBanner({ messages, className = '' }: TopicEvidenceMemoryBannerProps) {
  if (!messages?.length) return null;
  return (
    <div
      className={`neo-card rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2 ${className}`}
      aria-label="Evidence memory for this topic"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Evidence memory</p>
      <ul className="space-y-1.5">
        {messages.map((msg) => (
          <li key={msg.key} className={`flex items-start gap-2 text-sm ${TONE_STYLE[msg.tone]}`}>
            <i className={`fas ${TONE_ICON[msg.tone]} text-xs mt-0.5 shrink-0 opacity-80`} aria-hidden />
            <span>{msg.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
