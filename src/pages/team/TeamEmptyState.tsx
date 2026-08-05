import { Button } from '@components/ui/Button';

export function TeamEmptyState({
  newTeamName,
  onNewTeamNameChange,
  onCreateTeam,
}: {
  newTeamName: string;
  onNewTeamNameChange: (value: string) => void;
  onCreateTeam: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Your First Team</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Start collaborating by creating a team workspace for your research group.</p>
      <div className="flex gap-3">
        <input
          type="text"
          value={newTeamName}
          onChange={(e) => onNewTeamNameChange(e.target.value)}
          placeholder="Team name (e.g., Oncology Research Group)"
          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <Button variant="primary" onClick={onCreateTeam} leftIcon={<i className="fas fa-plus" />}>
          Create Team
        </Button>
      </div>
    </div>
  );
}
