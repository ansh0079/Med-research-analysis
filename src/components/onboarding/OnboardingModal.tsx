import React, { useState } from 'react';
import { api } from '@services/api';
import { completeOnboarding } from './onboardingState';

type Persona = 'clinician' | 'researcher' | 'student';

const PERSONAS: { id: Persona; icon: string; title: string; subtitle: string }[] = [
  { id: 'clinician',  icon: 'fa-user-md',       title: 'Clinician-Researcher', subtitle: 'I see patients and publish evidence' },
  { id: 'researcher', icon: 'fa-flask',          title: 'Academic Researcher',  subtitle: 'I run studies and write systematic reviews' },
  { id: 'student',    icon: 'fa-graduation-cap', title: 'Medical Student / Trainee', subtitle: 'I need evidence fast for study and rounds' },
];

const EXAMPLE_QUERIES: Record<Persona, { label: string; query: string }[]> = {
  clinician: [
    { label: 'SGLT2 inhibitors in HFpEF',          query: 'SGLT2 inhibitors heart failure preserved ejection fraction outcomes' },
    { label: 'Prone positioning in ARDS',           query: 'prone positioning mechanical ventilation ARDS mortality' },
    { label: 'Direct oral anticoagulants in AF + CKD', query: 'DOAC atrial fibrillation chronic kidney disease safety efficacy' },
  ],
  researcher: [
    { label: 'Screening colonoscopy interval RCTs',  query: 'colonoscopy screening interval randomized controlled trial colorectal cancer' },
    { label: 'Metformin all-cause mortality',        query: 'metformin mortality diabetes systematic review meta-analysis' },
    { label: 'Sleep duration cardiovascular risk',   query: 'sleep duration cardiovascular disease risk cohort study' },
  ],
  student: [
    { label: 'Sepsis',                               query: 'Sepsis' },
    { label: 'Acute coronary syndrome',              query: 'Acute coronary syndrome' },
    { label: 'Pulmonary embolism',                   query: 'Pulmonary embolism' },
  ],
};

interface Props {
  onDone: (query?: string, destination?: 'search' | 'learning' | 'quiz') => void;
}

export const OnboardingModal: React.FC<Props> = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);

  const finish = async (query?: string, destination?: 'search' | 'learning' | 'quiz') => {
    completeOnboarding();
    if (persona) {
      try {
        await api.saveLearningProfile({
          persona: PERSONAS.find((p) => p.id === persona)?.title || persona,
          goals: [],
          preferredDifficulty: persona === 'student' ? 'easy' : 'mixed',
          dailyGoalMinutes: persona === 'student' ? 15 : 20,
        });
      } catch {
        // Silently fail — localStorage fallback is enough
      }
    }
    onDone(query, destination ?? (persona === 'student' ? 'learning' : 'search'));
  };

  const handleQueryPick = (query: string) => {
    setSelectedQuery(query);
  };

  const handleNext = () => {
    if (step === 0 && persona) setStep(1);
    else if (step === 1) setStep(2);
  };

  const handleLaunch = () => {
    finish(selectedQuery ?? undefined);
  };

  const handleQuizLaunch = () => {
    if (!selectedQuery) return;
    finish(selectedQuery, 'quiz');
  };

  const handleSkip = () => finish();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-900/30 overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>

        <div className="p-7">
          {/* Step 0 — Persona */}
          {step === 0 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <p className="text-xs font-mono text-indigo-500 uppercase tracking-widest mb-1">Step 1 of 3</p>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">What best describes you?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">We'll tailor example searches to your workflow.</p>
              </div>
              <div className="space-y-2.5">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersona(p.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                      persona === p.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      persona === p.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      <i className={`fas ${p.icon}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.subtitle}</p>
                    </div>
                    {persona === p.id && (
                      <i className="fas fa-check-circle text-indigo-500 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={handleSkip}
                  className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  Skip setup
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!persona}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 1 — Pick a query */}
          {step === 1 && persona && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <p className="text-xs font-mono text-indigo-500 uppercase tracking-widest mb-1">Step 2 of 3</p>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Pick a starting question</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Or use your own — this just gets you to results faster.</p>
              </div>
              <div className="space-y-2.5">
                {EXAMPLE_QUERIES[persona].map(({ label, query }) => (
                  <button
                    key={query}
                    type="button"
                    onClick={() => handleQueryPick(query)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                      selectedQuery === query
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <i className="fas fa-search text-indigo-400 text-xs shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                    {selectedQuery === query && <i className="fas fa-check-circle text-indigo-500 ml-auto shrink-0" />}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedQuery(null)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                    selectedQuery === null
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <i className="fas fa-pen text-slate-400 text-xs shrink-0" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">I'll type my own query</span>
                  {selectedQuery === null && <i className="fas fa-check-circle text-indigo-500 ml-auto shrink-0" />}
                </button>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={() => setStep(0)}
                  className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  ← Back
                </button>
                <button type="button" onClick={handleNext}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all">
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — What you get */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <p className="text-xs font-mono text-indigo-500 uppercase tracking-widest mb-1">Step 3 of 3</p>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Here's what you get</h2>
              </div>
              <div className="space-y-2.5">
                {[
                  { icon: 'fa-search', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/40', title: 'Multi-source search', body: 'PubMed, Semantic Scholar, and OpenAlex searched simultaneously and deduplicated.' },
                  { icon: 'fa-robot', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/40', title: 'AI synthesis', body: 'Evidence synthesised by Gemini into a GRADE-aligned summary with certainty ratings.' },
                  { icon: 'fa-clipboard-check', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', title: 'Quiz and review loop', body: 'Turn seeded evidence into MCQs, track weak areas, and bring them back for spaced review.' },
                ].map((f) => (
                  <div key={f.title} className={`flex items-start gap-3.5 p-3.5 rounded-xl ${f.bg}`}>
                    <div className={`w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-sm`}>
                      <i className={`fas ${f.icon} text-sm ${f.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{f.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{f.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {selectedQuery && (
                  <button
                    type="button"
                    onClick={handleQuizLaunch}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25"
                  >
                    Try quiz →
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLaunch}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-bold rounded-xl transition-all"
                >
                  {selectedQuery ? 'Search evidence' : 'Start searching'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
