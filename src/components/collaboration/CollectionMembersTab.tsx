import React, { useState } from 'react';
import { api } from '@services/api';
import { Button } from '@components/ui/Button';
import type { CollectionDetail } from '@types';

interface Props {
  collection: CollectionDetail;
  currentUserId: string;
  onChanged: () => void;
}

export const CollectionMembersTab: React.FC<Props> = ({ collection, currentUserId, onChanged }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<'read' | 'write' | 'admin'>('read');
  const [inviting, setInviting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const selfPermission = collection.collaborators.find((c) => c.userId === currentUserId)?.permission;
  const canManage = collection.ownerId === currentUserId || selfPermission === 'admin';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError('');
    try {
      await api.shareCollection(collection.id, inviteEmail.trim(), invitePermission);
      setSuccessMsg(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setError('Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  const handlePermissionChange = async (userId: string, permission: 'read' | 'write' | 'admin') => {
    try {
      await api.updateCollectionMemberPermission(collection.id, userId, permission);
      onChanged();
    } catch {
      setError('Failed to update permission.');
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await api.removeCollectionMember(collection.id, userId);
      onChanged();
    } catch {
      setError('Failed to remove member.');
    }
  };

  return (
    <div className="p-5 space-y-4">
      {canManage && (
        <form onSubmit={handleInvite} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Invite by email
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={invitePermission}
              onChange={(e) => setInvitePermission(e.target.value as 'read' | 'write' | 'admin')}
              className="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white"
            >
              <option value="read">Read</option>
              <option value="write">Write</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" variant="primary" size="sm" fullWidth isLoading={inviting}>
            Invite
          </Button>
          {successMsg && <p className="text-xs text-emerald-600 dark:text-emerald-400">{successMsg}</p>}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </form>
      )}

      <div className="space-y-2">
        {/* Owner row */}
        <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {(collection.ownerName?.[0] || '?').toUpperCase()}
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{collection.ownerName || 'Owner'}</p>
          </div>
          <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 shrink-0">
            Owner
          </span>
        </div>

        {collection.collaborators.map((c) => (
          <div key={c.userId} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-[10px] font-bold shrink-0">
                {(c.name?.[0] || c.email?.[0] || '?').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name || c.email}</p>
                {c.email && <p className="text-xs text-slate-400 truncate">{c.email}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canManage ? (
                <>
                  <select
                    title="Member permission"
                    value={c.permission}
                    onChange={(e) => handlePermissionChange(c.userId, e.target.value as 'read' | 'write' | 'admin')}
                    className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="read">Read</option>
                    <option value="write">Write</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemove(c.userId)}
                    className="text-xs font-bold text-red-600 dark:text-red-400 px-2 py-1"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                  {c.permission}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
