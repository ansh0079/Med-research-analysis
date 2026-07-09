import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StudyRunPanel } from '@components/learning/StudyRunPanel';
import { useSearchContext } from '@contexts/SearchContext';
import { api } from '@services/api';
import type { StudyRun, StudyRunOutline, StudyRunOutlineNode } from '@types';

const QUIZ_PREFILL_KEY = 'med_quiz_prefill';

function nodeAccuracy(cov?: { seen: boolean; quizAttempts: number; correct: number }) {
  if (!cov?.seen || !cov.quizAttempts) return null;
  return Math.round((cov.correct / cov.quizAttempts) * 100);
}

function RunMetric({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-800">
      <i className={`fas ${icon} ${color} mb-1 block text-base`} />
      <div className="text-xl font-black text-slate-800 dark:text-white">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
    </div>
  );
}

function NodeList({
  title,
  icon,
  nodes,
  run,
}: {
  title: string;
  icon: string;
  nodes: StudyRunOutlineNode[];
  run: StudyRun;
}) {
  if (nodes.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
        <i className={`fas ${icon} text-indigo-500`} />
        {title}
      </h2>
      <div className="space-y-2">
        {nodes.map((node) => {
          const cov = run.nodeCoverage?.[node.id];
          const acc = nodeAccuracy(cov);
          const status =
            !cov?.seen ? 'Not tested' :
            acc !== null && acc >= 70 ? 'Mastered' :
            acc !== null && acc >= 40 ? 'Needs review' :
            'Weak';
          const badge =
            !cov?.seen ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' :
            acc !== null && acc >= 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
            acc !== null && acc >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';

          return (
            <div key={node.id} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900/40">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-snug text-slate-700 dark:text-slate-200">{node.label}</p>
                {node.sourceIndices.length > 0 && (
                  <p className="mt-0.5 text-[10px] text-slate-400">Sources: {node.sourceIndices.join(', ')}</p>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge}`}>
                {acc === null ? status : `${status} ${acc}%`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export const StudyRunPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setDetectedTopic } = useSearchContext();
  const [run, setRun] = useState<StudyRun | null>(null);
  const [outline, setOutline] = useState<StudyRunOutline | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const runId = Number(id || 0);

  const load = useCallback(async () => {
    if (!runId) {
      setError('Study run not found.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await api.learning.getStudyRun(runId);
      setRun(data.run);
      setOutline(data.outline);
      setDetectedTopic(data.run.topic);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load study run');
    } finally {
      setLoading(false);
    }
  }, [runId, setDetectedTopic]);

  useEffect(() => {

    void load();
  }, [load]);

  const nodes = useMemo(() => outline?.nodes ?? [], [outline]);
  const stats = useMemo(() => {
    const covered = nodes.filter((node) => run?.nodeCoverage?.[node.id]?.seen).length;
    const weak = nodes.filter((node) => {
      const acc = nodeAccuracy(run?.nodeCoverage?.[node.id]);
      return acc !== null && acc < 70;
    }).length;
    const attempts = Object.values(run?.nodeCoverage ?? {}).reduce((sum, cov) => sum + Number(cov.quizAttempts || 0), 0);
    const correct = Object.values(run?.nodeCoverage ?? {}).reduce((sum, cov) => sum + Number(cov.correct || 0), 0);
    return {
      covered,
      weak,
      attempts,
      accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
    };
  }, [nodes, run]);

  const startQuiz = useCallback(() => {
    if (!run) return;
    setDetectedTopic(run.topic);
    try {
      sessionStorage.setItem(QUIZ_PREFILL_KEY, JSON.stringify({ topic: run.topic, studyRunId: run.id, difficulty: 'mixed', articles: [] }));
    } catch {
      // ignore storage failures
    }
    navigate(`/quiz?topic=${encodeURIComponent(run.topic)}&difficulty=mixed&studyRunId=${run.id}`);
  }, [navigate, run, setDetectedTopic]);

  const finishRun = useCallback(async () => {
    if (!run) return;
    setSaving(true);
    try {
      const { run: updated } = await api.learning.updateStudyRun(run.id, { status: 'completed' });
      setRun(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete run');
    } finally {
      setSaving(false);
    }
  }, [run]);

  if (loading) {
    return (
      <div className="min-h-screen aurora-bg flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (error || !run || !outline) {
    return (
      <div className="min-h-screen aurora-bg flex items-center justify-center px-4">
        <div className="text-center">
          <i className="fas fa-exclamation-circle mb-3 block text-3xl text-red-400" />
          <p className="mb-3 font-semibold text-red-500">{error || 'Study run not found.'}</p>
          <button type="button" onClick={() => navigate('/learning')} className="text-sm font-semibold text-indigo-600 hover:underline">
            Back to learning
          </button>
        </div>
      </div>
    );
  }

  const teachingPoints = nodes.filter((node) => node.kind === 'teaching_point');
  const mcqAngles = nodes.filter((node) => node.kind === 'mcq_angle');
  const sources = nodes.filter((node) => node.kind === 'source_article');

  return (
    <div className="min-h-screen aurora-bg">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-[calc(var(--nav-h)+1.5rem)]">
        <button
          type="button"
          onClick={() => navigate('/learning')}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-white"
        >
          <i className="fas fa-arrow-left" />
          Learning
        </button>

        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                {run.status}
              </span>
              <span className="text-xs text-slate-400">Started {new Date(run.startedAt).toLocaleDateString()}</span>
            </div>
            <h1 className="text-2xl font-black capitalize text-slate-900 dark:text-white">{run.topic}</h1>
            <p className="mt-1 text-sm text-slate-400">Review map, quiz coverage, weak nodes, and source proof for this topic.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startQuiz}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
            >
              <i className="fas fa-brain mr-2" />
              Quiz Weak Nodes
            </button>
            {run.status !== 'completed' && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void finishRun()}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <i className="fas fa-check mr-2" />
                Complete
              </button>
            )}
          </div>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <RunMetric label="Covered" value={`${stats.covered}/${nodes.length}`} icon="fa-map-signs" color="text-indigo-500" />
          <RunMetric label="Accuracy" value={`${stats.accuracy}%`} icon="fa-bullseye" color="text-emerald-500" />
          <RunMetric label="Weak Nodes" value={stats.weak} icon="fa-exclamation-triangle" color="text-amber-500" />
          <RunMetric label="Attempts" value={stats.attempts} icon="fa-brain" color="text-violet-500" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-5">
            <NodeList title="Teaching Points" icon="fa-graduation-cap" nodes={teachingPoints} run={run} />
            <NodeList title="Board-Style Angles" icon="fa-question-circle" nodes={mcqAngles} run={run} />
            <NodeList title="Source Proof" icon="fa-file-alt" nodes={sources} run={run} />
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <i className="fas fa-route text-indigo-500" />
                Run Summary
              </h2>
              <StudyRunPanel run={run} outline={outline} onContinue={startQuiz} />
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <i className="fas fa-lightbulb text-amber-500" />
                Next Action
              </h2>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                The next quiz will prioritize uncovered and low-accuracy outline nodes from this run.
              </p>
              <button
                type="button"
                onClick={startQuiz}
                className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
              >
                Continue Review
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default StudyRunPage;
