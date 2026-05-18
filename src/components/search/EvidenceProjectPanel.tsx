import React from 'react';
import { Button } from '@components/ui/Button';
import type { Article } from '@types';

interface EvidenceProjectPanelProps {
  currentQuery: string;
  results: Article[];
  selectedArticles: Article[];
  onStartReview: () => void;
}

interface ProjectState {
  question: string;
  population: string;
  intervention: string;
  comparator: string;
  outcomes: string;
  inclusion: string;
  exclusion: string;
}

const STORAGE_KEY = 'med_evidence_project';
const REVIEW_PREFILL_KEY = 'med_review_prefill';

const EMPTY_PROJECT: ProjectState = {
  question: '',
  population: '',
  intervention: '',
  comparator: '',
  outcomes: '',
  inclusion: '',
  exclusion: '',
};

const loadProject = (): ProjectState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...EMPTY_PROJECT, ...JSON.parse(saved) } : EMPTY_PROJECT;
  } catch {
    return EMPTY_PROJECT;
  }
};

const splitLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const escapeCsv = (value: unknown): string => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const EvidenceProjectPanel: React.FC<EvidenceProjectPanelProps> = ({
  currentQuery,
  results,
  selectedArticles,
  onStartReview,
}) => {
  const [project, setProject] = React.useState<ProjectState>(loadProject);
  const evidenceSet = selectedArticles.length > 0 ? selectedArticles : results;
  const includedCount = evidenceSet.length;
  const openCount = evidenceSet.filter((article) => article.isFree || article.pmcid).length;
  const retractedCount = evidenceSet.filter((article) => article._retraction?.isRetracted).length;

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      // Ignore storage failures; the project panel still works in-memory.
    }
  }, [project]);

  const updateField = (field: keyof ProjectState, value: string) => {
    setProject((prev) => ({ ...prev, [field]: value }));
  };

  const useCurrentQuery = () => {
    if (!currentQuery.trim()) return;
    setProject((prev) => ({ ...prev, question: currentQuery.trim() }));
  };

  const exportProject = () => {
    const payload = {
      ...project,
      criteria: {
        inclusion: splitLines(project.inclusion),
        exclusion: splitLines(project.exclusion),
      },
      articles: evidenceSet.map((article) => ({
        uid: article.uid,
        title: article.title,
        journal: article.journal || article.source,
        year: article.year || article.pubdate?.split(' ')[0],
        doi: article.doi,
        pmid: article.pmid,
        openAccess: Boolean(article.isFree || article.pmcid),
        quality: article._quality?.grade,
        impact: article._impact?.score,
        retracted: Boolean(article._retraction?.isRetracted),
      })),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evidence-project.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportEvidenceTable = () => {
    const rows = [
      ['Title', 'Journal/Source', 'Year', 'DOI', 'PMID', 'Open access', 'Quality', 'Impact score', 'Retracted'],
      ...evidenceSet.map((article) => [
        article.title,
        article.journal || article.source || '',
        article.year || article.pubdate?.split(' ')[0] || '',
        article.doi || '',
        article.pmid || '',
        article.isFree || article.pmcid ? 'yes' : 'no',
        article._quality?.grade || '',
        article._impact?.score ?? '',
        article._retraction?.isRetracted ? 'yes' : 'no',
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evidence-table.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const startReview = () => {
    localStorage.setItem(REVIEW_PREFILL_KEY, JSON.stringify({
      question: project.question || currentQuery,
      criteria: {
        inclusion: splitLines(project.inclusion),
        exclusion: splitLines(project.exclusion),
      },
      articles: evidenceSet,
    }));
    onStartReview();
  };

  return (
    <section className="neo-card mb-6 overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Evidence Project</p>
            <h2 className="text-base font-black text-slate-900 dark:text-white">Turn this search into a defensible review</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={exportEvidenceTable} disabled={includedCount === 0}>
              Export table
            </Button>
            <Button variant="ghost" size="sm" onClick={exportProject}>
              Export project
            </Button>
            <Button variant="gradient" size="sm" onClick={startReview} disabled={!includedCount}>
              Start review
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={project.question}
              onChange={(event) => updateField('question', event.target.value)}
              placeholder="Research question or PICO question"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={useCurrentQuery}
              className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Use query
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ['population', 'Population'],
              ['intervention', 'Intervention / exposure'],
              ['comparator', 'Comparator'],
              ['outcomes', 'Outcomes'],
            ] as const).map(([field, label]) => (
              <input
                key={field}
                value={project[field]}
                onChange={(event) => updateField(field, event.target.value)}
                placeholder={label}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <textarea
              value={project.inclusion}
              onChange={(event) => updateField('inclusion', event.target.value)}
              placeholder="Inclusion criteria, one per line"
              rows={4}
              className="resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <textarea
              value={project.exclusion}
              onChange={(event) => updateField('exclusion', event.target.value)}
              placeholder="Exclusion criteria, one per line"
              rows={4}
              className="resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Evidence set</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
              <p className="font-mono text-lg font-black text-slate-900 dark:text-white">{includedCount}</p>
              <p className="text-[10px] font-bold uppercase text-slate-400">Papers</p>
            </div>
            <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
              <p className="font-mono text-lg font-black text-emerald-500">{openCount}</p>
              <p className="text-[10px] font-bold uppercase text-slate-400">Open</p>
            </div>
            <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
              <p className={`font-mono text-lg font-black ${retractedCount ? 'text-red-500' : 'text-slate-400'}`}>{retractedCount}</p>
              <p className="text-[10px] font-bold uppercase text-slate-400">Retracted</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Select papers to narrow the evidence set. If nothing is selected, exports and review handoff use the full result list.
          </p>
        </div>
      </div>
    </section>
  );
};
