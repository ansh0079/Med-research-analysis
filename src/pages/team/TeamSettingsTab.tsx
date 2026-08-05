import { Button } from '@components/ui/Button';
import type { Team } from '@types';

export function TeamSettingsTab({
  activeTeam,
  userRole,
  teamRename,
  onTeamRenameChange,
  onRenameTeam,
  onPlanChange,
}: {
  activeTeam: Team;
  userRole: string;
  teamRename: string;
  onTeamRenameChange: (value: string) => void;
  onRenameTeam: () => void;
  onPlanChange: (plan: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
      <h3 className="font-bold text-gray-900 dark:text-white mb-4">Team Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={teamRename}
              onChange={(e) => onTeamRenameChange(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <Button variant="secondary" onClick={onRenameTeam}>
              Save name
            </Button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
          <select
            value={activeTeam.plan}
            onChange={(e) => onPlanChange(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="free">Free (3 members)</option>
            <option value="pro">Pro (10 members)</option>
            <option value="enterprise">Enterprise (unlimited)</option>
          </select>
        </div>
        {userRole === 'owner' && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Transfer ownership and billing changes can be layered on next; for deanery rollouts, designate one owner per workspace.
          </p>
        )}
      </div>
    </div>
  );
}
