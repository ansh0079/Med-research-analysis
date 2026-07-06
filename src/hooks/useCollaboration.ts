import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '@services/api';
import type { Annotation } from '@types';

export const useCollaboration = (articleId: string | null) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);

  const [prevArticleId, setPrevArticleId] = useState<string | null>(null);
  if (prevArticleId !== articleId) {
    setPrevArticleId(articleId);
    if (articleId) {
      setNeedsAuth(false);
      setAnnotations([]);
    }
  }

  useEffect(() => {
    if (!articleId) return;

    let cancelled = false;

    // Load initial annotations
    api.documents.getAnnotations(articleId)
      .then((data) => {
        if (!cancelled) setAnnotations(data);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof Error && e.message === 'AUTH_REQUIRED') {
          setNeedsAuth(true);
        } else {
          console.error(e);
        }
      });

    // Setup real-time connection
    const socketOrigin = import.meta.env.VITE_API_URL || window.location.origin;
    const newSocket = io(socketOrigin, { path: '/socket.io' });

    newSocket.emit('join-article', articleId, 'Researcher');

    newSocket.on('presence:update', (users: string[]) => {
      setActiveUsers(users);
    });

    newSocket.on('annotation:new', (newAnnotation: Annotation) => {
      if (newAnnotation.articleId === articleId) {
        setAnnotations((prev) => [...prev, newAnnotation]);
      }
    });

    return () => {
      cancelled = true;
      newSocket.emit('leave-article', articleId);
      newSocket.disconnect();
    };
  }, [articleId]); 

  const addAnnotation = useCallback(async (text: string, position?: { x: number; y: number; page: number }) => {
    if (!articleId) return;
    try {
      await api.documents.addAnnotation(articleId, text, position);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_REQUIRED') {
        setNeedsAuth(true);
      } else {
        console.error('Failed to add annotation', err);
      }
    }
  }, [articleId]);

  return { annotations, addAnnotation, needsAuth, activeUsers };
};