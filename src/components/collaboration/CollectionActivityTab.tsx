import React, { useState, useEffect } from 'react';
import { api } from '@services/api';
import type { CollabActivity } from '@types';

interface Props {
  collectionId: string;
}

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

const ACTIVITY_ICONS: Record<string, string> = {
  collection_created: 'fa-plus-circle',
  collection_updated: 'fa-pen',
  collection_shared: 'fa-share-alt',
  article_added: 'fa-file-circle-plus',
  article_removed: 'fa-file-circle-minus',
  comment_added: 'fa-comment',
  comment_replied: 'fa-reply',
  comment_resolved: 'fa-check-circle',
  member_joined: 'fa-user-plus',
  member_left: 'fa-user-minus',
  permission_changed: 'fa-user-shield',
};

function formatActivityMessage(activity: CollabActivity): string {
  const who = activity.userName || 'Someone';
  const meta = activity.metadata || {};
  switch (activity.type) {
    case 'collection_created': return `${who} created this collection`;
    case 'collection_updated': return `${who} updated this collection`;
    case 'collection_shared': return `${who} shared this collection with ${String(meta.invitee || 'someone')}`;
    case 'article_added': return `${who} added an article`;
    case 'article_removed': return `${who} removed an article`;
    case 'comment_added': return `${who} commented`;
    case 'comment_replied': return `${who} replied to a comment`;
    case 'comment_resolved': return `${who} resolved a comment`;
    case 'member_joined': return `${who} joined this collection`;
    case 'member_left': return `${who} left this collection`;
    case 'permission_changed': return `${who} changed a member's permission`;
    default: return `${who} performed an action`;
  }
}

export const CollectionActivityTab: React.FC<Props> = ({ collectionId }) => {
  const [activity, setActivity] = useState<CollabActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.collaboration.getActivity({ collectionId, limit: 50 })
      .then(setActivity)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [collectionId]);

  if (loading) {
    return (
      <div className="text-center py-8 text-slate-400">
        <i className="fas fa-spinner fa-spin text-xl" />
      </div>
    );
  }

  if (activity.length === 0) {
    return <p className="text-sm text-center text-slate-400 py-8 px-5">No activity yet.</p>;
  }

  return (
    <div className="p-5 space-y-1">
      {activity.map((a) => (
        <div key={a.id} className="flex items-start gap-3 py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
            <i className={`fas ${ACTIVITY_ICONS[a.type] || 'fa-circle'} text-[10px] text-slate-500`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-700 dark:text-slate-200">{formatActivityMessage(a)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(a.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
