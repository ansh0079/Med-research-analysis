import React, { useEffect, useState } from 'react';
import type { LearningProfile } from '@types';
import { DIFFICULTY_OPTIONS, SPECIALTY_OPTIONS } from '../../../utils/learningDashboardConstants';

export function ProfileSettings({ profile, onSave }: { profile: LearningProfile | null; onSave: (p: Partial<LearningProfile>) => Promise<void> }) {
  const [persona, setPersona] = useState(profile?.persona || '');
  const [difficulty, setDifficulty] = useState<LearningProfile['preferredDifficulty']>(profile?.preferredDifficulty || 'mixed');
  const [dailyGoal, setDailyGoal] = useState(profile?.dailyGoalMinutes ?? 15);
  const [trainingStage, setTrainingStage] = useState<NonNullable<LearningProfile['trainingStage']>>(
    profile?.trainingStage || 'finals',
  );
  const [defaultExplanationDepth, setDefaultExplanationDepth] = useState<NonNullable<LearningProfile['defaultExplanationDepth']>>(
    profile?.defaultExplanationDepth || 'exam_focus',
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {

    if (profile?.trainingStage) setTrainingStage(profile.trainingStage);

    if (profile?.defaultExplanationDepth) setDefaultExplanationDepth(profile.defaultExplanationDepth);
  }, [profile?.trainingStage, profile?.defaultExplanationDepth]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      persona,
      preferredDifficulty: difficulty,
      dailyGoalMinutes: dailyGoal,
      trainingStage,
      defaultExplanationDepth,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
          Specialty / Role
        </label>
        <select
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          aria-label="Specialty or role"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select your role…</option>
          {SPECIALTY_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <p className="text-[10px] text-slate-400 mt-1">The agent adapts its explanations and MCQ depth to your role.</p>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
          Training stage (quiz &amp; case style)
        </label>
        <select
          value={trainingStage}
          onChange={(e) => setTrainingStage(e.target.value as NonNullable<LearningProfile['trainingStage']>)}
          aria-label="Training stage"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="preclinical">Preclinical — mechanisms &amp; definitions</option>
          <option value="early_clinical">Early clinical — clerks / junior years</option>
          <option value="finals">Finals / high-stakes exams</option>
          <option value="foundation_doctor">Foundation doctor — ward &amp; on-call focus</option>
        </select>
        <p className="text-[10px] text-slate-400 mt-1">Changes MCQ vignette length and default question mix server-side.</p>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
          Default explanation depth (quiz review)
        </label>
        <select
          value={defaultExplanationDepth}
          onChange={(e) => setDefaultExplanationDepth(e.target.value as NonNullable<LearningProfile['defaultExplanationDepth']>)}
          aria-label="Explanation depth"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="foundation">First principles</option>
          <option value="exam_focus">Exam-focused concise</option>
          <option value="mechanistic">Mechanistic / deep</option>
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
          Preferred difficulty
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDifficulty(opt.value)}
              className={`rounded-xl border-2 px-3 py-2 text-left transition-colors ${
                difficulty === opt.value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              }`}
            >
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{opt.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="daily-goal-range" className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
          Daily study goal
        </label>
        <div className="flex items-center gap-3">
          <input
            id="daily-goal-range"
            type="range" min={5} max={60} step={5}
            value={dailyGoal}
            onChange={(e) => setDailyGoal(Number(e.target.value))}
            aria-label="Daily study goal in minutes"
            className="flex-1 accent-indigo-600"
          />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-16 text-right">{dailyGoal} min</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
      >
        {saving
          ? <><i className="fas fa-circle-notch fa-spin" /> Saving…</>
          : saved
            ? <><i className="fas fa-check" /> Saved</>
            : <><i className="fas fa-save" /> Save preferences</>
        }
      </button>
    </div>
  );
}
