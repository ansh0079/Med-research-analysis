import React from 'react';
import { useSearchContext } from '@contexts/SearchContext';
import { Button } from '@components/ui/Button';
import { api } from '@services/api';
import type { Article, PicoExtraction, PrismaCounts, ReviewArticle, ReviewProject } from '@types';
import { PrismaFlow } from '@components/review/PrismaFlow';
import { ScreeningQueue } from '@components/review/ScreeningQueue';
import { DataExtractionTable } from '@components/review/DataExtractionTable';
import { PicoCard } from '@components/review/PicoCard';

const EMPTY_PRISMA: PrismaCounts = { total: 0, pending: 0, included: 0, excluded: 0, maybe: 0 };

export const ReviewAssistantPage: React.FC = () => {
  const { results, savedArticles } = useSearchContext();
  const readPrefill = React.useCallback((): { question?: string; articles?: Article[]; criteria?: { inclusion?: string[]; exclusion?: string[] } } | null => {
    try {
      const raw = localStorage.getItem('med_review_prefill');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const [question, setQuestion] = React.useState(() => {
    return readPrefill()?.question ?? '';
  });
  const [inclusionText, setInclusionText] = React.useState(() => readPrefill()?.criteria?.inclusion?.join('\n') ?? '');
  const [exclusionText, setExclusionText] = React.useState(() => readPrefill()?.criteria?.exclusion?.join('\n') ?? '');
  const [bulkImportText, setBulkImportText] = React.useState('');
  const [review, setReview] = React.useState<ReviewProject | null>(null);
  const [prefillBanner, setPrefillBanner] = React.useState(() => {
    try { return !!localStorage.getItem('med_review_prefill'); } catch { return false; }
  });
  const [rows, setRows] = React.useState<ReviewArticle[]>([]);
  const [prisma, setPrisma] = React.useState<PrismaCounts>(EMPTY_PRISMA);
  const [picoById, setPicoById] = React.useState<Record<string, PicoExtraction>>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const createReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const criteria = {
        inclusion: inclusionText.split('\n').map((s) => s.trim()).filter(Boolean),
        exclusion: exclusionText.split('\n').map((s) => s.trim()).filter(Boolean),
      };
      const created = await api.createReview({ question, title: question.slice(0, 80), criteria });
      setReview(created.review);

      // Consume Case Mode prefill if present, then fall back to search results / saved
      let prefillArticles: Article[] = [];
      try {
        const raw = localStorage.getItem('med_review_prefill');
        if (raw) { prefillArticles = JSON.parse(raw).articles ?? []; localStorage.removeItem('med_review_prefill'); setPrefillBanner(false); }
      } catch { /* ignore */ }

      const articleSeed = prefillArticles.length > 0 ? prefillArticles : results.length > 0 ? results : savedArticles.slice(0, 20);
      if (articleSeed.length > 0) {
        const added = await api.addReviewArticles(created.review.id, articleSeed);
        setRows(added.articles);
        const counts = await api.getReviewPrisma(created.review.id);
        setPrisma(counts.prisma);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create review');
    } finally {
      setLoading(false);
    }
  };

  const extractPico = async () => {
    if (!rows.length) return;
    setLoading(true);
    setError(null);
    try {
      const payload = rows.map((r) => r.article_data);
      const response = await api.extractPico(payload);
      const map: Record<string, PicoExtraction> = {};
      response.results.forEach((item) => {
        map[item.articleId] = item.extraction;
      });
      setPicoById((prev) => ({ ...prev, ...map }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PICO extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const onDecision = async (
    articleId: string,
    decision: 'included' | 'excluded' | 'maybe',
    payload: { exclusionReason?: string; notes?: string } = {}
  ) => {
    if (!review) return;
    try {
      const updated = await api.updateReviewScreening(review.id, articleId, { decision, ...payload });
      setRows((prev) => prev.map((row) => (row.article_id === articleId ? updated.article : row)));
      setPrisma(updated.prisma);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update decision');
    }
  };

  const exportCsv = () => {
    if (!review) return;
    window.open(api.getReviewExportUrl(review.id), '_blank', 'noopener');
  };

  const parseRisBibtex = (text: string): Article[] => {
    const blocks = text.split(/\n\s*\n|(?=TY\s+-\s+)|(?=@\w+\s*{)/).map((block) => block.trim()).filter(Boolean);
    return blocks.map((block, index) => {
      const title = block.match(/(?:TI|T1)\s+-\s+(.+)/i)?.[1]
        || block.match(/title\s*=\s*[{"']([^}"']+)/i)?.[1]
        || `Imported article ${index + 1}`;
      const doi = block.match(/DO\s+-\s+(.+)/i)?.[1]
        || block.match(/doi\s*=\s*[{"']([^}"']+)/i)?.[1];
      const yearText = block.match(/(?:PY|Y1)\s+-\s+(\d{4})/i)?.[1]
        || block.match(/year\s*=\s*[{"']?(\d{4})/i)?.[1];
      const journal = block.match(/(?:JO|JF|T2)\s+-\s+(.+)/i)?.[1]
        || block.match(/journal\s*=\s*[{"']([^}"']+)/i)?.[1];
      return {
        uid: doi ? `doi:${doi}` : `imported:${Date.now()}:${index}`,
        title,
        doi,
        year: yearText ? Number(yearText) : undefined,
        journal,
        _source: 'semantic',
      } as Article;
    });
  };

  const handleBulkImport = async () => {
    if (!review || !bulkImportText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const imported = parseRisBibtex(bulkImportText);
      const added = await api.addReviewArticles(review.id, imported);
      setRows((prev) => [...prev, ...added.articles]);
      const counts = await api.getReviewPrisma(review.id);
      setPrisma(counts.prisma);
      setBulkImportText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk import failed');
    } finally {
      setLoading(false);
    }
  };

  const exportMetaAnalysisCsv = () => {
    const headers = ['title', 'status', 'population', 'intervention', 'comparison', 'outcomes', 'study_design', 'sample_size', 'quality', 'doi', 'notes'];
    const csvRows = rows.map((row) => {
      const pico = picoById[row.article_id];
      return [
        row.article_data.title,
        row.screening_status,
        pico?.population,
        pico?.intervention,
        pico?.comparison,
        pico?.outcomes?.join('; '),
        pico?.studyDesign,
        pico?.sampleSize,
        row.article_data._quality?.grade,
        row.article_data.doi,
        row.notes,
      ].map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',');
    });
    const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'meta-analysis-extraction.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPrismaSvg = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="420" viewBox="0 0 760 420">
      <style>text{font-family:Arial,sans-serif}.box{fill:#eef2ff;stroke:#6366f1;stroke-width:2}.small{font-size:14px;fill:#334155}.big{font-size:24px;font-weight:700;fill:#111827}</style>
      <rect class="box" x="260" y="24" width="240" height="70" rx="10"/><text x="380" y="53" text-anchor="middle" class="small">Records identified</text><text x="380" y="80" text-anchor="middle" class="big">${prisma.total}</text>
      <line x1="380" y1="94" x2="380" y2="138" stroke="#94a3b8" stroke-width="2"/>
      <rect class="box" x="260" y="138" width="240" height="70" rx="10"/><text x="380" y="167" text-anchor="middle" class="small">Screening pending</text><text x="380" y="194" text-anchor="middle" class="big">${prisma.pending}</text>
      <line x1="380" y1="208" x2="380" y2="252" stroke="#94a3b8" stroke-width="2"/>
      <rect class="box" x="80" y="252" width="190" height="70" rx="10"/><text x="175" y="281" text-anchor="middle" class="small">Excluded</text><text x="175" y="308" text-anchor="middle" class="big">${prisma.excluded}</text>
      <rect class="box" x="285" y="252" width="190" height="70" rx="10"/><text x="380" y="281" text-anchor="middle" class="small">Maybe</text><text x="380" y="308" text-anchor="middle" class="big">${prisma.maybe}</text>
      <rect class="box" x="490" y="252" width="190" height="70" rx="10"/><text x="585" y="281" text-anchor="middle" class="small">Included</text><text x="585" y="308" text-anchor="middle" class="big">${prisma.included}</text>
    </svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prisma-flow.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen aurora-bg">
      <div className="max-w-7xl mx-auto px-4 pt-[calc(var(--nav-h)+1.5rem)] pb-10 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Systematic Review Assistant</h1>
        </div>

        {prefillBanner && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl animate-fade-in">
            <p className="text-sm text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
              <i className="fas fa-clipboard-check text-indigo-400" />
              Pre-filled from your evidence project. Criteria and articles will be added automatically when you create the review.
            </p>
            <button type="button" onClick={() => { localStorage.removeItem('med_review_prefill'); setPrefillBanner(false); }}
              className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors shrink-0">
              <i className="fas fa-times text-xs" />
            </button>
          </div>
        )}

        <div className="neo-card rounded-2xl p-4 space-y-3">
          <input
            className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            placeholder="Review question (PICO-style)"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <div className="grid md:grid-cols-2 gap-3">
            <textarea
              className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 min-h-[120px]"
              placeholder="Inclusion criteria (one per line)"
              value={inclusionText}
              onChange={(e) => setInclusionText(e.target.value)}
            />
            <textarea
              className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 min-h-[120px]"
              placeholder="Exclusion criteria (one per line)"
              value={exclusionText}
              onChange={(e) => setExclusionText(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="gradient" onClick={createReview} isLoading={loading} disabled={!question.trim()}>
              Create Review
            </Button>
            <Button variant="secondary" onClick={extractPico} disabled={!review || rows.length === 0 || loading}>
              Extract PICO
            </Button>
            <Button variant="ghost" onClick={exportCsv} disabled={!review || rows.length === 0}>
              Export Extraction CSV
            </Button>
            <Button variant="ghost" onClick={exportMetaAnalysisCsv} disabled={rows.length === 0}>
              Export Meta-analysis CSV
            </Button>
            <Button variant="ghost" onClick={exportPrismaSvg} disabled={!review}>
              Export PRISMA SVG
            </Button>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
        </div>

        {review && <PrismaFlow counts={prisma} />}

        {review && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="neo-card rounded-2xl p-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Bulk Import RIS / BibTeX</h3>
              <textarea
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                rows={6}
                placeholder="Paste RIS or BibTeX records from Zotero, Mendeley, or EndNote..."
                className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <Button className="mt-3" variant="secondary" onClick={handleBulkImport} disabled={!bulkImportText.trim() || loading}>
                Import Records
              </Button>
            </div>
            <div className="neo-card rounded-2xl p-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">PRISMA 2020 Checklist</h3>
              <div className="mt-3 grid gap-2 text-sm text-gray-600 dark:text-gray-300">
                {[
                  ['Identification', prisma.total > 0],
                  ['Screening decisions recorded', prisma.included + prisma.excluded + prisma.maybe > 0],
                  ['Exclusion reasons captured', rows.some((row) => row.exclusion_reason)],
                  ['Data extraction / PICO populated', Object.keys(picoById).length > 0],
                  ['Included studies ready', prisma.included > 0],
                ].map(([label, done]) => (
                  <div key={String(label)} className="flex items-center gap-2">
                    <i className={`fas ${done ? 'fa-check text-emerald-500' : 'fa-circle text-slate-300'} text-xs`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-4">
            <ScreeningQueue rows={rows} onDecision={onDecision} />
            <div className="space-y-3">
              {rows.slice(0, 6).map((row) => (
                <PicoCard key={row.article_id} articleId={row.article_id} extraction={picoById[row.article_id]} />
              ))}
            </div>
          </div>
        )}

        {rows.length > 0 && <DataExtractionTable rows={rows} picoByArticleId={picoById} />}
      </div>
    </div>
  );
};
