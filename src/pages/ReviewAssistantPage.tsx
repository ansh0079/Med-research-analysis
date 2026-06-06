import React from 'react';
import { useSearchContext } from '@contexts/SearchContext';
import { Button } from '@components/ui/Button';
import { api } from '@services/api';
import type { Article, PicoExtraction, PrismaCounts, ReviewArticle, ReviewProject } from '@types';
import { PrismaFlow } from '@components/review/PrismaFlow';
import { ScreeningQueue } from '@components/review/ScreeningQueue';
import { DataExtractionTable } from '@components/review/DataExtractionTable';
import { PicoCard } from '@components/review/PicoCard';
import { useReviewCollaboration } from '@hooks/useReviewCollaboration';
import { useAuth } from '@contexts/AuthContext';

const EMPTY_PRISMA: PrismaCounts = { total: 0, pending: 0, included: 0, excluded: 0, maybe: 0 };

export const ReviewAssistantPage: React.FC = () => {
  const { results, savedArticles } = useSearchContext();
  const { user } = useAuth();
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
  const [liveNote, setLiveNote] = React.useState<string | null>(null);

  const { activeUsers, subscribeToScreening } = useReviewCollaboration(review?.id);

  React.useEffect(() => {
    if (!review?.id) return;
    return subscribeToScreening(user?.id, (article, prisma, meta) => {
      setRows((prev) => prev.map((row) => (row.article_id === article.article_id ? article : row)));
      setPrisma(prisma);
      if (meta?.userName) {
        setLiveNote(`${meta.userName} updated a screening decision`);
        window.setTimeout(() => setLiveNote(null), 4000);
      }
    });
  }, [review?.id, subscribeToScreening, user?.id]);

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
    const screened = prisma.total - prisma.pending;
    const assessed = prisma.included + prisma.maybe;
    const bw = 220; const bh = 64; const cx = 380;
    const lx = cx - bw / 2; const rx = cx + bw / 2;
    const excX = rx + 48; const excW = 170;
    const svgW = excX + excW + 24; const svgH = 480;
    const y0 = 20; const y1 = 148; const y2 = 276; const y3 = 404;
    const mkBox = (x: number, y: number, label: string, value: number, accent: boolean) =>
      `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="8" fill="${accent ? '#eef2ff' : '#f8fafc'}" stroke="${accent ? '#6366f1' : '#94a3b8'}" stroke-width="${accent ? 2 : 1.5}"/>` +
      `<text x="${x + bw / 2}" y="${y + 20}" text-anchor="middle" font-size="11" fill="#64748b" font-family="Arial,sans-serif">${label}</text>` +
      `<text x="${x + bw / 2}" y="${y + 48}" text-anchor="middle" font-size="22" font-weight="700" fill="${accent ? '#4f46e5' : '#1e293b'}" font-family="Arial,sans-serif">n = ${value}</text>`;
    const mkExc = (y: number, label: string, value: number) => {
      const ey = y + (bh - 52) / 2;
      return `<rect x="${excX}" y="${ey}" width="${excW}" height="52" rx="8" fill="#fff7ed" stroke="#f97316" stroke-width="1.5"/>` +
        `<text x="${excX + excW / 2}" y="${ey + 18}" text-anchor="middle" font-size="11" fill="#92400e" font-family="Arial,sans-serif">${label}</text>` +
        `<text x="${excX + excW / 2}" y="${ey + 42}" text-anchor="middle" font-size="18" font-weight="700" fill="#ea580c" font-family="Arial,sans-serif">n = ${value}</text>`;
    };
    const arrowDef = `<defs><marker id="a" markerWidth="8" markerHeight="8" refX="4" refY="2" orient="auto"><path d="M0,0 L0,4 L6,2 z" fill="#94a3b8"/></marker><marker id="ao" markerWidth="8" markerHeight="8" refX="4" refY="2" orient="auto"><path d="M0,0 L0,4 L6,2 z" fill="#f97316"/></marker></defs>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">
${arrowDef}
<text x="8" y="${y0 + 22}" font-size="9" fill="#94a3b8" font-family="Arial,sans-serif" font-weight="600">IDENTIFICATION</text>
<text x="8" y="${y1 + 22}" font-size="9" fill="#94a3b8" font-family="Arial,sans-serif" font-weight="600">SCREENING</text>
<text x="8" y="${y2 + 22}" font-size="9" fill="#94a3b8" font-family="Arial,sans-serif" font-weight="600">ELIGIBILITY</text>
<text x="8" y="${y3 + 22}" font-size="9" fill="#94a3b8" font-family="Arial,sans-serif" font-weight="600">INCLUDED</text>
${mkBox(lx, y0, 'Records identified', prisma.total, true)}
${mkBox(lx, y1, 'Records screened', screened, false)}
${mkBox(lx, y2, 'Assessed for eligibility', assessed, false)}
${mkBox(lx, y3, 'Studies included', prisma.included, true)}
${mkExc(y1, 'Excluded at screening', prisma.excluded)}
${mkExc(y2, 'Pending / under review', prisma.maybe)}
<line x1="${cx}" y1="${y0 + bh}" x2="${cx}" y2="${y1}" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a)"/>
<line x1="${cx}" y1="${y1 + bh}" x2="${cx}" y2="${y2}" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a)"/>
<line x1="${cx}" y1="${y2 + bh}" x2="${cx}" y2="${y3}" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a)"/>
<line x1="${rx}" y1="${y1 + bh / 2}" x2="${excX}" y2="${y1 + bh / 2}" stroke="#f97316" stroke-width="1.5" marker-end="url(#ao)"/>
<line x1="${rx}" y1="${y2 + bh / 2}" x2="${excX}" y2="${y2 + bh / 2}" stroke="#f97316" stroke-width="1.5" marker-end="url(#ao)"/>
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prisma-flow.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAnki = () => {
    const included = rows.filter((r) => r.screening_status === 'included');
    if (!included.length) return;
    const lines: string[] = ['#separator:tab', '#html:false', '#tags column:3'];
    for (const row of included) {
      const a = row.article_data;
      const pico = picoById[row.article_id];
      const year = a.year || a.pubdate?.slice(0, 4) || '';
      const tag = `review ${year ? `year_${year}` : ''} ${(a.pubtype ?? []).join(' ')}`.trim().replace(/\s+/g, ' ');
      // Card 1: PICO summary
      if (pico) {
        const front = `${a.title}${year ? ` (${year})` : ''} — What is the PICO?`;
        const back = [
          pico.population ? `Population: ${pico.population}` : '',
          pico.intervention ? `Intervention: ${pico.intervention}` : '',
          pico.comparison ? `Comparator: ${pico.comparison}` : '',
          pico.outcomes?.length ? `Outcomes: ${pico.outcomes.join('; ')}` : '',
          pico.studyDesign ? `Design: ${pico.studyDesign}` : '',
          pico.sampleSize ? `n = ${pico.sampleSize}` : '',
        ].filter(Boolean).join('\n');
        lines.push(`${front}\t${back}\t${tag}`);
        // Card 2: study design + follow-up
        if (pico.studyDesign && pico.followUp) {
          lines.push(`${a.title}${year ? ` (${year})` : ''} — What was the study design and follow-up duration?\t${pico.studyDesign} over ${pico.followUp}\t${tag}`);
        }
      } else {
        // Fallback: title + abstract snippet
        const front = `${a.title}${year ? ` (${year})` : ''} — What is this study about?`;
        const back = (a.abstract || '').slice(0, 400) || 'No abstract available.';
        lines.push(`${front}\t${back}\t${tag}`);
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'review-flashcards.txt';
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
            <Button variant="ghost" onClick={exportAnki} disabled={rows.filter((r) => r.screening_status === 'included').length === 0}>
              Export Flashcards (Anki)
            </Button>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
          {liveNote && (
            <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <i className="fas fa-users text-xs" /> {liveNote}
            </p>
          )}
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
            <ScreeningQueue rows={rows} activeUsers={activeUsers} onDecision={onDecision} />
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
