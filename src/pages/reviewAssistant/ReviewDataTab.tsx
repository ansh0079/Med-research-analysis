import { DataExtractionTable } from '@components/review/DataExtractionTable';
import type { PicoExtraction, ReviewArticle } from '@types';

export function ReviewDataTab({
  rows,
  picoById,
}: {
  rows: ReviewArticle[];
  picoById: Record<string, PicoExtraction>;
}) {
  return (
    <div>
      {rows.length > 0
        ? <DataExtractionTable rows={rows} picoByArticleId={picoById} />
        : <p className="text-sm text-slate-400 text-center py-10">Add articles in the Screening tab first.</p>
      }
    </div>
  );
}
