import React, { useMemo, useState } from 'react';
import { api } from '@services/api';
import { completeOnboarding } from './onboardingState';
import { useToast } from '@components/ui/Toast';
import type { LearningProfile } from '@types';

type Destination = 'search' | 'learning' | 'quiz';

interface Props {
  onDone: (query?: string, destination?: Destination) => void;
}

const TRAINING_STAGES: Array<{ id: NonNullable<LearningProfile['trainingStage']>; label: string; icon: string }> = [
  { id: 'preclinical', label: 'Preclinical', icon: 'fa-dna' },
  { id: 'early_clinical', label: 'Early clinical', icon: 'fa-stethoscope' },
  { id: 'finals', label: 'Finals', icon: 'fa-graduation-cap' },
  { id: 'foundation_doctor', label: 'Foundation doctor', icon: 'fa-user-doctor' },
];

const SPECIALTIES = [
  'General medicine',
  'Cardiology',
  'Respiratory',
  'Emergency medicine',
  'Intensive care',
  'Endocrinology',
];

const STUDY_GOALS = [
  'Pass exams',
  'Ward decision support',
  'Journal club',
  'Build research question',
  'Refresh weak topics',
];

const DIFFICULTIES: Array<LearningProfile['preferredDifficulty']> = ['mixed', 'easy', 'medium', 'hard'];
const TIME_BUDGETS = [10, 15, 25, 40];

function SetupOption({
  selected,
  icon,
  label,
  onClick,
}: {
  selected: boolean;
  icon?: string;
  label: string;
  onClick: () => void;
}) {
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
  const [trainingStage, setTrainingStage] = useState<NonNullable<LearningProfile['trainingStage']>>('finals');
  const [specialtyInterest, setSpecialtyInterest] = useState('General medicine');
  const [studyGoal, setStudyGoal] = useState('Pass exams');
  const [preferredDifficulty, setPreferredDifficulty] = useState<LearningProfile['preferredDifficulty']>('mixed');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(15);

  const starterQuery = useMemo(() => {
    const topic = specialtyInterest === 'General medicine' ? 'acute medicine clinical guidelines' : `${specialtyInterest} high yield clinical guidelines`;
    return studyGoal === 'Journal club' ? `${specialtyInterest} randomized trial systematic review` : topic;
  }, [specialtyInterest, studyGoal]);

  const { showToast } = useToast();

  const finish = async (destination: Destination = 'learning') => {
    completeOnboarding();
    try {
      await api.saveLearningProfile({
        persona: trainingStage === 'foundation_doctor' ? 'clinician' : 'student',
        goals: [studyGoal],
        trainingStage,
        specialtyInterest,
        studyGoal,
        preferredDifficulty,
        dailyGoalMinutes,
        defaultExplanationDepth: trainingStage === 'preclinical' ? 'foundation' : 'exam_focus',
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

  const progress = ((step + 1) / 5) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-900/30 overflow-hidden">
        <div className="h-1 bg-slate-100 dark:bg-slate-700">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="p-7">
          <div className="mb-5">
            <p className="text-xs font-mono text-indigo-500 uppercase tracking-widest mb-1">Step {step + 1} of 5</p>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {step === 0 && 'What stage are you at?'}
              {step === 1 && 'Which specialty should we bias toward?'}
              {step === 2 && 'What are you studying for?'}
              {step === 3 && 'Preferred difficulty?'}
              {step === 4 && 'Daily time budget?'}
            </h2>
          </div>

          <div className="space-y-2.5 animate-fade-in">
            {step === 0 && TRAINING_STAGES.map((item) => (
              <SetupOption key={item.id} selected={trainingStage === item.id} icon={item.icon} label={item.label} onClick={() => setTrainingStage(item.id)} />
            ))}

            {step === 1 && SPECIALTIES.map((specialty) => (
              <SetupOption key={specialty} selected={specialtyInterest === specialty} icon="fa-book-medical" label={specialty} onClick={() => setSpecialtyInterest(specialty)} />
            ))}

            {step === 2 && STUDY_GOALS.map((goal) => (
              <SetupOption key={goal} selected={studyGoal === goal} icon="fa-bullseye" label={goal} onClick={() => setStudyGoal(goal)} />
            ))}

            {step === 3 && DIFFICULTIES.map((difficulty) => (
              <SetupOption key={difficulty} selected={preferredDifficulty === difficulty} icon="fa-sliders" label={difficulty[0].toUpperCase() + difficulty.slice(1)} onClick={() => setPreferredDifficulty(difficulty)} />
            ))}

            {step === 4 && TIME_BUDGETS.map((minutes) => (
              <SetupOption key={minutes} selected={dailyGoalMinutes === minutes} icon="fa-clock" label={`${minutes} minutes per day`} onClick={() => setDailyGoalMinutes(minutes)} />
            ))}
          </div>

          <div className="flex items-center justify-between pt-6">
            <button type="button" onClick={step === 0 ? handleSkip : () => setStep((s) => Math.max(0, s - 1))}
              className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              {step === 0 ? 'Skip setup' : 'Back'}
            </button>
            {step < 4 ? (
              <button type="button" onClick={() => setStep((s) => Math.min(4, s + 1))}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all">
                Next
              </button>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={() => finish('quiz')}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all">
                  Start quiz
                </button>
                <button type="button" onClick={() => finish('search')}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-bold rounded-xl transition-all">
                  Search
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
