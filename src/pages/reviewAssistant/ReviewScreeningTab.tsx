import { Button } from '@components/ui/Button';
import { ScreeningQueue } from '@components/review/ScreeningQueue';
import { PicoCard } from '@components/review/PicoCard';
import type { GRADETable, PicoExtraction, PrismaCounts, ReviewArticle, ReviewCriteria, ROBResult } from '@types';

export function ReviewScreeningTab({
  rows,
  criteria,
  activeUsers,
  prisma,
  picoById,
  robById,
  gradeTable,
  bulkImportText,
  loading,
  onBulkImportTextChange,
  onBulkImport,
  onExtractPico,
  onDecision,
}: {
  rows: ReviewArticle[];
  criteria: ReviewCriteria;
  activeUsers: ReturnType<typeof import('@hooks/useReviewCollaboration').useReviewCollaboration>['activeUsers'];
  prisma: PrismaCounts;
  picoById: Record<string, PicoExtraction>;
  robById: Record<string, ROBResult>;
  gradeTable: GRADETable | null;
  bulkImportText: string;
  loading: boolean;
  onBulkImportTextChange: (value: string) => void;
  onBulkImport: () => void;
  onExtractPico: () => void;
  onDecision: (articleId: string, decision: 'included' | 'excluded' | 'maybe', payload?: { exclusionReason?: string; notes?: string }) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="neo-card rounded-2xl p-4">
          <h3 className="text-sm font-black text-gray-900 dark:text-white mb-3">Bulk Import RIS / BibTeX</h3>
          <textarea
            value={bulkImportText}
            onChange={(e) => onBulkImportTextChange(e.target.value)}
            rows={5}
            placeholder="Paste RIS or BibTeX records from Zotero, Mendeley, or EndNote..."
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
          />
          <div className="flex gap-2 mt-2">
            <Button variant="secondary" size="sm" onClick={onBulkImport} disabled={!bulkImportText.trim() || loading}>
              Import Records
            </Button>
          </div>
        </div>
        <div className="neo-card rounded-2xl p-4">
          <h3 className="text-sm font-black text-gray-900 dark:text-white mb-3">PRISMA 2020 Checklist</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            {([
              ['Records identified', prisma.total > 0],
              ['Screening decisions recorded', prisma.included + prisma.excluded + prisma.maybe > 0],
              ['Exclusion reasons captured', rows.some((r) => r.exclusion_reason)],
              ['PICO data extracted', Object.keys(picoById).length > 0],
              ['Risk of bias assessed', Object.keys(robById).length > 0],
              ['GRADE table generated', !!gradeTable],
              ['Included studies ready', prisma.included > 0],
            ] as [string, boolean][]).map(([label, done]) => (
              <div key={label} className="flex items-center gap-2">
                <i className={`fas ${done ? 'fa-check text-emerald-500' : 'fa-circle text-slate-200 dark:text-slate-700'} text-xs`} aria-hidden="true" />
                <span className={done ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}>{label}</span>
              </div>
            ))}
          </div>
          <Button className="mt-3" variant="secondary" size="sm" onClick={onExtractPico} disabled={!rows.length || loading}>
            <i className="fas fa-microscope text-[10px] mr-1" aria-hidden="true" />Extract PICO
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <ScreeningQueue
            rows={rows}
            criteria={criteria}
            activeUsers={activeUsers}
            onDecision={onDecision}
          />
          <div className="space-y-3">
            {rows.slice(0, 6).map((row) => (
              <PicoCard key={row.article_id} articleId={row.article_id} extraction={picoById[row.article_id]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
