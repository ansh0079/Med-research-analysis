import React from 'react';
import { Button } from '@components/ui/Button';
import { api } from '@services/api';
import type { ReviewArticle, ReviewCriteria } from '@types';

interface Props {
  rows: ReviewArticle[];
  criteria?: ReviewCriteria;
  activeUsers?: string[];
  onDecision: (
    articleId: string,
    decision: 'included' | 'excluded' | 'maybe',
    payload?: { exclusionReason?: string; notes?: string }
  ) => Promise<void>;
}

type AssistState = 'idle' | 'loading' | 'done' | 'error';

interface AssistResult {
  decision: 'include' | 'exclude' | 'uncertain';
  rationale: string;
  matchedInclusion: string[];
  triggeredExclusion: string[];
}

const ASSIST_STYLE: Record<AssistResult['decision'], { border: string; bg: string; label: string; icon: string; chipText: string; chipBg: string }> = {
  include:   { border: 'border-emerald-200 dark:border-emerald-800/40', bg: 'bg-emerald-50/60 dark:bg-emerald-950/10', label: 'AI: Include', icon: 'fa-check-circle text-emerald-500', chipText: 'text-emerald-700 dark:text-emerald-300', chipBg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  exclude:   { border: 'border-red-200 dark:border-red-800/40',         bg: 'bg-red-50/60 dark:bg-red-950/10',         label: 'AI: Exclude',  icon: 'fa-times-circle text-red-500',   chipText: 'text-red-700 dark:text-red-300',     chipBg: 'bg-red-100 dark:bg-red-900/30' },
  uncertain: { border: 'border-amber-200 dark:border-amber-800/40',     bg: 'bg-amber-50/60 dark:bg-amber-950/10',     label: 'AI: Uncertain',icon: 'fa-question-circle text-amber-500', chipText: 'text-amber-700 dark:text-amber-300', chipBg: 'bg-amber-100 dark:bg-amber-900/30' },
};

function ArticleScreenCard({
  row,
  criteria,
  onDecision,
}: {
  row: ReviewArticle;
  criteria?: ReviewCriteria;
  onDecision: Props['onDecision'];
}) {
  const [draft, setDraft] = React.useState({ exclusionReason: row.exclusion_reason ?? '', notes: row.notes ?? '' });
  const [assistState, setAssistState] = React.useState<AssistState>('idle');
  const [assist, setAssist] = React.useState<AssistResult | null>(null);
  const [assistShown, setAssistShown] = React.useState(false);
  const hasCriteria = criteria && (criteria.inclusion.length > 0 || criteria.exclusion.length > 0);

  const runAssist = async () => {
    if (!row.article_data || !hasCriteria) return;
    setAssistState('loading');
    try {
      const result = await api.screeningAssist({ criteria: criteria!, article: row.article_data });
      setAssist(result);
      setAssistState('done');
      setAssistShown(true);
    } catch {
      setAssistState('error');
    }
  };

  const decide = (decision: 'included' | 'excluded' | 'maybe') => {
    return onDecision(row.article_id, decision, {
      exclusionReason: draft.exclusionReason.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    });
  };

  const isDone = row.screening_status !== 'pending';
  const article = row.article_data;

  return (
    <div className={`rounded-xl border p-3.5 transition-colors ${
      isDone
        ? 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 opacity-60'
        : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900'
    }`}>
      {/* Title + meta */}
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-900 dark:text-white leading-snug">
            {article?.title || row.article_id}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400">
            {(article?.source || article?.journal) && <span>{article.source || article.journal}</span>}
            {(article?.year || article?.pubdate) && <span>{article.year || article.pubdate?.slice(0, 4)}</span>}
            {article?._quality?.grade && (
              <span className="rounded-full bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-300">
                Grade {article._quality.grade}
              </span>
            )}
            {article?._retraction?.isRetracted && (
              <span className="rounded-full bg-red-50 dark:bg-red-950/30 px-2 py-0.5 font-semibold text-red-700 dark:text-red-300">Retracted</span>
            )}
            {isDone && (
              <span className={`rounded-full px-2 py-0.5 font-bold ${
                row.screening_status === 'included' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                row.screening_status === 'excluded' ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' :
                'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
              }`}>{row.screening_status}</span>
            )}
          </div>
        </div>
      </div>

      {/* Abstract */}
      {article?.abstract && (
        <p className="mb-2.5 line-clamp-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {article.abstract}
        </p>
      )}

      {/* AI Assist result */}
      {assistShown && assist && (() => {
        const s = ASSIST_STYLE[assist.decision];
        return (
          <div className={`mb-3 rounded-xl border p-3 ${s.border} ${s.bg}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <i className={`fas ${s.icon} text-sm`} />
              <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${s.chipBg} ${s.chipText}`}>{s.label}</span>
              <button type="button" aria-label="Dismiss AI suggestion" onClick={() => setAssistShown(false)} className="ml-auto text-slate-300 hover:text-slate-500 transition-colors text-[10px]">
                <i className="fas fa-times" aria-hidden="true" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{assist.rationale}</p>
            {assist.matchedInclusion.length > 0 && (
              <div className="mt-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Matches inclusion</p>
                <ul className="space-y-0.5">
                  {assist.matchedInclusion.map((c, i) => (
                    <li key={i} className="text-[10px] text-emerald-700 dark:text-emerald-400 flex gap-1.5"><span>✓</span>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {assist.triggeredExclusion.length > 0 && (
              <div className="mt-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-red-600 mb-1">Triggers exclusion</p>
                <ul className="space-y-0.5">
                  {assist.triggeredExclusion.map((c, i) => (
                    <li key={i} className="text-[10px] text-red-700 dark:text-red-400 flex gap-1.5"><span>✗</span>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })()}

      {!isDone && (
        <>
          {/* Notes row */}
          <div className="mt-2 grid gap-2 sm:grid-cols-2 mb-3">
            <input
              value={draft.exclusionReason}
              onChange={(e) => setDraft((d) => ({ ...d, exclusionReason: e.target.value }))}
              placeholder="Exclusion reason, if excluded"
              className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Reviewer notes / uncertainty"
              className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Decision + assist buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => decide('included')}>
              <i className="fas fa-check text-emerald-500 text-[10px] mr-1" /> Include
            </Button>
            <Button size="sm" variant="ghost" onClick={() => decide('excluded')}>
              <i className="fas fa-times text-red-400 text-[10px] mr-1" /> Exclude
            </Button>
            <Button size="sm" variant="ghost" onClick={() => decide('maybe')}>
              <i className="fas fa-question text-amber-400 text-[10px] mr-1" /> Maybe
            </Button>

            {hasCriteria && !assistShown && (
              <button type="button" onClick={runAssist} disabled={assistState === 'loading'}
                className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-700/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors disabled:opacity-50">
                {assistState === 'loading'
                  ? <><div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /> Asking AI…</>
                  : assistState === 'error'
                    ? <><i className="fas fa-exclamation-circle text-[9px]" /> Retry AI</>
                    : <><i className="fas fa-robot text-[9px]" /> AI Assist</>
                }
              </button>
            )}
            {assistShown && (
              <button type="button" onClick={runAssist} disabled={assistState === 'loading'}
                className="ml-auto text-[9px] text-indigo-400 hover:text-indigo-600 transition-colors">
                <i className="fas fa-rotate-right text-[8px] mr-1" /> Re-assess
              </button>
            )}
          </div>
        </>
      )}

      {isDone && row.exclusion_reason && (
        <p className="mt-2 text-[10px] text-slate-400 italic">Excluded: {row.exclusion_reason}</p>
      )}
    </div>
  );
}

export const ScreeningQueue: React.FC<Props> = ({ rows, criteria, activeUsers = [], onDecision }) => {
  const pending = rows.filter((r) => r.screening_status === 'pending');
  const decided = rows.filter((r) => r.screening_status !== 'pending');
  const [showDecided, setShowDecided] = React.useState(false);

  return (
    <div className="neo-card rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white">Screening Queue</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {pending.length} pending · {rows.filter((r) => r.screening_status === 'included').length} included · {rows.filter((r) => r.screening_status === 'excluded').length} excluded
          </p>
        </div>
        {activeUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {activeUsers.length} reviewer{activeUsers.length === 1 ? '' : 's'} online
          </div>
        )}
      </div>

      <div className="space-y-3">
        {pending.map((row) => (
          <ArticleScreenCard key={row.article_id} row={row} criteria={criteria} onDecision={onDecision} />
        ))}
        {pending.length === 0 && decided.length > 0 && (
          <p className="text-center text-sm text-emerald-600 dark:text-emerald-400 font-semibold py-4">
            <i className="fas fa-check-circle mr-2" />All articles screened
          </p>
        )}
        {pending.length === 0 && decided.length === 0 && (
          <p className="text-center text-xs text-slate-400 py-6">No articles in queue yet.</p>
        )}
      </div>

      {decided.length > 0 && (
        <div className="mt-4">
          <button type="button" onClick={() => setShowDecided((v) => !v)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5">
            <i className={`fas fa-chevron-${showDecided ? 'up' : 'down'} text-[9px]`} />
            {showDecided ? 'Hide' : 'Show'} {decided.length} decided article{decided.length !== 1 ? 's' : ''}
          </button>
          {showDecided && (
            <div className="mt-3 space-y-2">
              {decided.map((row) => (
                <ArticleScreenCard key={row.article_id} row={row} criteria={criteria} onDecision={onDecision} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
