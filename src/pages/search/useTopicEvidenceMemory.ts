import { useEffect, useState } from 'react';
import { api } from '@services/api';
import type { TopicEvidenceMemory } from '@types';

interface UseTopicEvidenceMemoryOptions {
  topic: string;
  isAuthenticated: boolean;
  resultsCount: number;
}

export function useTopicEvidenceMemory({ topic, isAuthenticated, resultsCount }: UseTopicEvidenceMemoryOptions) {
  const [topicEvidenceMemory, setTopicEvidenceMemory] = useState<TopicEvidenceMemory | null>(null);

  useEffect(() => {
    let cancelled = false;
    const normalizedTopic = topic.trim();

    if (!isAuthenticated || normalizedTopic.length < 2 || resultsCount === 0) {
      void Promise.resolve().then(() => {
        if (!cancelled) setTopicEvidenceMemory(null);
      });
      return () => { cancelled = true; };
    }

    api.knowledge.getTopicEvidenceMemory(normalizedTopic)
      .then((response) => {
        if (!cancelled) setTopicEvidenceMemory(response.memory);
      })
      .catch(() => {
        if (!cancelled) setTopicEvidenceMemory(null);
      });

    return () => { cancelled = true; };
  }, [topic, isAuthenticated, resultsCount]);

  return topicEvidenceMemory;
}
