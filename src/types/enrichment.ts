export type EnrichmentJobStatus = 'pending' | 'running' | 'ready' | 'failed' | 'timed_out';

export const TERMINAL_ENRICHMENT_STATUSES: readonly EnrichmentJobStatus[] = ['ready', 'failed', 'timed_out'];

export function isEnrichmentTerminal(status?: string | null): boolean {
  return status === 'ready' || status === 'failed' || status === 'timed_out';
}
