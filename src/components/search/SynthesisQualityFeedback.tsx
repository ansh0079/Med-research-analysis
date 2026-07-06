import React, { useState } from 'react';
import { api } from '@services/api';

interface SynthesisQualityFeedbackProps {
  topic?: string;
}

export const SynthesisQualityFeedback: React.FC<SynthesisQualityFeedbackProps> = ({ topic }) => {
  const [clinicalUsefulness, setClinicalUsefulness] = useState(0);
  const [timeSavedMinutes, setTimeSavedMinutes] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const submit = async () => {
    if (clinicalUsefulness < 1) return;
    setStatus('saving');
    try {
      await api.documents.submitQualityFeedback({
        productType: 'synthesis',
        topic,
        clinicalUsefulness,
        timeSavedMinutes: timeSavedMinutes ? Number(timeSavedMinutes) : undefined,
      });
      setStatus('saved');
    } catch {
      setStatus('idle');
    }
  };

  if (status === 'saved') {
    return (
      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
        <i className="fas fa-check mr-1" />Thanks — your rating helps improve synthesis quality.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Rate this synthesis</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => setClinicalUsefulness(score)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors ${
                clinicalUsefulness >= score
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
              title={`Clinical usefulness: ${score}/5`}
            >
              {score}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          Time saved (min)
          <input
            type="number"
            min={0}
            max={480}
            value={timeSavedMinutes}
            onChange={(e) => setTimeSavedMinutes(e.target.value)}
            className="w-16 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
          />
        </label>
        <button
          type="button"
          disabled={clinicalUsefulness < 1 || status === 'saving'}
          onClick={() => void submit()}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold"
        >
          {status === 'saving' ? 'Saving…' : 'Submit'}
        </button>
      </div>
    </div>
  );
};
