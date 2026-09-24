import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@services/api';
import { useAuth } from '@contexts/AuthContext';
import type {
  RelevanceLabel,
  RelevanceQueueEntry,
  RelevanceScenario,
} from '@services/api/relevanceReview';

/**
 * The clinician relevance review surface.
 *
 * Until now these labels could only be written through the API or a CLI ingest, which meant the one
 * input the measurement loop actually needs - a clinician saying whether a result answers the
 * question - was the hardest part of the system to supply. This page shows what a real search
 * returned, in the order it was served, and records a verdict per candidate.
 *
 * It deliberately does not decide anything: whether a scenario is ready to graduate, whether two
 * reviewers agree, and whether a reviewer is independent are all server judgements. The page shows
 * the server's reasons rather than computing its own.
 */

const LABELS: { id: RelevanceLabel; key: string; title: string; hint: string; tone: string }[] = [
  {
    id: 'on_topic', key: '1', title: 'On topic', tone: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    hint: 'Answers the question asked, for the population asked about.',
  },
  {
    id: 'adjacent', key: '2', title: 'Adjacent', tone: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    hint: 'Related and defensible, but not an answer: the ranker should be neither rewarded nor punished.',
  },
  {
    id: 'off_topic', key: '3', title: 'Off topic', tone: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
    hint: 'Does not belong in these results at all.',
  },
];

function StateChip({ state, disagreed }: { state: string; disagreed: boolean }) {
  const style = state === 'adjudicated' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200'
    : state === 'agreed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
      : state === 'disagreed' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {state.replace(/_/g, ' ')}{disagreed && state === 'adjudicated' ? ' (was disputed)' : ''}
    </span>
  );
}

export function RelevanceReviewPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'queue' | 'scenarios'>('queue');
  const [queue, setQueue] = useState<RelevanceQueueEntry[]>([]);
  const [scenarios, setScenarios] = useState<RelevanceScenario[]>([]);
  const [summary, setSummary] = useState<{ total: number; graduatable: number }>({ total: 0, graduatable: 0 });
  const [entryIndex, setEntryIndex] = useState(0);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [intendedSense, setIntendedSense] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const entry = queue[entryIndex];
  const candidate = entry?.candidates[candidateIndex];

  const isReviewer = user?.role === 'admin' || user?.role === 'curator';

  const load = useCallback(async () => {
    // The role gate below is a render guard; without this check the queue is still fetched for a
    // reader who will never see it. The server refuses them, but the request should not be made.
    if (!isReviewer) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [queueData, scenarioData] = await Promise.all([
        api.relevanceReview.getQueue(25),
        api.relevanceReview.getScenarios(),
      ]);
      setQueue(queueData.queue);
      setScenarios(scenarioData.scenarios);
      setSummary(scenarioData.summary);
      setEntryIndex(0);
      setCandidateIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the review queue');
    } finally {
      setLoading(false);
    }
  }, [isReviewer]);

  useEffect(() => { void load(); }, [load]);

  /** Move to the next unjudged candidate, and off the end of a query to the next query. */
  const advance = useCallback(() => {
    setNotice('');
    setReason('');
    if (!entry) return;
    if (candidateIndex + 1 < entry.candidates.length) {
      setCandidateIndex(candidateIndex + 1);
      return;
    }
    if (entryIndex + 1 < queue.length) {
      setEntryIndex(entryIndex + 1);
      setCandidateIndex(0);
      setIntendedSense('');
      return;
    }
    setNotice('That is the end of the queue. Reload for newly served searches.');
  }, [entry, candidateIndex, entryIndex, queue.length]);

  const judge = useCallback(async (label: RelevanceLabel) => {
    if (!entry || !candidate || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.relevanceReview.recordJudgement({
        query: entry.query,
        articleUid: candidate.articleUid,
        label,
        reason: reason.trim() || undefined,
        // The intended sense belongs to the question, not the candidate, and a scenario cannot
        // graduate without it - so it is asked once per query and sent with every verdict.
        intendedSense: intendedSense.trim() || undefined,
        articleTitle: candidate.title || undefined,
        searchId: entry.searchId,
        servedRank: candidate.servedRank,
        lane: candidate.lane,
      });
      advance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record that verdict');
    } finally {
      setSaving(false);
    }
  }, [entry, candidate, reason, intendedSense, saving, advance]);

  // 1 / 2 / 3 label the current candidate; s skips it. Labelling is repetitive by nature and a
  // reviewer should not have to move a mouse between every verdict.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const match = LABELS.find((l) => l.key === event.key);
      if (match) { event.preventDefault(); void judge(match.id); return; }
      if (event.key === 's') { event.preventDefault(); advance(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [judge, advance]);

  const remaining = useMemo(
    () => queue.slice(entryIndex).reduce((n, e, i) => n + (i === 0 ? e.candidates.length - candidateIndex : e.candidates.length), 0),
    [queue, entryIndex, candidateIndex],
  );

  if (!isReviewer) {
    return <div className="mx-auto max-w-2xl p-8 text-slate-600 dark:text-slate-300">This review queue is for reviewers only.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Relevance review</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Judge what search actually returned. These labels are the only thing that can show whether a
          ranking change is an improvement.
        </p>
      </header>

      <nav className="flex gap-2">
        {(['queue', 'scenarios'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === id
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            {id === 'queue' ? `To judge (${remaining})` : `Scenarios (${summary.graduatable}/${summary.total} ready)`}
          </button>
        ))}
        <button type="button" onClick={() => void load()} className="ml-auto rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800 dark:text-slate-300">
          Reload
        </button>
      </nav>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}
      {notice && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">{notice}</div>}
      {loading && <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>}

      {!loading && tab === 'queue' && !entry && (
        <div className="rounded-xl border border-slate-200 p-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          Nothing left to judge. The queue is built from searches that were actually served, so it
          refills as the product is used.
        </div>
      )}

      {!loading && tab === 'queue' && entry && candidate && (
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Question asked</div>
            <div className="text-lg font-medium text-slate-900 dark:text-slate-100">{entry.query}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Served {new Date(entry.servedAt).toLocaleString()} · candidate {candidateIndex + 1} of {entry.candidates.length}
            </div>
            <label className="mt-3 block text-sm">
              <span className="text-slate-700 dark:text-slate-300">What the question means (required before this scenario can be used)</span>
              <input
                value={intendedSense}
                onChange={(e) => setIntendedSense(e.target.value)}
                placeholder="e.g. adjunctive corticosteroids for septic shock"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Result {candidate.servedRank ?? '?'}{candidate.lane ? ` · ${candidate.lane.replace(/_/g, ' ')}` : ''}
                </div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{candidate.title || candidate.articleUid}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{candidate.articleUid}</div>
              </div>
              {candidate.retracted && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">retracted</span>
              )}
            </div>

            <label className="mt-3 block text-sm">
              <span className="text-slate-700 dark:text-slate-300">Why (optional, but it is what a later adjudicator reads)</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {LABELS.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  disabled={saving}
                  onClick={() => void judge(label.id)}
                  className={`rounded-lg border p-3 text-left disabled:opacity-50 ${label.tone}`}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    {label.title}
                    <kbd className="rounded bg-white/70 px-1.5 text-xs dark:bg-black/30">{label.key}</kbd>
                  </div>
                  <div className="mt-1 text-xs opacity-80">{label.hint}</div>
                </button>
              ))}
            </div>
            <button type="button" onClick={advance} className="mt-2 text-xs text-slate-500 underline dark:text-slate-400">
              Skip this one (s)
            </button>
          </div>
        </section>
      )}

      {!loading && tab === 'scenarios' && (
        <section className="space-y-3">
          {scenarios.length === 0 && (
            <div className="rounded-xl border border-slate-200 p-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              No scenarios have been judged yet.
            </div>
          )}
          {scenarios.map((scenario) => (
            <article key={scenario.queryKey} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{scenario.query}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {scenario.reviewers.length} reviewer(s)
                    {scenario.agreement.kappa != null && ` · kappa ${scenario.agreement.kappa}${scenario.agreement.reportable ? '' : ' (too few to report)'}`}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scenario.graduatable
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                >
                  {scenario.graduatable ? 'ready' : 'not ready'}
                </span>
              </div>

              {scenario.blockers.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs text-slate-600 dark:text-slate-400">
                  {scenario.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                </ul>
              )}

              <ul className="mt-3 space-y-1">
                {scenario.candidates.map((c) => (
                  <li key={c.articleUid} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-slate-700 dark:text-slate-300">{c.title || c.articleUid}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {c.label && <span className="text-xs text-slate-500 dark:text-slate-400">{c.label.replace(/_/g, ' ')}</span>}
                      <StateChip state={c.state} disagreed={c.disagreed} />
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default RelevanceReviewPage;
