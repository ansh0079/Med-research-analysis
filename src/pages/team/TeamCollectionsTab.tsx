import { Button } from '@components/ui/Button';
import type { Article, TeamCollection } from '@types';

export function TeamCollectionsTab({
  collections,
  newCollectionName,
  expandedCollectionId,
  collectionArticles,
  collectionLoading,
  userRole,
  onNewCollectionNameChange,
  onCreateCollection,
  onOpenCollection,
  onRemoveFromCollection,
}: {
  collections: TeamCollection[];
  newCollectionName: string;
  expandedCollectionId: string | null;
  collectionArticles: Article[];
  collectionLoading: boolean;
  userRole: string;
  onNewCollectionNameChange: (value: string) => void;
  onCreateCollection: () => void;
  onOpenCollection: (collectionId: string) => void;
  onRemoveFromCollection: (articleId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          value={newCollectionName}
          onChange={(e) => onNewCollectionNameChange(e.target.value)}
          placeholder="New collection name"
          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <Button variant="primary" onClick={onCreateCollection} leftIcon={<i className="fas fa-folder-plus" />}>
          Create Collection
        </Button>
      </div>

      {collections.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-slate-700">
          <i className="fas fa-folder-open text-4xl text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No collections yet. Create one to start sharing articles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {collections.map(col => (
            <div key={col.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => onOpenCollection(col.id)}
                className="w-full text-left p-5 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{col.name}</h3>
                    {col.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{col.description}</p>}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {col.articleCount || 0} articles · {expandedCollectionId === col.id ? 'Hide' : 'View'} list
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center shrink-0">
                    <i className={`fas fa-folder${expandedCollectionId === col.id ? '-open' : ''} text-indigo-500`} />
                  </div>
                </div>
              </button>

              {expandedCollectionId === col.id && (
                <div className="border-t border-gray-100 dark:border-slate-700 px-5 py-4 bg-slate-50/80 dark:bg-slate-900/40">
                  {collectionLoading ? (
                    <p className="text-sm text-gray-500"><i className="fas fa-spinner fa-spin mr-2" />Loading…</p>
                  ) : collectionArticles.length === 0 ? (
                    <p className="text-sm text-gray-500">No articles yet. Add papers from search using the team save scope when that flow is enabled, or use the API.</p>
                  ) : (
                    <ul className="space-y-2 max-h-56 overflow-y-auto">
                      {collectionArticles.map((art) => (
                        <li key={art.uid} className="flex items-start justify-between gap-2 text-sm">
                          <span className="text-gray-800 dark:text-gray-200 line-clamp-2">{art.title || art.uid}</span>
                          {(userRole === 'owner' || userRole === 'admin') && (
                            <button
                              type="button"
                              onClick={() => onRemoveFromCollection(art.uid)}
                              className="text-red-600 dark:text-red-400 text-xs font-bold shrink-0"
                            >
                              Remove
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
