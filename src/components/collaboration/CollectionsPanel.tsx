import React, { useState, useEffect } from 'react';
import { api } from '@services/api';
import { useAuth } from '@contexts/AuthContext';
import { useNavigatePage } from '@contexts/SearchContext';
import { useCollectionDrawer } from '@contexts/CollectionDrawerContext';
import { Button } from '@components/ui/Button';
import type { CollectionSummary, Article } from '@types';

interface CollectionsPanelProps {
  articleToAdd?: Article | null;
  onClose: () => void;
}

export const CollectionsPanel: React.FC<CollectionsPanelProps> = ({ articleToAdd, onClose }) => {
  const { isAuthenticated, user } = useAuth();
  const setCurrentPage = useNavigatePage();
  const { openCollection } = useCollectionDrawer();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const result = await api.getCollections();
        if (!cancelled) setCollections(result.collections || []);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.message === 'AUTH_REQUIRED') {
          setError('auth');
        } else {
          setError('Failed to load collections.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const result = await api.createCollection(newName.trim(), newDesc.trim() || undefined);
      setCollections((prev) => [result.collection, ...prev]);
      setNewName('');
      setNewDesc('');
      setCreating(false);
    } catch {
      setError('Failed to create collection.');
      setCreating(false);
    }
  };

  const handleAddArticle = async (collectionId: string) => {
    if (!articleToAdd) return;
    setAddingTo(collectionId);
    try {
      await api.addArticleToCollection(collectionId, articleToAdd);
      setSuccessMsg('Article added to collection!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to add article.');
    } finally {
      setAddingTo(null);
    }
  };

  const handleDelete = (collectionId: string) => {
    if (confirmingDelete === collectionId) {
      // Confirmed — execute deletion
      setConfirmingDelete(null);
      api.deleteCollection(collectionId)
        .then(() => {
          setCollections((prev) => prev.filter((c) => c.id !== collectionId));
        })
        .catch(() => {
          setError('Failed to delete collection.');
        });
    } else {
      setConfirmingDelete(collectionId);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-folder-open text-indigo-400 text-xl" />
        </div>
        <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Collections</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Sign in to create and manage research collections.
        </p>
        <Button
          variant="gradient"
          size="sm"
          onClick={() => { onClose(); setCurrentPage('auth'); }}
          leftIcon={<i className="fas fa-user-circle" />}
        >
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Collections</h3>
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
        >
          <i className="fas fa-times" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Success / Error banners */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
            <i className="fas fa-check-circle" />
            {successMsg}
          </div>
        )}
        {error && error !== 'auth' && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
            <i className="fas fa-exclamation-circle" />
            {error}
          </div>
        )}

        {/* New collection form */}
        <form onSubmit={handleCreate} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            New Collection
          </p>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Collection name"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Button type="submit" variant="primary" size="sm" fullWidth isLoading={creating}>
            Create
          </Button>
        </form>

        {/* Collections list */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <i className="fas fa-spinner fa-spin text-2xl" />
          </div>
        ) : collections.length === 0 ? (
          <p className="text-sm text-center text-gray-400 py-6">
            No collections yet. Create one above.
          </p>
        ) : (
          <div className="space-y-2">
            {collections.map((col) => (
              <div
                key={col.id}
                className="bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-xl p-3 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                    {col.name}
                  </p>
                  {col.description && (
                    <p className="text-xs text-gray-400 truncate">{col.description}</p>
                  )}
                  <p className="text-xs text-indigo-400 mt-0.5">
                    {col.articleCount ?? 0} article{col.articleCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openCollection(col.id)}
                    title="View collection"
                  >
                    <i className="fas fa-eye" />
                  </Button>
                  {articleToAdd && (
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={addingTo === col.id}
                      onClick={() => handleAddArticle(col.id)}
                      title="Add current article"
                    >
                      <i className="fas fa-plus" />
                    </Button>
                  )}
                  {confirmingDelete === col.id ? (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(col.id)}
                        className="text-red-600 hover:text-red-700 font-semibold"
                      >
                        Delete?
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingDelete(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(col.id)}
                      title="Delete collection"
                      className="text-red-400 hover:text-red-600"
                    >
                      <i className="fas fa-trash-alt" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
