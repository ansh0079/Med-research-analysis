import { useCallback, useEffect, useState } from 'react';
import { api } from '@services/api';
import {
  readPendingSynthesisJobs,
  removePendingSynthesisJob,
  type PendingSynthesisJobEntry,
} from '@utils/pendingSynthesisJobs';

export interface DashboardSynthesisJob {
  jobKey: string;
  topic: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  updatedAt: string;
  errorMessage?: string | null;
}

export function usePendingSynthesisJobs(enabled: boolean, pollMs = 8000) {
  const [jobs, setJobs] = useState<DashboardSynthesisJob[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setJobs([]);
      setLoading(false);
      return;
    }
    try {
      const { jobs: serverJobs } = await api.ai.listAiGenerationJobs({
        status: 'queued,running',
        jobType: 'full_synthesis',
        limit: 12,
      });
      const localJobs = readPendingSynthesisJobs().filter(
        (j) => j.status === 'queued' || j.status === 'running'
      );
      const seen = new Set<string>();
      const merged: DashboardSynthesisJob[] = [];
      for (const job of serverJobs) {
        if (!job.jobKey || seen.has(job.jobKey)) continue;
        seen.add(job.jobKey);
        merged.push({
          jobKey: job.jobKey,
          topic: job.topic || 'Evidence synthesis',
          status: job.status as DashboardSynthesisJob['status'],
          updatedAt: job.updatedAt,
          errorMessage: job.errorMessage,
        });
        if (job.status === 'completed' || job.status === 'failed') {
          removePendingSynthesisJob(job.jobKey);
        }
      }
      for (const job of localJobs) {
        if (seen.has(job.jobKey)) continue;
        seen.add(job.jobKey);
        merged.push({
          jobKey: job.jobKey,
          topic: job.topic,
          status: job.status,
          updatedAt: job.updatedAt,
        });
      }
      setJobs(merged.slice(0, 8));
    } catch {
      setJobs(
        readPendingSynthesisJobs()
          .filter((j) => j.status === 'queued' || j.status === 'running')
          .map((j: PendingSynthesisJobEntry) => ({
            jobKey: j.jobKey,
            topic: j.topic,
            status: j.status,
            updatedAt: j.updatedAt,
          }))
      );
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
    if (!enabled) return undefined;
    const id = window.setInterval(() => { void refresh(); }, pollMs);
    return () => window.clearInterval(id);
  }, [enabled, pollMs, refresh]);

  return { jobs, loading, refresh };
}
