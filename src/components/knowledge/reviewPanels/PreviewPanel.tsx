import type { AgentGuidance } from '@types';

export function PreviewPanel({ guidance }: { guidance: Partial<AgentGuidance> & { topic: string } }) {
  return (
    <div className="rounded-2xl border border-emerald-100 overflow-hidden dark:border-emerald-900/40">
      <div className="bg-emerald-600 px-5 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
          <i className="fas fa-user-graduate text-white text-sm" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Mentor Message</p>
          <p className="text-sm font-black text-white">{guidance.topic}</p>
        </div>
      </div>
      <div className="p-5 space-y-4 bg-white dark:bg-slate-900">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {guidance.mentorMessage || <span className="text-slate-400 italic">No mentor message set</span>}
        </p>
        {(guidance.seminalPapers?.length ?? 0) > 0 && (
          <div className="grid gap-2 md:grid-cols-2">
            {guidance.seminalPapers!.slice(0, 4).map((paper) => (
              <div key={paper.sourceIndex} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  [{paper.sourceIndex}] {paper.title}
                </p>
                {paper.clinicalPrinciple && (
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {paper.clinicalPrinciple}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="rounded-full bg-indigo-500 px-3 py-1.5 text-[10px] font-bold text-white">Generate Case</span>
          <span className="rounded-full bg-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-600">Generate MCQs</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500">Review Evidence</span>
        </div>
      </div>
    </div>
  );
}
