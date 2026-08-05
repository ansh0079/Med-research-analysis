import { Button } from '@components/ui/Button';
import type { TeamMember } from '@types';
import type { MemberRow, TeamAssignment } from './types';
import { memberUserId } from './teamUtils';

export function TeamAssignmentsTab({
  members,
  userRole,
  assignmentTitle,
  assignmentMember,
  assignmentDue,
  assignments,
  assignmentsLoading,
  onAssignmentTitleChange,
  onAssignmentMemberChange,
  onAssignmentDueChange,
  onCreateAssignment,
  onDeleteAssignment,
}: {
  members: TeamMember[];
  userRole: string;
  assignmentTitle: string;
  assignmentMember: string;
  assignmentDue: string;
  assignments: TeamAssignment[];
  assignmentsLoading: boolean;
  onAssignmentTitleChange: (value: string) => void;
  onAssignmentMemberChange: (value: string) => void;
  onAssignmentDueChange: (value: string) => void;
  onCreateAssignment: () => void;
  onDeleteAssignment: (assignmentId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {(userRole === 'owner' || userRole === 'admin') && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Create Assignment</h3>
          <div className="grid gap-3 md:grid-cols-[1fr_0.8fr_0.5fr_auto]">
            <input
              value={assignmentTitle}
              onChange={(e) => onAssignmentTitleChange(e.target.value)}
              placeholder="Paper, collection, or screening task"
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <select
              title="Assign reviewer"
              value={assignmentMember}
              onChange={(e) => onAssignmentMemberChange(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={memberUserId(member as MemberRow)} value={memberUserId(member as MemberRow)}>
                  {member.name || member.email}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={assignmentDue}
              onChange={(e) => onAssignmentDueChange(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <Button variant="primary" onClick={onCreateAssignment} leftIcon={<i className="fas fa-user-check" />}>
              Assign
            </Button>
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <h3 className="font-bold text-gray-900 dark:text-white">Current Assignments</h3>
        </div>
        {assignmentsLoading ? (
          <div className="p-6 text-center"><i className="fas fa-spinner fa-spin text-indigo-400" /></div>
        ) : assignments.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 dark:text-gray-500">No assignments yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {assignments.map((a) => (
              <div key={a.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{a.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {a.assigneeName ? `Assigned to ${a.assigneeName}` : 'Unassigned'}
                    {a.dueDate ? ` · due ${a.dueDate}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${a.status === 'open' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                    {a.status}
                  </span>
                  {(userRole === 'owner' || userRole === 'admin') && (
                    <button
                      type="button"
                      onClick={() => onDeleteAssignment(a.id)}
                      className="text-xs text-red-500 dark:text-red-400 font-bold"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
