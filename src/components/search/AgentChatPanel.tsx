import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@services/api';
import { useAuth } from '@contexts/AuthContext';
import { useSearchContext } from '@contexts/SearchContext';
import type { AgentGuidance, Article } from '@types';
import { ClinicalSafetyNotice } from '@components/ui/ClinicalSafetyNotice';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type AgentFeedbackType = 'helpful' | 'not_helpful' | 'too_basic' | 'too_complex' | 'missed_question';

interface AgentChatPanelProps {
  topic: string;
  agentGuidance: AgentGuidance;
  currentArticles: Article[];
  onGenerateCase?: () => void;
  onGenerateMcqs?: () => void;
}

function StarterPrompts({
  guidance,
  onSelect,
}: {
  guidance: AgentGuidance;
  onSelect: (prompt: string) => void;
}) {
  const prompts: string[] = [];

  if (guidance.mcqAngles?.length) {
    prompts.push(`Quiz me on: ${guidance.mcqAngles[0]}`);
  }
  if (guidance.caseGenerationHooks?.length) {
    prompts.push(`Generate a clinical case: ${guidance.caseGenerationHooks[0]}`);
  }
  if (guidance.teachingPoints?.length) {
    const tp = guidance.teachingPoints[0];
    const text = typeof tp === 'string' ? tp : (tp as { point?: string; text?: string }).point || '';
    if (text) prompts.push(`Explain: ${text.slice(0, 80)}`);
  }
  prompts.push('What are the key management principles?');

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {prompts.slice(0, 4).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onSelect(p)}
          className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors text-left"
        >
          {p.length > 60 ? `${p.slice(0, 58)}…` : p}
        </button>
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  index,
  feedback,
  onFeedback,
}: {
  message: ChatMessage;
  index: number;
  feedback?: AgentFeedbackType;
  onFeedback?: (index: number, type: AgentFeedbackType) => void;
}) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] ${
          isUser
            ? 'bg-indigo-500 text-white'
            : 'bg-emerald-600 text-white'
        }`}
      >
        {isUser ? <i className="fas fa-user" /> : <i className="fas fa-user-graduate" />}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-indigo-500 text-white rounded-tr-sm'
            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-tl-sm'
        }`}
      >
        {message.content}
        {!isUser && onFeedback && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-200/70 pt-1.5 dark:border-slate-700/70">
            {([
              ['helpful', 'fa-thumbs-up', 'Helpful'],
              ['not_helpful', 'fa-thumbs-down', 'Not helpful'],
              ['too_basic', 'fa-arrow-trend-down', 'Too basic'],
              ['too_complex', 'fa-arrow-trend-up', 'Too complex'],
              ['missed_question', 'fa-bullseye', 'Missed question'],
            ] as Array<[AgentFeedbackType, string, string]>).map(([type, icon, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => onFeedback(index, type)}
                title={label}
                aria-label={label}
                className={`h-6 w-6 rounded-md text-[10px] transition-colors ${
                  feedback === type
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <i className={`fas ${icon}`} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({
  topic,
  agentGuidance,
  currentArticles,
  onGenerateCase,
  onGenerateMcqs,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Array<{ id: number; title?: string; topic: string; lastMessageAt?: string }>>([]);
  const [showThreads, setShowThreads] = useState(false);
  const [feedbackByIndex, setFeedbackByIndex] = useState<Record<number, AgentFeedbackType>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isAuthenticated } = useAuth();
  const { setCurrentPage, searchHistory } = useSearchContext();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, streamingContent]);

  // Load existing conversations for this topic on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    api.learning.getAgentSessions(topic)
      .then((res) => setConversations(res.conversations))
      .catch(() => setConversations([]));
  }, [isAuthenticated, topic]);

  const loadConversation = useCallback(async (id: number) => {
    try {
      const { conversation } = await api.learning.getAgentSession(id);
      setMessages(conversation.messages as ChatMessage[]);
      setConversationId(conversation.id);
      setFeedbackByIndex({});
    } catch {
      setError('Failed to load conversation');
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = { role: 'user', content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);
      setStreamingContent('');
      setError(null);

      const history = messages.slice(-10);
      const articleSubset = currentArticles.slice(0, 6).map((a) => ({
        uid: a.uid,
        title: a.title,
        abstract: a.abstract,
        pubdate: a.pubdate,
        _synapseTopics: a._synapseTopics,
      }));

      let convId = conversationId;
      let reply = '';
      try {
        if (isAuthenticated && !convId) {
          const { conversation } = await api.learning.createAgentSession(topic, topic);
          convId = conversation.id;
          setConversationId(convId);
          setConversations((prev) => [conversation, ...prev]);
        }

        // Read session feedback from quiz results (if the learner just scored poorly)
        let sessionFeedback: { topic: string; score: number; totalQuestions: number; weakAreas?: string[] } | null = null;
        try {
          const raw = sessionStorage.getItem('med_agent_session_feedback');
          if (raw) {
            const parsed = JSON.parse(raw);
            // Only use feedback that's recent (< 30 min) and relevant to this topic
            const age = Date.now() - (parsed.timestamp || 0);
            if (age < 30 * 60 * 1000) {
              sessionFeedback = parsed;
            }
            sessionStorage.removeItem('med_agent_session_feedback');
          }
        } catch { /* ignore */ }

        await api.ai.agentChatStream(
          topic,
          trimmed,
          history,
          articleSubset,
          searchHistory.slice(-5),
          {
            onChunk: (chunk) => {
              reply += chunk;
              setStreamingContent((prev) => prev + chunk);
            },
            onDone: (_doneTopic, doneConvId) => {
              if (doneConvId != null) {
                setConversationId(doneConvId);
              }
              setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
              setStreamingContent('');
            },
            onError: (msg) => setError(msg),
          },
          sessionFeedback,
          convId,
        );

        if (isAuthenticated && convId && reply) {
          api.learning.appendAgentMessages(convId, [
            { role: 'user', content: trimmed, timestamp: new Date().toISOString() },
            { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
          ]).catch(() => {});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
        setStreamingContent('');
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [loading, messages, topic, currentArticles, conversationId, isAuthenticated, searchHistory]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const handleStarterSelect = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleAgentFeedback = useCallback((messageIndex: number, feedbackType: AgentFeedbackType) => {
    if (!isAuthenticated) return;
    setFeedbackByIndex((prev) => ({ ...prev, [messageIndex]: feedbackType }));
    api.ai.recordAgentFeedback({
      topic,
      feedbackType,
      conversationId,
      messageIndex,
    }).catch(() => {
      setFeedbackByIndex((prev) => {
        const next = { ...prev };
        delete next[messageIndex];
        return next;
      });
    });
  }, [conversationId, isAuthenticated, topic]);

  return (
    <div className="neo-card overflow-hidden border border-emerald-100 dark:border-emerald-900/40">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full bg-emerald-700 px-5 py-3 flex items-center justify-between gap-3 hover:bg-emerald-800 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <i className="fas fa-comments text-white text-sm" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Ask the Mentor</p>
            <p className="text-sm font-black text-white truncate">{topic}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated && conversations.length > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowThreads((v) => !v); }}
              className="text-white/70 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
              title="Conversation threads"
            >
              <i className="fas fa-history mr-1" /> {conversations.length}
            </button>
          )}
          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-white/70 text-xs`} />
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 flex flex-col gap-3">
          {/* Action shortcuts */}
          <div className="flex gap-2">
            {onGenerateCase && (
              <button
                type="button"
                onClick={onGenerateCase}
                className="flex-1 rounded-xl border border-indigo-200 bg-indigo-50 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <i className="fas fa-stethoscope mr-1" /> Case
              </button>
            )}
            {onGenerateMcqs && (
              <button
                type="button"
                onClick={onGenerateMcqs}
                className="flex-1 rounded-xl border border-violet-200 bg-violet-50 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-600 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50 transition-colors"
              >
                <i className="fas fa-brain mr-1" /> MCQ
              </button>
            )}
          </div>

          {/* Thread list dropdown */}
          {showThreads && conversations.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 space-y-1">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent conversations</span>
                <button type="button" onClick={() => setShowThreads(false)} className="text-xs text-slate-400 hover:text-slate-600">
                  <i className="fas fa-times" />
                </button>
              </div>
              {conversations.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { loadConversation(c.id); setShowThreads(false); }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${conversationId === c.id ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  <span className="truncate block">{c.title || c.topic}</span>
                  {c.lastMessageAt && <span className="text-[10px] text-slate-400">{new Date(c.lastMessageAt).toLocaleDateString()}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Starter prompts (only before first message) */}
          {messages.length === 0 && (
            <StarterPrompts guidance={agentGuidance} onSelect={handleStarterSelect} />
          )}

          {/* Message thread */}
          {messages.length > 0 && (
            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  message={msg}
                  index={i}
                  feedback={feedbackByIndex[i]}
                  onFeedback={isAuthenticated ? handleAgentFeedback : undefined}
                />
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center text-[10px] text-white">
                    <i className="fas fa-user-graduate" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-xs leading-relaxed dark:bg-slate-800 dark:text-slate-200">
                    {streamingContent ? (
                      <span className="whitespace-pre-wrap">{streamingContent}<span className="inline-block w-0.5 h-3.5 bg-emerald-500 animate-pulse ml-0.5 align-text-bottom" /></span>
                    ) : (
                      <div className="flex gap-1 items-center h-4">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {error && (
            <p className="text-[11px] text-red-500 font-semibold">{error}</p>
          )}

          <ClinicalSafetyNotice status="agent_draft" className="px-1" />

          {/* Input */}
          {!isAuthenticated ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                <i className="fas fa-lock mr-1 text-emerald-500" />
                Sign in to chat with the Mentor
              </p>
              <button
                type="button"
                onClick={() => setCurrentPage('auth')}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about evidence, request a case or MCQ…"
                  rows={2}
                  disabled={loading}
                  className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={loading || !input.trim()}
                  className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  aria-label="Send"
                >
                  {loading
                    ? <i className="fas fa-circle-notch fa-spin text-sm" />
                    : <i className="fas fa-paper-plane text-sm" />
                  }
                </button>
              </div>
              <p className="text-[10px] text-slate-400">Enter to send · Shift+Enter for new line · Grounded in stored evidence</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
