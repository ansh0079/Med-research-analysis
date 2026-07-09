import { useCallback, useEffect, useRef, useState } from 'react';

interface EventSourceMessage<T = unknown> {
  type: string;
  data: T;
  lastEventId?: string;
}

interface EventSourceOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export function useEventSource<T = unknown>(url: string | null, _options?: EventSourceOptions) {
  const [latestMessage, setLatestMessage] = useState<EventSourceMessage<T> | null>(null);
  const [messages, setMessages] = useState<EventSourceMessage<T>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!url) return undefined;

    setIsLoading(true);
    setError(null);
    setMessages([]);
    setLatestMessage(null);

    eventSourceRef.current = new EventSource(url);
    eventSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data) as T;
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

  // Connection must start on mount; setIsLoading is part of EventSource lifecycle.

  useEffect(() => connect(), [connect]);

  return { latestMessage, messages, isLoading, error, connect };
}
