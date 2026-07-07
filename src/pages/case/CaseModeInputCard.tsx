import React from 'react';
import { Button } from '@components/ui/Button';
import { parseUsageLimitError, formatUsageLimitMessage } from '@utils/usageErrors';
import { getRecoveryHint } from '@utils/appErrors';
import { EXAMPLE_CASE } from './caseModeConfig';

interface CaseModeInputCardProps {
  structuredCase: { age: string; sex: string; symptoms: string; labs: string; medications: string; comorbidities: string };
  caseText: string;
  charsLeft: number;
  isOverLimit: boolean;
  loading: boolean;
  evidenceLoading: boolean;
  error: string | null;
  evidenceError: string | null;
  isAuthenticated: boolean;
  onUpdateField: (field: keyof CaseModeInputCardProps['structuredCase'], value: string) => void;
  onSetCaseText: (text: string) => void;
  onRunAnalysis: () => void;
  onRunCaseToEvidence: () => void;
  onClear: () => void;
  buildPayload: () => string;
}

export const CaseModeInputCard: React.FC<CaseModeInputCardProps> = ({
  structuredCase,
  caseText,
  charsLeft,
  isOverLimit,
  loading,
  evidenceLoading,
  error,
  evidenceError,
  isAuthenticated,
  onUpdateField,
  onSetCaseText,
  onRunAnalysis,
  onRunCaseToEvidence,
  onClear,
  buildPayload,
}) => (
  <div className="neo-card rounded-2xl p-5 space-y-3">
    <div className="grid gap-2 md:grid-cols-3">
      {(['age', 'sex', 'comorbidities'] as const).map((field) => (
        <input key={field} value={structuredCase[field]} onChange={(e) => onUpdateField(field, e.target.value)}
          placeholder={field === 'comorbidities' ? 'Comorbidities' : field.charAt(0).toUpperCase() + field.slice(1)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
      ))}
    </div>
    <div className="grid gap-2 md:grid-cols-3">
      <textarea value={structuredCase.symptoms} onChange={(e) => onUpdateField('symptoms', e.target.value)}
        placeholder="Symptoms / presentation" rows={3}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
      <textarea value={structuredCase.labs} onChange={(e) => onUpdateField('labs', e.target.value)}
        placeholder="Labs, imaging, vitals" rows={3}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
      <textarea value={structuredCase.medications} onChange={(e) => onUpdateField('medications', e.target.value)}
        placeholder="Current medications" rows={3}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
    </div>

    <div className="flex items-center justify-between mb-1">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Additional free-text context</label>
      <button type="button" onClick={() => onSetCaseText(EXAMPLE_CASE)}
        className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1">
        <i className="fas fa-lightbulb text-[10px]" /> Try example
      </button>
    </div>

    <textarea
      className={`w-full rounded-xl border px-4 py-3 min-h-[140px] text-sm leading-relaxed resize-y transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
        isOverLimit
          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20 text-slate-900 dark:text-slate-100'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'
      }`}
      placeholder="e.g. 68-year-old male with ARDS on mechanical ventilation, P/F ratio 140…"
      value={caseText}
      onChange={(e) => onSetCaseText(e.target.value)}
    />

    <div className="flex items-center justify-between">
      <p className={`text-xs font-mono ${isOverLimit ? 'text-red-500' : charsLeft < 200 ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>
        {isOverLimit ? `${Math.abs(charsLeft)} over limit` : `${charsLeft.toLocaleString()} chars remaining`}
      </p>
      <div className="flex items-center gap-2">
        {caseText && (
          <button type="button" onClick={onClear}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Clear
          </button>
        )}
        <Button variant="secondary" size="sm" onClick={onRunCaseToEvidence}
          disabled={!buildPayload().trim() || isOverLimit || loading} isLoading={evidenceLoading}
          leftIcon={evidenceLoading ? undefined : <i className="fas fa-bolt text-[10px]" />}>
          {evidenceLoading ? 'Building brief…' : 'Evidence brief'}
        </Button>
        <Button variant="gradient" size="sm" onClick={onRunAnalysis}
          disabled={!buildPayload().trim() || isOverLimit || evidenceLoading} isLoading={loading}
          leftIcon={loading ? undefined : <i className="fas fa-stethoscope text-[10px]" />}>
          {loading ? 'Analysing…' : 'Full case analysis'}
        </Button>
      </div>
    </div>

    <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
      <i className="fas fa-triangle-exclamation text-amber-500 text-xs mt-0.5 shrink-0" />
      <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
        Research-assistant output only. Do not enter identifiable patient data. Verify all suggestions against local guidelines and specialist review.
      </p>
    </div>

    {evidenceError && renderError(evidenceError, isAuthenticated)}
    {error && renderError(error, isAuthenticated, true)}
  </div>
);

function renderError(err: string, _isAuthenticated: boolean, isUsage = false) {
  if (err === 'AUTH_REQUIRED') {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl">
        <p className="text-sm text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
          <i className="fas fa-lock text-indigo-400 text-xs" /> Sign in to use Clinical Case Mode — it's free.
        </p>
        <a href="/auth" className="shrink-0 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors">Sign in →</a>
      </div>
    );
  }
  if (err.startsWith('RATE_LIMITED:')) {
    const secs = err.split(':')[1];
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
        <i className="fas fa-clock text-amber-500 text-xs shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-300">Too many requests — try again in {secs}s.</p>
      </div>
    );
  }
  if (err.startsWith('USAGE_LIMITED:') || err.startsWith('UPGRADE_REQUIRED:') || (isUsage && err.startsWith('USAGE_LIMITED:'))) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
        <i className="fas fa-chart-line text-amber-500 text-xs shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Usage limit reached.{' '}
          <a href="/billing" className="font-bold underline">View usage</a>
        </p>
      </div>
    );
  }
  if (isUsage && err.startsWith('USAGE_LIMITED:')) {
    const info = parseUsageLimitError(err);
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
        <i className="fas fa-chart-line text-amber-500 text-xs shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {info ? formatUsageLimitMessage(info) : 'Monthly limit reached.'}{' '}
          <a href="/billing" className="font-bold underline">View usage</a>
        </p>
      </div>
    );
  }
  const recoveryHint = getRecoveryHint(new Error(err));
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl">
      <i className="fas fa-exclamation-circle text-red-400 text-xs shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm text-red-600 dark:text-red-300">{err}</p>
        {recoveryHint && recoveryHint !== err && (
          <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">{recoveryHint}</p>
        )}
      </div>
    </div>
  );
}
