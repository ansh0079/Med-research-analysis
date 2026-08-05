import { RobPanel } from '@components/review/RobPanel';
import type { ReviewArticle, ROBResult } from '@types';

export function ReviewRobTab({
  reviewId,
  rows,
  robById,
  onResult,
}: {
  reviewId: string;
  rows: ReviewArticle[];
  robById: Record<string, ROBResult>;
  onResult: (articleId: string, rob: ROBResult) => void;
}) {
  const included = rows.filter((r) => r.screening_status === 'included');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-gray-900 dark:text-white">Risk of Bias — Cochrane RoB 2</h3>
          <p className="text-xs text-slate-400 mt-0.5">Assessments run per article. Click "Assess" on each study below.</p>
        </div>
      </div>
      {included.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">Include at least one article in the Screening tab to assess risk of bias.</p>
      ) : (
        included.map((row) => (
          <RobPanel
            key={row.article_id}
            reviewId={reviewId}
            row={row}
            cachedRob={robById[row.article_id] ?? null}
            onResult={onResult}
          />
        ))
      )}
    </div>
  );
}
