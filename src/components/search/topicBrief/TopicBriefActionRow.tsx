import React from 'react';
import type { Article, SynthesisResult } from '@types';
import {
  downloadText,
  learningBriefToHtml,
  learningBriefToText,
  printLearningBriefPdf,
} from '@services/exportArticles';
import type { BriefDifficulty } from './topicBriefUtils';

interface LearningBrief {
  topic: string;
  summary: string;
  topPapers: Article[];
  generatedAt: string;
}

interface Props {
  query: string;
  top5: Article[];
  synthesis: SynthesisResult | null;
  synthesisLoading: boolean;
  difficulty: BriefDifficulty;
  isTopicSaved: boolean;
  briefSaved: boolean;
  onSynthesize: () => void;
  onSummarizePaper: (article: Article) => void;
  onQuiz: (difficulty: BriefDifficulty) => void;
  onCase: (difficulty: BriefDifficulty) => void;
  onGuidelineCompare?: () => void;
  setDifficulty: (d: BriefDifficulty) => void;
  saveTopic: () => void;
  saveBrief: () => void;
}

export const TopicBriefActionRow: React.FC<Props> = ({
  query,
  top5,
  synthesis,
  synthesisLoading,
  difficulty,
  isTopicSaved,
  briefSaved,
  onSynthesize,
  onSummarizePaper,
  onQuiz,
  onCase,
  onGuidelineCompare,
  setDifficulty,
  saveTopic,
  saveBrief,
}) => {
  const synthesisSummary = synthesis?.synthesis?.clinicalBottomLine || synthesis?.synthesis?.consensus || '';
  const brief: LearningBrief = {
    topic: query,
    summary: synthesisSummary,
    topPapers: top5,
    generatedAt: new Date().toLocaleString(),
  };

  const copyBrief = async () => {
    await navigator.clipboard?.writeText(learningBriefToText(brief));
  };

  const exportWord = () => {
    downloadText(`${query.replace(/[^a-z0-9]+/gi, '_').slice(0, 60)}_learning_brief.doc`, learningBriefToHtml(brief), 'application/msword');
  };

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-slate-50/60 dark:bg-slate-900/40 flex flex-wrap items-center gap-2">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mr-1 shrink-0">AI tools:</p>

      <button type="button" onClick={() => top5[0] && onSummarizePaper(top5[0])}
        disabled={!top5[0]}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold transition-colors"
        title="Summarize the highest-ranked paper">
        <i className="fas fa-file-medical text-[10px]" />Summarize Paper
      </button>

      <button type="button" onClick={onSynthesize}
        disabled={synthesisLoading || synthesis !== null}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
        title={`AI synthesis of the top ${top5.length} highest-evidence papers`}>
        {synthesisLoading ? (
          <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />Synthesising…</>
        ) : synthesis ? (
          <><i className="fas fa-check text-[10px]" />Synthesis ready</>
        ) : (
          <><i className="fas fa-atom text-[10px]" />Synthesise top {top5.length}</>
        )}
      </button>

      <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as BriefDifficulty)}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        title="Difficulty for generated MCQs and cases">
        <option value="mixed">Mixed</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <button type="button" onClick={() => onQuiz(difficulty)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors"
        title="Generate MCQ questions from the top papers">
        <i className="fas fa-brain text-[10px]" />Generate MCQs
      </button>

      <button type="button" onClick={() => onCase(difficulty)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors"
        title="Build a clinical case scenario from the evidence">
        <i className="fas fa-stethoscope text-[10px]" />Generate Case
      </button>

      {onGuidelineCompare && (
        <button type="button" onClick={onGuidelineCompare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
          title="Run synthesis and open the pre-computed trial vs guideline conflict matrix">
          <i className="fas fa-scale-balanced text-[10px]" />Ask guideline vs trial?
        </button>
      )}

      <button type="button" onClick={saveTopic}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isTopicSaved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}>
        <i className={`fas ${isTopicSaved ? 'fa-check' : 'fa-bookmark'} text-[10px]`} />{isTopicSaved ? 'Topic Saved' : 'Save Topic'}
      </button>
      <button type="button" onClick={saveBrief}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold transition-colors">
        <i className={`fas ${briefSaved ? 'fa-check' : 'fa-folder-plus'} text-[10px]`} />{briefSaved ? 'Brief Saved' : 'Save Brief'}
      </button>
      <button type="button" onClick={() => void copyBrief()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold transition-colors">
        <i className="fas fa-copy text-[10px]" />Copy Summary
      </button>
      <button type="button" onClick={exportWord}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold transition-colors">
        <i className="fas fa-file-word text-[10px]" />Word
      </button>
      <button type="button" onClick={() => printLearningBriefPdf(brief)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold transition-colors">
        <i className="fas fa-file-pdf text-[10px]" />PDF
      </button>

      <p className="ml-auto text-[10px] text-slate-400 shrink-0 hidden sm:block">
        Curated by EBM evidence tier · retracted excluded
      </p>
    </div>
  );
};
