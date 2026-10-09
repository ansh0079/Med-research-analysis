import React, { useState } from 'react';

export type QuestionReport =
  | { kind: 'topic_suggestion'; suggestedTopic: string }
  | { kind: 'answer_challenge'; suggestedAnswer: string; evidenceText: string; evidenceUrl: string };

interface QuestionLearnerActionsProps {
  options: string[];
  onSubmit: (report: QuestionReport) => Promise<void>;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export const QuestionLearnerActions: React.FC<QuestionLearnerActionsProps> = ({ options, onSubmit }) => {
  const [mode, setMode] = useState<'topic' | 'answer' | null>(null);
  const [topic, setTopic] = useState('');
  const [answer, setAnswer] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const letters = LETTERS.filter((_, i) => Boolean(options[i]));
  const urlOk = /^https?:\/\/\S+$/i.test(evidenceUrl.trim());
  const evidenceOk = urlOk || evidenceText.trim().length >= 40;

  async function submit() {
    setError(null);
    if (mode === 'topic' && topic.trim().length < 3) {
      setError('Name the topic you think this question belongs to.');
      return;
    }
    if (mode === 'answer') {
      if (!answer) {
        setError('Choose the answer you think is right.');
        return;
      }
      if (!evidenceOk) {
        setError('Add a link or a short quotation from a guideline or paper.');
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === 'topic') await onSubmit({ kind: 'topic_suggestion', suggestedTopic: topic.trim() });
      else await onSubmit({
        kind: 'answer_challenge',
        suggestedAnswer: answer,
        evidenceText: evidenceText.trim(),
        evidenceUrl: evidenceUrl.trim(),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <p className="text-[11px] text-slate-500 dark:text-slate-400">Saved. A reviewer will check it before anything changes.</p>;
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setMode('topic'); setError(null); }}
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
          Suggest a different topic
        </button>
        <button type="button" onClick={() => { setMode('answer'); setError(null); }}
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
          I think another answer is right
        </button>
      </div>
      {mode === 'topic' && (
        <label className="block mt-3 text-[11px] text-slate-600 dark:text-slate-300">
          Topic
          <input value={topic} onChange={(e) => setTopic(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm" />
        </label>
      )}
      {mode === 'answer' && (
        <div className="mt-3 space-y-2">
          <label className="block text-[11px] text-slate-600 dark:text-slate-300">
            The answer you think is right
            <select value={answer} onChange={(e) => setAnswer(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm">
              <option value="">Choose</option>
              {letters.map((letter) => <option key={letter} value={letter}>{letter}</option>)}
            </select>
          </label>
          <label className="block text-[11px] text-slate-600 dark:text-slate-300">
            Link to the guideline or paper
            <input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://"
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm" />
          </label>
          <label className="block text-[11px] text-slate-600 dark:text-slate-300">
            Or quote the passage
            <textarea value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm" />
          </label>
        </div>
      )}
      {error && <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300" role="alert">{error}</p>}
      {mode && (
        <button type="button" onClick={submit} disabled={busy}
          className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">
          {busy ? 'Saving' : 'Submit'}
        </button>
      )}
    </div>
  );
};
