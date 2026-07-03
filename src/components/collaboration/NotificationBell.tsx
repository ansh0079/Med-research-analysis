import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@services/api';
import { useCollectionDrawer } from '@contexts/CollectionDrawerContext';
import type { CollabNotification, CollabInvitation } from '@types';

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const NotificationBell: React.FC = () => {
  const { openCollection } = useCollectionDrawer();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<CollabNotification[]>([]);
  const [invitations, setInvitations] = useState<CollabInvitation[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(() => {
    api.getNotifications().then(setNotifications).catch(() => {});
    api.getInvitations().then(setInvitations).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [refresh]);

  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');
  const unreadCount = notifications.filter((n) => !n.isRead).length + pendingInvitations.length;

  const handleNotificationClick = async (notification: CollabNotification) => {
    if (!notification.isRead) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
      api.markNotificationRead(notification.id).catch(() => {});
    }
    if (notification.relatedCollectionId) {
      openCollection(notification.relatedCollectionId);
      setOpen(false);
    }
  };

  const handleAccept = async (invitationId: string) => {
    try {
      await api.acceptCollabInvitation(invitationId);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      refresh();
    } catch {
      // Leave the invitation in the list; user can retry.
    }
  };

  const handleDecline = async (invitationId: string) => {
    try {
      await api.declineCollabInvitation(invitationId);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch {
      // Leave the invitation in the list; user can retry.
    }
  };

  const closeMenuOnFocusLeave = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef} onBlur={closeMenuOnFocusLeave}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="notification-menu"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        className="relative w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <i className="fas fa-bell text-sm" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-menu"
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-80 max-h-[28rem] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-200/60 dark:shadow-slate-900/80 border border-slate-100 dark:border-slate-700 py-1.5 z-50 animate-fade-in"
        >
          {pendingInvitations.length > 0 && (
            <>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3.5 pt-1 pb-1.5">
                Pending Invitations
              </div>
              {pendingInvitations.map((inv) => (
                <div key={inv.id} className="px-3.5 py-2 border-b border-slate-50 dark:border-slate-700/60">
                  <p className="text-xs text-slate-700 dark:text-slate-200">
                    <span className="font-semibold">{inv.invited_by_name || 'Someone'}</span> invited you to{' '}
                    <span className="font-semibold">{inv.collection_name || 'a collection'}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{inv.permission} access</p>
                  <div className="flex gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => handleAccept(inv.id)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecline(inv.id)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
            </>
          )}

          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3.5 pt-1 pb-1.5">
            Notifications
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-center text-slate-400 py-6">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                role="menuitem"
                onClick={() => handleNotificationClick(n)}
                className={`flex flex-col items-start w-full px-3.5 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/60 ${
                  n.isRead ? '' : 'bg-indigo-50/60 dark:bg-indigo-900/10'
                }`}
              >
                <span className="text-xs text-slate-700 dark:text-slate-200">{n.title}</span>
                {n.body && <span className="text-[11px] text-slate-400 mt-0.5">{n.body}</span>}
                <span className="text-[10px] text-slate-300 dark:text-slate-500 mt-1">{timeAgo(n.createdAt)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
