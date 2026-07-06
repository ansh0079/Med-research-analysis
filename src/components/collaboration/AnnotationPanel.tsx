import React, { useState, useEffect } from 'react';
import { api } from '@services/api';
import { useAuth } from '@contexts/AuthContext';
import { useNavigatePage } from '@contexts/SearchContext';
import { Button } from '@components/ui/Button';

interface Annotation {
  id: string;
  articleId: string;
  text: string;
  position?: { x: number; y: number; page: number };
}

interface AnnotationPanelProps {
  articleId: string;
  articleTitle?: string;
  onClose: () => void;
}

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({ articleId, articleTitle, onClose }) => {
  const { isAuthenticated } = useAuth();
  const setCurrentPage = useNavigatePage();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newText, setNewText] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.documents.getAnnotations(articleId);
        if (!cancelled) setAnnotations(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.message === 'AUTH_REQUIRED') {
          setError('auth');
        } else {
          setError('Failed to load annotations.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, articleId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setSaving(true);
    setError('');
    try {
      const result = await api.documents.addAnnotation(articleId, newText.trim());
      setAnnotations((prev) => [
        ...prev,
        { id: result.id, articleId, text: newText.trim() },
      ]);
      setNewText('');
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_REQUIRED') {
        setError('auth');
      } else {
        setError('Failed to save annotation.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-highlighter text-amber-400 text-xl" />
        </div>
        <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Annotations</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Sign in to add notes and highlights to articles.
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
      <div className="flex items-start justify-between p-4 border-b border-gray-100 dark:border-slate-700 gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">Annotations</h3>
          {articleTitle && (
            <p className="text-xs text-gray-400 truncate mt-0.5" title={articleTitle}>
              {articleTitle}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 shrink-0"
        >
          <i className="fas fa-times" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && error !== 'auth' && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
            <i className="fas fa-exclamation-circle" />
            {error}
          </div>
        )}

        {/* New annotation form */}
        <form onSubmit={handleSave} className="space-y-2">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add a note or highlight..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            fullWidth
            isLoading={saving}
            className="bg-amber-500 hover:bg-amber-600 focus:ring-amber-400"
          >
            <i className="fas fa-highlighter mr-1.5" />
            Save Note
          </Button>
        </form>

        {/* Annotations list */}
        {loading ? (
          <div className="text-center py-6 text-gray-400">
            <i className="fas fa-spinner fa-spin text-2xl" />
          </div>
        ) : annotations.length === 0 ? (
          <p className="text-sm text-center text-gray-400 py-4">
            No annotations yet. Add a note above.
          </p>
        ) : (
          <div className="space-y-2">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3"
              >
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {ann.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
