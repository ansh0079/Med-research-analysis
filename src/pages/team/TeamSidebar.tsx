import { Button } from '@components/ui/Button';
import type { Team } from '@types';

export function TeamSidebar({
  teams,
  activeTeam,
  newTeamName,
  onSelectTeam,
  onNewTeamNameChange,
  onCreateTeam,
}: {
  teams: Team[];
  activeTeam: Team | null;
  newTeamName: string;
  onSelectTeam: (team: Team) => void;
  onNewTeamNameChange: (value: string) => void;
  onCreateTeam: () => void;
}) {
  return (
    <div className="lg:col-span-1 space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Your Teams</h3>
        <div className="space-y-2">
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => onSelectTeam(team)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTeam?.id === team.id
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{team.name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{team.plan}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => onNewTeamNameChange(e.target.value)}
            placeholder="New team name"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none mb-2"
          />
          <Button variant="secondary" size="sm" className="w-full" onClick={onCreateTeam} leftIcon={<i className="fas fa-plus" />}>
            Create Team
          </Button>
        </div>
      </div>
    </div>
  );
}
