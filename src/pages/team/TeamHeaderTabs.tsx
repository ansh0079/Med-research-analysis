import type { Team, TeamMember } from '@types';
import type { TeamTab } from './types';

export function TeamHeaderTabs({
  activeTeam,
  members,
  tab,
  onTabChange,
}: {
  activeTeam: Team;
  members: TeamMember[];
  tab: TeamTab;
  onTabChange: (tab: TeamTab) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">{activeTeam.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {members.length} members • {activeTeam.plan} plan
          </p>
        </div>
        <div className="flex gap-2">
          {(['collections', 'members', 'assignments', 'activity', 'settings'] as const).map(t => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
