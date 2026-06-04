import React from 'react';
import type { TopicGuideStatus } from '@types';

interface TopicIntelligenceStatusBannerProps {
  intelligenceLoading?: boolean;
  topicGuideStatus?: TopicGuideStatus;
  variant?: 'inline' | 'card';
  className?: string;
}

function bannerMessage(intelligenceLoading: boolean, topicGuideStatus: TopicGuideStatus): string | null {
  if (intelligenceLoading) {
    return 'Personalizing topic intelligence from your learning history…';
  }
  if (topicGuideStatus === 'building') {
    return 'A mentor topic guide is being generated server-side. You can still synthesize or open Quiz/Case below.';
  }
  if (topicGuideStatus === 'pending') {
    return 'The mentor guide did not arrive in time — try Run search again in the header or open Knowledge → review.';
  }
  return null;
}

export const TopicIntelligenceStatusBanner: React.FC<TopicIntelligenceStatusBannerProps> = ({
  intelligenceLoading = false,
  topicGuideStatus = 'idle',
  variant = 'inline',
  className = '',
}) => {
  const show = intelligenceLoading || topicGuideStatus === 'building' || topicGuideStatus === 'pending';
  const message = bannerMessage(intelligenceLoading, topicGuideStatus);
  if (!show || !message) return null;

  const base =
    variant === 'card'
      ? 'rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/90 dark:bg-indigo-950/40 px-4 py-3 shadow-sm'
      : 'rounded-lg px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50';

  return (
    <p
      className={`text-xs font-semibold text-indigo-800 dark:text-indigo-200 flex items-start gap-2 ${base} ${className}`}
      role="status"
      aria-live="polite"
    >
      {(intelligenceLoading || topicGuideStatus === 'building') && (
        <span className="mt-0.5 inline-block w-2 h-2 rounded-full bg-indigo-500 shrink-0 animate-pulse" aria-hidden />
      )}
      <span>{message}</span>
    </p>
  );
};
