import { Button } from '@components/ui/Button';
import type { TeamMember } from '@types';
import type { MemberRow } from './types';
import { memberUserId } from './teamUtils';

export function TeamMembersTab({
  members,
  userRole,
  userId,
  inviteEmail,
  lastInviteLink,
  onInviteEmailChange,
  onInvite,
  onMemberRoleChange,
  onRemoveMember,
}: {
  members: TeamMember[];
  userRole: string;
  userId?: string;
  inviteEmail: string;
  lastInviteLink: string | null;
  onInviteEmailChange: (value: string) => void;
  onInvite: () => void;
  onMemberRoleChange: (row: MemberRow, role: 'member' | 'admin') => void;
  onRemoveMember: (row: MemberRow) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
      {(userRole === 'owner' || userRole === 'admin') && (
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 space-y-3">
          <div className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => onInviteEmailChange(e.target.value)}
              placeholder="colleague@university.edu"
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <Button variant="primary" onClick={onInvite} leftIcon={<i className="fas fa-envelope" />}>
              Invite
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            After inviting, copy the link below and send it by hospital email. The colleague must sign in (or create an account with the same email) before accepting.
          </p>
          {lastInviteLink && (
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 px-3 py-2 text-xs">
              <span className="font-bold text-indigo-800 dark:text-indigo-200">Invitation link</span>
              <input
                readOnly
                value={lastInviteLink}
                className="mt-1 w-full px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200"
                onFocus={(e) => e.target.select()}
              />
            </div>
          )}
        </div>
      )}
      <div className="divide-y divide-gray-100 dark:divide-slate-700">
        {members.map((member) => {
          const row = member as MemberRow;
          const uid = memberUserId(row);
          const isSelf = userId === uid;
          return (
            <div key={uid} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                  <i className="fas fa-user text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{member.name || member.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {userRole === 'owner' && row.role !== 'owner' && (
                  <select
                    title="Member role"
                    className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    value={row.role === 'admin' ? 'admin' : 'member'}
                    onChange={(e) => onMemberRoleChange(row, e.target.value as 'member' | 'admin')}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
                {(userRole === 'owner' || userRole === 'admin') && row.role !== 'owner' && !isSelf && (
                  <button
                    type="button"
                    onClick={() => onRemoveMember(row)}
                    className="text-xs font-bold text-red-600 dark:text-red-400 px-2 py-1"
                  >
                    Remove
                  </button>
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                  member.role === 'owner' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                    : member.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {member.role}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
