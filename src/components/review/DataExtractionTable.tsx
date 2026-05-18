import React from 'react';
import type { ReviewArticle, PicoExtraction } from '@types';

interface Props {
  rows: ReviewArticle[];
  picoByArticleId: Record<string, PicoExtraction | undefined>;
}

const empty = '-';

export const DataExtractionTable: React.FC<Props> = ({ rows, picoByArticleId }) => {
  return (
    <div className="neo-card rounded-2xl p-4 overflow-auto">
      <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3">Data Extraction</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400">
            <th className="py-2 pr-3">Article</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Population</th>
            <th className="py-2 pr-3">Intervention</th>
            <th className="py-2 pr-3">Outcomes</th>
            <th className="py-2 pr-3">Risk / Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const pico = picoByArticleId[row.article_id];
            return (
              <tr key={row.article_id} className="border-t border-gray-100 dark:border-slate-700">
                <td className="py-2 pr-3 align-top max-w-[260px]">{row.article_data?.title || row.article_id}</td>
                <td className="py-2 pr-3 align-top">{row.screening_status}</td>
                <td className="py-2 pr-3 align-top">{pico?.population || empty}</td>
                <td className="py-2 pr-3 align-top">{pico?.intervention || empty}</td>
                <td className="py-2 pr-3 align-top">{pico?.outcomes?.join('; ') || empty}</td>
                <td className="py-2 pr-3 align-top">
                  <div className="space-y-1">
                    {row.article_data?._quality?.grade && <p>Quality {row.article_data._quality.grade}</p>}
                    {row.article_data?._retraction?.isRetracted && <p className="text-red-600 dark:text-red-300">Retracted</p>}
                    {row.exclusion_reason && <p>Exclusion: {row.exclusion_reason}</p>}
                    {row.notes && <p>Notes: {row.notes}</p>}
                    {!row.article_data?._quality?.grade && !row.article_data?._retraction?.isRetracted && !row.exclusion_reason && !row.notes && empty}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
