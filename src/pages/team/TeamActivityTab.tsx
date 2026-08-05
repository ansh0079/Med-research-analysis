import type { ActivityEntry } from './types';

export function TeamActivityTab({
  activityFeed,
  activityLoading,
}: {
  activityFeed: ActivityEntry[];
  activityLoading: boolean;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
      <h3 className="font-bold text-gray-900 dark:text-white mb-4">Workspace Activity</h3>
      {activityLoading ? (
        <div className="text-center py-4"><i className="fas fa-spinner fa-spin text-indigo-400" /></div>
      ) : activityFeed.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">No activity yet.</p>
      ) : (
        <div className="space-y-2">
          {activityFeed.map((entry) => (
            <div key={entry.id} className="rounded-xl bg-gray-50 dark:bg-slate-700/50 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-700 dark:text-gray-200">{entry.userName || 'Team member'}</span>
              {' · '}
              {entry.message}
              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
