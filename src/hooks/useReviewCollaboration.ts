import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { PrismaCounts, ReviewArticle } from '@types';

interface ScreeningUpdatePayload {
  article: ReviewArticle;
  prisma: PrismaCounts;
  articleId: string;
  decision: string;
  userId?: string;
  userName?: string;
}

export function useReviewCollaboration(reviewId: string | null | undefined) {
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const applyRemoteUpdate = useCallback((
    payload: ScreeningUpdatePayload,
    localUserId: string | undefined,
    onUpdate: (article: ReviewArticle, prisma: PrismaCounts) => void
  ) => {
    if (payload.userId && payload.userId === localUserId) return;
    onUpdate(payload.article, payload.prisma);
  }, []);

  useEffect(() => {
    if (!reviewId) return;

    const socketOrigin = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(socketOrigin, { path: '/socket.io' });
    socketRef.current = socket;

    socket.emit('join-review', reviewId);

    socket.on('review:presence', (users: string[]) => {
      setActiveUsers(users);
    });

    return () => {
      socket.emit('leave-review', reviewId);
      socket.disconnect();
      socketRef.current = null;
      setActiveUsers([]);
    };
  }, [reviewId]);

  const subscribeToScreening = useCallback((
    localUserId: string | undefined,
    onUpdate: (article: ReviewArticle, prisma: PrismaCounts, meta?: { userName?: string }) => void
  ) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    const handler = (payload: ScreeningUpdatePayload) => {
      if (payload.userId && payload.userId === localUserId) return;
      onUpdate(payload.article, payload.prisma, { userName: payload.userName });
    };

    socket.on('screening:update', handler);
    return () => {
      socket.off('screening:update', handler);
    };
  }, []);

  return { activeUsers, subscribeToScreening };
}
