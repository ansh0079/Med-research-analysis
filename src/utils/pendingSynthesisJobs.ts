export const PENDING_SYNTHESIS_JOBS_KEY = 'med_pending_synthesis_jobs';

export interface PendingSynthesisJobEntry {
  jobKey: string;
  topic: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  updatedAt: string;
}

export function readPendingSynthesisJobs(): PendingSynthesisJobEntry[] {
  try {
    const raw = localStorage.getItem(PENDING_SYNTHESIS_JOBS_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function registerPendingSynthesisJob(entry: { jobKey: string; topic?: string | null; status?: string }) {
  const jobKey = String(entry.jobKey || '').trim();
  if (!jobKey) return;
  const status = (entry.status === 'running' ? 'running' : 'queued') as PendingSynthesisJobEntry['status'];
  const next: PendingSynthesisJobEntry = {
    jobKey,
    topic: String(entry.topic || 'Evidence synthesis').trim(),
    status,
    updatedAt: new Date().toISOString(),
  };
  const merged = [
    next,
    ...readPendingSynthesisJobs().filter((j) => j.jobKey !== jobKey),
  ].slice(0, 12);
  try {
    localStorage.setItem(PENDING_SYNTHESIS_JOBS_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
}

export function removePendingSynthesisJob(jobKey: string) {
  const trimmed = String(jobKey || '').trim();
  if (!trimmed) return;
  const merged = readPendingSynthesisJobs().filter((j) => j.jobKey !== trimmed);
  try {
    localStorage.setItem(PENDING_SYNTHESIS_JOBS_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
}
