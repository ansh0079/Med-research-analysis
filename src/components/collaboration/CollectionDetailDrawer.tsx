import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@services/api';
import { useAuth } from '@contexts/AuthContext';
import { LoadingState, ErrorState } from '@components/ui/StateViews';
import { CollectionMembersTab } from './CollectionMembersTab';
import { CollectionCommentsTab } from './CollectionCommentsTab';
import { CollectionActivityTab } from './CollectionActivityTab';
import type { CollectionDetail } from '@types';

interface Props {
  collectionId: string | null;
  onClose: () => void;
}

type Tab = 'articles' | 'members' | 'comments' | 'activity';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'articles', label: 'Articles', icon: 'fa-file-alt' },
  { key: 'members', label: 'Members', icon: 'fa-users' },
  { key: 'comments', label: 'Comments', icon: 'fa-comments' },
  { key: 'activity', label: 'Activity', icon: 'fa-stream' },
];

export const CollectionDetailDrawer: React.FC<Props> = ({ collectionId, onClose }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('articles');
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!collectionId) return;
    setLoading(true);
    setError('');
    api.getCollection(collectionId)
      .then(setCollection)
      .catch(() => setError('Failed to load collection.'))
      .finally(() => setLoading(false));
  }, [collectionId]);

  useEffect(() => {
    setTab('articles');
    setCollection(null);
    load();
  }, [collectionId, load]);

  if (!collectionId) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-[70] flex flex-col w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl border-l border-gray-200 dark:border-slate-700 animate-slide-in-right">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
              {collection?.name || 'Collection'}
            </h2>
            {collection?.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                {collection.description}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} title="Close"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1">
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5">
          {TABS.map((t) => (
            <button key={t.key} type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === t.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <i className={`fas ${t.icon} text-[10px]`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading && <LoadingState message="Loading collection…" />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && collection && (
          <>
            {tab === 'articles' && (
              <div className="p-5 space-y-2">
                {collection.articles.length === 0 ? (
                  <p className="text-sm text-center text-slate-400 py-8">No articles in this collection yet.</p>
                ) : (
                  collection.articles.map((entry) => (
                    <div key={entry.articleId} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                      <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">
                        {(entry.article as { title?: string })?.title || entry.articleId}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{entry.notes}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            {tab === 'members' && user && (
              <CollectionMembersTab collection={collection} currentUserId={user.id} onChanged={load} />
            )}
            {tab === 'comments' && (
              <CollectionCommentsTab collectionId={collection.id} currentUserId={user?.id || ''} />
            )}
            {tab === 'activity' && (
              <CollectionActivityTab collectionId={collection.id} />
            )}
          </>
        )}
      </div>
    </div>
  );
};
