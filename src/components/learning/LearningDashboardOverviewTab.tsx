import React from 'react';
import type {
  LearningDashboard as LearningDashboardType,
  LearningInsight,
  CalibrationSummary,
  UserTopicMemory,
} from '@types';
import { PracticeAlertCard } from '@components/ui';
import { SpacedRepMemoryPanel } from '@components/learning/SpacedRepMemoryPanel';
import { LearningForYouPanel } from '@components/learning/LearningForYouPanel';
import { MasteryBar, QTYPE_BARS, InsightCard, CalibrationSummaryCard } from '@components/learning/LearningDashboardWidgets';

export interface EvidenceJudgementProfile {
  profile: Array<{
    topic: string;
    attempts: number;
    correct: number;
    accuracy: number;
    lastAttemptAt?: string | null;
  }>;
  tags: Array<{
    tag: string;
    count: number;
    wrongCount: number;
    lastSeenAt?: string | null;
    examples?: Array<{ topic: string | null; questionText: string; isCorrect: boolean }>;
  }>;
}

export interface PracticeAlert {
  objectKey: string;
  objectType: string;
  topic?: string | null;
  title: string;
  classification: string;
  rationale?: string | null;
}

export function LearningDashboardOverviewTab({
  dashboard,
  insights,
  calibration,
  practiceAlerts,
  judgement,
  topicMemories,
  dueCount,
  onNavigate,
  onInsightAction,
  onDrillTopic,
  onCaseTopic,
  onSearchTopic,
}: {
  dashboard: LearningDashboardType;
  insights: LearningInsight[];
  calibration: CalibrationSummary | null;
  practiceAlerts: PracticeAlert[];
  judgement: EvidenceJudgementProfile;
  topicMemories: UserTopicMemory[];
  dueCount: number;
  onNavigate: (path: string) => void;
  onInsightAction: (insight: LearningInsight) => void;
  onDrillTopic: (topic: string, studyRunId?: number) => void;
  onCaseTopic: (topic: string) => void;
  onSearchTopic: (topic: string) => void;
}) {
  return (
    <div className="space-y-5">
      <LearningForYouPanel onNavigate={onNavigate} />
      <SpacedRepMemoryPanel />

      {insights.length > 0 && (
        <div className="neo-card p-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <i className="fas fa-lightbulb text-amber-500" /> Your learning insights
          </h3>
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <InsightCard key={i} insight={ins} onAction={onInsightAction} />
            ))}
          </div>
        </div>
      )}

      {calibration && <CalibrationSummaryCard calibration={calibration} />}

      {practiceAlerts.length > 0 && (
        <div className="neo-card p-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <i className="fas fa-bell text-rose-500" /> Practice-changing evidence
            <span className="ml-auto text-[10px] font-normal text-slate-400">{practiceAlerts.length} item{practiceAlerts.length !== 1 ? 's' : ''}</span>
          </h3>
          <div className="space-y-2">
            {practiceAlerts.slice(0, 6).map((alert) => (
              <PracticeAlertCard
                key={alert.objectKey}
                objectKey={alert.objectKey}
                title={alert.title}
                topic={alert.topic}
                rationale={alert.rationale}
                onQuiz={alert.topic ? () => onDrillTopic(alert.topic!) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {dueCount > 0 && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
            <i className="fas fa-clock text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{dueCount} topic{dueCount > 1 ? 's' : ''} due for review</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
              {dashboard.reviewQueue.slice(0, 3).map((m) => m.topic).join(', ')}{dueCount > 3 ? ` +${dueCount - 3} more` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDrillTopic(dashboard.reviewQueue[0].topic)}
            className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Review now
          </button>
        </div>
      )}

      {(dashboard.weakTopics?.length ?? 0) > 0 && (
        <div className="neo-card p-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <i className="fas fa-exclamation-triangle text-amber-500" /> Weak spots — needs drilling
          </h3>
          <div className="space-y-2">
            {dashboard.weakTopics!.map((m) => (
              <div key={m.normalizedTopic} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-700 px-3 py-2.5 bg-white dark:bg-slate-800/50">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate capitalize">{m.topic}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden max-w-[120px]">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(m.overallScore, 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-red-500 font-semibold">{m.overallScore}%</span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button type="button" onClick={() => onDrillTopic(m.topic)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold transition-colors">
                    <i className="fas fa-brain mr-1" /> Quiz
                  </button>
                  <button type="button" onClick={() => onCaseTopic(m.topic)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold transition-colors">
                    <i className="fas fa-stethoscope mr-1" /> Case
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topicMemories.filter((m) => m.memoryTier === 'sparse' && m.weakOutlineNodeIds.length > 0).length > 0 && (
        <div className="neo-card p-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <i className="fas fa-hourglass-half text-orange-500" /> Stale topics — knowledge gaps detected
          </h3>
          <div className="space-y-2">
            {topicMemories
              .filter((m) => m.memoryTier === 'sparse' && m.weakOutlineNodeIds.length > 0)
              .slice(0, 5)
              .map((m) => (
                <div key={m.normalizedTopic} className="flex items-center gap-3 rounded-xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-950/20 px-3 py-2.5">
                  <i className="fas fa-exclamation-circle text-orange-400 text-xs shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate capitalize">{m.displayTopic || m.normalizedTopic}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{m.weakOutlineNodeIds.length} weak concept{m.weakOutlineNodeIds.length !== 1 ? 's' : ''} · {m.searchCount} search{m.searchCount !== 1 ? 'es' : ''}</p>
                  </div>
                  <button type="button" onClick={() => onDrillTopic(m.displayTopic || m.normalizedTopic)}
                    className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 transition-colors">
                    Refresh
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {topicMemories.length > 0 && (
        <div className="neo-card p-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <i className="fas fa-memory text-violet-500" /> Topic memory
          </h3>
          <div className="space-y-2">
            {topicMemories.slice(0, 5).map((m) => (
              <div key={m.normalizedTopic} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-700 px-3 py-2.5 bg-white dark:bg-slate-800/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate capitalize">{m.displayTopic || m.normalizedTopic}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      m.memoryTier === 'strong'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : m.memoryTier === 'building'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {m.memoryTier}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {m.searchCount} search{m.searchCount !== 1 ? 'es' : ''} · {m.topPaperCount} tracked · {m.savedPaperCount} saved · {m.weakOutlineNodeIds.length} weak
                  </p>
                </div>
                <button type="button" onClick={() => onDrillTopic(m.displayTopic || m.normalizedTopic)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold transition-colors">
                  <i className="fas fa-brain mr-1" /> Quiz
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(dashboard.mastery?.length ?? 0) > 0 && (
        <div className="neo-card p-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <i className="fas fa-chart-bar text-indigo-500" /> Average mastery by question type
          </h3>
          <div className="space-y-3">
            {QTYPE_BARS.map((b) => {
              const total = dashboard.mastery!.reduce((s, m) => s + (m[b.key] ?? 0), 0);
              const avg = Math.round(total / Math.max(1, dashboard.mastery!.length));
              return <MasteryBar key={b.key} label={b.label} score={avg} color={b.color} />;
            })}
          </div>
        </div>
      )}

      {(judgement.tags.length > 0 || judgement.profile.length > 0) && (
        <div className="neo-card p-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <i className="fas fa-balance-scale text-sky-500" /> Evidence judgement profile
          </h3>
          {judgement.tags.length > 0 && (
            <div className="mb-4 space-y-2">
              {judgement.tags.slice(0, 5).map((tag) => (
                <div key={tag.tag} className="rounded-xl border border-sky-100 dark:border-sky-900/30 bg-sky-50/50 dark:bg-sky-950/20 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 capitalize">{tag.tag.replace(/_/g, ' ')}</span>
                    <span className="ml-auto text-[10px] text-sky-600 dark:text-sky-300">{tag.wrongCount}/{tag.count} missed</span>
                  </div>
                  {tag.examples?.[0]?.questionText && (
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">{tag.examples[0].questionText}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {(() => {
            const untestedCount = judgement.profile.filter((t) => t.attempts === 0).length;
            return untestedCount > 0 ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                <i className="fas fa-question-circle" />
                {untestedCount} topic{untestedCount !== 1 ? 's' : ''} untested — quiz them to build your profile
              </p>
            ) : null;
          })()}
          <div className="space-y-2">
            {judgement.profile.filter((t) => t.attempts > 0).slice(0, 8).map((t) => (
              <div key={t.topic} className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-28 shrink-0 truncate capitalize">{t.topic}</span>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${t.accuracy >= 80 ? 'bg-emerald-500' : t.accuracy >= 60 ? 'bg-amber-500' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(t.accuracy, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{t.accuracy}%</span>
                <button type="button" onClick={() => onDrillTopic(t.topic)}
                  className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-300 transition-colors">
                  Drill
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {((dashboard.recentActivity.quizzes?.length ?? 0) + (dashboard.recentActivity.cases?.length ?? 0) + (dashboard.recentActivity.conversations?.length ?? 0)) > 0 && (
        <div className="neo-card p-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <i className="fas fa-history text-sky-500" /> Recent activity
          </h3>
          <div className="space-y-2">
            {dashboard.recentActivity.conversations?.slice(0, 3).map((c) => (
              <div key={`conv-${c.id}`} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <i className="fas fa-comments text-emerald-500 text-xs shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate capitalize">{c.topic}</p>
                  <p className="text-[10px] text-slate-400">Mentor chat · {c.messageCount} messages · {new Date(c.lastMessageAt ?? c.createdAt).toLocaleDateString()}</p>
                </div>
                <button type="button"
                  onClick={() => onSearchTopic(c.topic)}
                  className="text-[10px] text-indigo-500 hover:underline shrink-0">
                  Search again
                </button>
              </div>
            ))}
            {dashboard.recentActivity.quizzes?.slice(0, 3).map((q) => (
              <div key={`q-${q.id}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3 min-w-0">
                  <i className="fas fa-brain text-indigo-400 text-xs shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate capitalize">{q.topic}</p>
                    <p className="text-[10px] text-slate-400">{q.questionType} · {new Date(q.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${q.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {q.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
            ))}
            {dashboard.recentActivity.cases?.slice(0, 2).map((c) => (
              <div key={`c-${c.id}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3 min-w-0">
                  <i className="fas fa-stethoscope text-emerald-400 text-xs shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate capitalize">{c.topic}</p>
                    <p className="text-[10px] text-slate-400">{c.caseType} · {c.learningMode} · {new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {c.score !== undefined && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${c.score >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {c.score}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
