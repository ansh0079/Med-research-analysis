import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@services/api';
import { Button } from '@components/ui/Button';
import type { CollabComment } from '@types';

interface Props {
  collectionId: string;
  currentUserId: string;
}

const REACTION_EMOJIS = ['👍', '❤️', '🎉', '👀', '✅'];

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

const CommentRow: React.FC<{
  comment: CollabComment;
  currentUserId: string;
  onReact: (commentId: string, emoji: string, alreadyReacted: boolean) => void;
  onReplyClick: (commentId: string) => void;
  isReply?: boolean;
}> = ({ comment, currentUserId, onReact, onReplyClick, isReply }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className={isReply ? 'ml-8 mt-2' : ''}>
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-[9px] font-bold shrink-0">
            {(comment.userName?.[0] || '?').toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{comment.userName || 'Researcher'}</span>
          <span className="text-[10px] text-slate-400">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{comment.content}</p>

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {comment.reactions.map((r) => {
            const mine = r.users.includes(currentUserId);
            return (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact(comment.id, r.emoji, mine)}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition-colors ${
                  mine
                    ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-700/60 dark:border-slate-600'
                }`}
              >
                {r.emoji} {r.count}
              </button>
            );
          })}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              className="text-[11px] px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <i className="fas fa-plus text-[9px]" />
            </button>
            {pickerOpen && (
              <div className="absolute left-0 top-full mt-1 flex gap-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-lg p-1.5 z-10">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      const existing = comment.reactions.find((r) => r.emoji === emoji);
                      onReact(comment.id, emoji, Boolean(existing?.users.includes(currentUserId)));
                      setPickerOpen(false);
                    }}
                    className="text-sm hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!isReply && (
            <button
              type="button"
              onClick={() => onReplyClick(comment.id)}
              className="text-[11px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 ml-1"
            >
              Reply
            </button>
          )}
        </div>
      </div>

      {comment.replies.map((reply) => (
        <CommentRow
          key={reply.id}
          comment={reply}
          currentUserId={currentUserId}
          onReact={onReact}
          onReplyClick={onReplyClick}
          isReply
        />
      ))}
    </div>
  );
};

export const CollectionCommentsTab: React.FC<Props> = ({ collectionId, currentUserId }) => {
  const [comments, setComments] = useState<CollabComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.getComments({ collectionId })
      .then(setComments)
      .catch(() => setError('Failed to load comments.'))
      .finally(() => setLoading(false));
  }, [collectionId]);

  useEffect(() => { load(); }, [load]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    setError('');
    try {
      await api.postComment({ collectionId, content: newComment.trim(), parentId: replyingTo || undefined });
      setNewComment('');
      setReplyingTo(null);
      load();
    } catch {
      setError('Failed to post comment.');
    } finally {
      setPosting(false);
    }
  };

  const handleReact = async (commentId: string, emoji: string, alreadyReacted: boolean) => {
    try {
      if (alreadyReacted) {
        await api.removeCommentReaction(commentId, emoji);
      } else {
        await api.addCommentReaction(commentId, emoji);
      }
      load();
    } catch {
      setError('Failed to update reaction.');
    }
  };

  return (
    <div className="p-5 space-y-4">
      <form onSubmit={handlePost} className="space-y-2">
        {replyingTo && (
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Replying to a comment</span>
            <button type="button" onClick={() => setReplyingTo(null)} className="text-indigo-500 font-semibold">
              Cancel
            </button>
          </div>
        )}
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <Button type="submit" variant="primary" size="sm" isLoading={posting}>
          {replyingTo ? 'Reply' : 'Comment'}
        </Button>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </form>

      {loading ? (
        <div className="text-center py-8 text-slate-400">
          <i className="fas fa-spinner fa-spin text-xl" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-center text-slate-400 py-6">No comments yet. Start the discussion above.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              onReact={handleReact}
              onReplyClick={setReplyingTo}
            />
          ))}
        </div>
      )}
    </div>
  );
};
