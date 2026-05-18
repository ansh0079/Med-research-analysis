import { useState, useEffect, useRef, useCallback } from 'react';

interface EventSourceMessage<T = any> {
  type: string;
  data: T;
  lastEventId?: string;
}

interface EventSourceOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, any>;
  headers?: Record<string, string>;
}

/**
 * Custom React hook for consuming Server-Sent Events (SSE).
 *
 * @param url The URL of the SSE endpoint.
 * @param options Configuration options for the EventSource.
 * @returns An object containing the latest message, a list of all messages, loading state, and any error.
 */
export function useEventSource<T = any>(url: string | null, options?: EventSourceOptions) {
  const [latestMessage, setLatestMessage] = useState<EventSourceMessage<T> | null>(null);
  const [messages, setMessages] = useState<EventSourceMessage<T>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!url) return;

    setIsLoading(true);
    setError(null);
    setMessages([]);
    setLatestMessage(null);

    // EventSource only supports GET. For POST, we'd need a polyfill or fetch with ReadableStream.
    // Assuming the backend is configured for GET for simplicity, or that POST body is not strictly needed for SSE init.
    // If POST is truly required, a more complex solution involving fetch and ReadableStream would be needed.
    eventSourceRef.current = new EventSource(url);

    eventSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const msg: EventSourceMessage<T> = { type: event.type, data, lastEventId: event.lastEventId };
      setLatestMessage(msg);
      setMessages((prev) => [...prev, msg]);
    };

    eventSourceRef.current.onerror = (err) => {
      setError(err);
      setIsLoading(false);
      eventSourceRef.current?.close();
    };

    eventSourceRef.current.onopen = () => setIsLoading(false);

    return () => eventSourceRef.current?.close();
  }, [url]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { latestMessage, messages, isLoading, error, connect };
}