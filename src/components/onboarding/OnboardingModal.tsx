import React, { useMemo, useState } from 'react';
import { api } from '@services/api';
import { completeOnboarding } from './onboardingState';
import { useToast } from '@components/ui/Toast';
import type { LearningProfile } from '@types';

type Destination = 'search' | 'learning' | 'quiz';
type Persona = 'clinician' | 'researcher' | 'student';

interface Props {
  onDone: (query?: string, destination?: Destination) => void;
}

const PERSONAS: Array<{ id: Persona; icon: string; label: string; description: string; color: string }> = [
  {
    id: 'clinician',
    icon: 'fa-stethoscope',
    label: 'Clinician-Researcher',
    description: 'I see patients and want to quickly find and synthesise evidence for clinical decisions or research questions.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'researcher',
    icon: 'fa-flask',
    label: 'Academic Researcher',
    description: 'I run systematic reviews, meta-analyses, and need multi-source search, PICO extraction, and PRISMA tooling.',
    color: 'from-violet-500 to-indigo-600',
  },
  {
    id: 'student',
    icon: 'fa-graduation-cap',
    label: 'Medical Student / Trainee',
    description: 'I\'m studying for exams, preparing for wards, and want to quiz myself on what the evidence actually says.',
    color: 'from-indigo-500 to-blue-600',
  },
];

const TRAINING_STAGES: Array<{ id: NonNullable<LearningProfile['trainingStage']>; label: string; icon: string }> = [
  { id: 'preclinical',      label: 'Preclinical',       icon: 'fa-dna' },
  { id: 'early_clinical',   label: 'Early clinical',    icon: 'fa-stethoscope' },
  { id: 'finals',           label: 'Finals',            icon: 'fa-graduation-cap' },
  { id: 'foundation_doctor',label: 'Foundation doctor', icon: 'fa-user-doctor' },
];

const SPECIALTIES = [
  'General medicine', 'Cardiology', 'Respiratory', 'Emergency medicine', 'Intensive care', 'Endocrinology',
];

const STUDY_GOALS_BY_PERSONA: Record<Persona, string[]> = {
  clinician: ['Ward decision support', 'Journal club', 'Build research question', 'Systematic review', 'Guideline check'],
  researcher: ['Systematic review', 'Build research question', 'Journal club', 'Grant writing', 'Refresh weak topics'],
  student:   ['Pass exams', 'Ward decision support', 'Refresh weak topics', 'Journal club', 'Build research question'],
};

const DIFFICULTIES: Array<LearningProfile['preferredDifficulty']> = ['mixed', 'easy', 'medium', 'hard'];
const TIME_BUDGETS = [10, 15, 25, 40];

function SetupOption({
  selected, icon, label, onClick,
}: { selected: boolean; icon?: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
          : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
      }`}
    >
      {icon && <i className={`fas ${icon} text-indigo-400 text-sm shrink-0`} />}
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
      {selected && <i className="fas fa-check-circle text-indigo-500 ml-auto shrink-0" />}
    </button>
  );
}

export const OnboardingModal: React.FC<Props> = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState<Persona>('clinician');
  const [trainingStage, setTrainingStage] = useState<NonNullable<LearningProfile['trainingStage']>>('finals');
  const [specialtyInterest, setSpecialtyInterest] = useState('General medicine');
  const [studyGoal, setStudyGoal] = useState('Pass exams');
  const [preferredDifficulty, setPreferredDifficulty] = useState<LearningProfile['preferredDifficulty']>('mixed');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(15);

  // Clinicians skip the training stage step; researchers skip difficulty/time steps
  const steps = persona === 'student'
    ? ['persona', 'training', 'specialty', 'goal', 'difficulty', 'time']
    : persona === 'researcher'
      ? ['persona', 'specialty', 'goal', 'time']
      : ['persona', 'specialty', 'goal', 'time']; // clinician

  const totalSteps = steps.length;
  const currentStepKey = steps[step];

  const studyGoals = STUDY_GOALS_BY_PERSONA[persona];

  const starterQuery = useMemo(() => {
    const topic = specialtyInterest === 'General medicine'
      ? 'acute medicine clinical guidelines'
      : `${specialtyInterest} high yield clinical guidelines`;
    return studyGoal === 'Systematic review' || studyGoal === 'Journal club'
      ? `${specialtyInterest} randomized trial systematic review`
      : topic;
  }, [specialtyInterest, studyGoal]);

  const { showToast } = useToast();

  const finish = async (destination: Destination) => {
    completeOnboarding();
    try {
      await api.saveLearningProfile({
        persona: persona === 'student' ? (trainingStage === 'foundation_doctor' ? 'clinician' : 'student') : persona,
        goals: [studyGoal],
        trainingStage: persona === 'student' ? trainingStage : (persona === 'clinician' ? 'foundation_doctor' : undefined),
        specialtyInterest,
        studyGoal,
        preferredDifficulty,
        dailyGoalMinutes,
        defaultExplanationDepth: persona === 'student' && trainingStage === 'preclinical' ? 'foundation' : 'exam_focus',
      });
    } catch {
      showToast('Profile saved locally, but sync failed. You can update it later in settings.', 'warning', 4000);
    }
    onDone(starterQuery, destination);
  };

  const handleSkip = () => {
    completeOnboarding();
    onDone(undefined, 'search');
  };

  const progress = ((step + 1) / totalSteps) * 100;

  const stepTitle: Record<string, string> = {
    persona:    'How do you use this platform?',
    training:   'What stage are you at?',
    specialty:  'Which specialty should we bias toward?',
    goal:       'What brings you here today?',
    difficulty: 'Preferred question difficulty?',
    time:       'Daily time budget?',
  };

  const defaultDestination: Destination = persona === 'student' ? 'quiz' : persona === 'researcher' ? 'search' : 'search';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-900/30 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-100 dark:bg-slate-700">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="p-7">
          <div className="mb-5">
            <p className="text-xs font-mono text-indigo-500 uppercase tracking-widest mb-1">
              Step {step + 1} of {totalSteps}
            </p>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {stepTitle[currentStepKey]}
            </h2>
          </div>

          <div className="space-y-2.5 animate-fade-in">

            {/* Step: Persona selection */}
            {currentStepKey === 'persona' && PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setPersona(p.id); setStudyGoal(STUDY_GOALS_BY_PERSONA[p.id][0]); }}
                className={`w-full flex items-start gap-4 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                  persona === p.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <div className={`shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center mt-0.5`}>
                  <i className={`fas ${p.icon} text-white text-sm`} />
                </div>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{p.label}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{p.description}</span>
                </span>
                {persona === p.id && <i className="fas fa-check-circle text-indigo-500 shrink-0 mt-1" />}
              </button>
            ))}

            {/* Step: Training stage (students only) */}
            {currentStepKey === 'training' && TRAINING_STAGES.map((item) => (
              <SetupOption key={item.id} selected={trainingStage === item.id} icon={item.icon} label={item.label} onClick={() => setTrainingStage(item.id)} />
            ))}

            {/* Step: Specialty */}
            {currentStepKey === 'specialty' && SPECIALTIES.map((specialty) => (
              <SetupOption key={specialty} selected={specialtyInterest === specialty} icon="fa-book-medical" label={specialty} onClick={() => setSpecialtyInterest(specialty)} />
            ))}

            {/* Step: Goal */}
            {currentStepKey === 'goal' && studyGoals.map((goal) => (
              <SetupOption key={goal} selected={studyGoal === goal} icon="fa-bullseye" label={goal} onClick={() => setStudyGoal(goal)} />
            ))}

            {/* Step: Difficulty */}
            {currentStepKey === 'difficulty' && DIFFICULTIES.map((difficulty) => (
              <SetupOption key={difficulty} selected={preferredDifficulty === difficulty} icon="fa-sliders" label={difficulty[0].toUpperCase() + difficulty.slice(1)} onClick={() => setPreferredDifficulty(difficulty)} />
            ))}

            {/* Step: Time budget */}
            {currentStepKey === 'time' && TIME_BUDGETS.map((minutes) => (
              <SetupOption key={minutes} selected={dailyGoalMinutes === minutes} icon="fa-clock" label={`${minutes} minutes per day`} onClick={() => setDailyGoalMinutes(minutes)} />
            ))}
          </div>

          <div className="flex items-center justify-between pt-6">
            <button type="button"
              onClick={step === 0 ? handleSkip : () => setStep((s) => Math.max(0, s - 1))}
              className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              {step === 0 ? 'Skip setup' : 'Back'}
            </button>

            {step < totalSteps - 1 ? (
              <button type="button" onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all">
                Next
              </button>
            ) : (
              <div className="flex gap-2">
                {persona === 'student' && (
                  <button type="button" onClick={() => finish('quiz')}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all">
                    Start quiz
                  </button>
                )}
                <button type="button" onClick={() => finish(defaultDestination)}
                  className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    persona === 'student'
                      ? 'border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}>
                  {persona === 'clinician' ? 'Start searching' : persona === 'researcher' ? 'Start reviewing' : 'Search instead'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
