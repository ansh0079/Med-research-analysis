import { GradePanel } from '@components/review/GradePanel';
import type { GRADETable } from '@types';

export function ReviewGradeTab({
  reviewId,
  includedCount,
  gradeTable,
  onResult,
}: {
  reviewId: string;
  includedCount: number;
  gradeTable: GRADETable | null;
  onResult: (table: GRADETable) => void;
}) {
  return (
    <div className="neo-card rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-black text-gray-900 dark:text-white">GRADE Summary of Findings</h3>
        <p className="text-xs text-slate-400 mt-0.5">Generated from included articles. Requires at least 2 included studies.</p>
      </div>
      <GradePanel
        reviewId={reviewId}
        includedCount={includedCount}
        cached={gradeTable}
        onResult={onResult}
      />
    </div>
  );
}
