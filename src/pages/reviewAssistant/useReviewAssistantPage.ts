import React from 'react';
import { useSearchContext } from '@contexts/SearchContext';
import { useAuth } from '@contexts/AuthContext';
import { api } from '@services/api';
import { useReviewCollaboration } from '@hooks/useReviewCollaboration';
import type { Article, GRADETable, PicoExtraction, PrismaCounts, ReviewArticle, ReviewCriteria, ReviewProject, ROBResult } from '@types';
import { EMPTY_PRISMA } from './constants';
import type { WorkspaceTab } from './types';
import { buildSynthesisReport } from './buildSynthesisReport';
import { download } from './fileUtils';
import { parseRisBibtex } from './parseRisBibtex';

export function useReviewAssistantPage() {
  const { results, savedArticles } = useSearchContext();
  const { user } = useAuth();

  const readPrefill = React.useCallback((): { question?: string; articles?: Article[]; criteria?: { inclusion?: string[]; exclusion?: string[] } } | null => {
    try { return JSON.parse(localStorage.getItem('med_review_prefill') || 'null'); } catch { return null; }
  }, []);

  const [question, setQuestion] = React.useState(() => readPrefill()?.question ?? '');
  const [inclusionText, setInclusionText] = React.useState(() => readPrefill()?.criteria?.inclusion?.join('\n') ?? '');
  const [exclusionText, setExclusionText] = React.useState(() => readPrefill()?.criteria?.exclusion?.join('\n') ?? '');
  const [bulkImportText, setBulkImportText] = React.useState('');
  const [review, setReview] = React.useState<ReviewProject | null>(null);
  const [prefillBanner, setPrefillBanner] = React.useState(() => { try { return !!localStorage.getItem('med_review_prefill'); } catch { return false; } });
  const [rows, setRows] = React.useState<ReviewArticle[]>([]);
  const [prisma, setPrisma] = React.useState<PrismaCounts>(EMPTY_PRISMA);
  const [picoById, setPicoById] = React.useState<Record<string, PicoExtraction>>({});
  const [robById, setRobById] = React.useState<Record<string, ROBResult>>({});
  const [gradeTable, setGradeTable] = React.useState<GRADETable | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [liveNote, setLiveNote] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<WorkspaceTab>('screening');
  const [showResumeModal, setShowResumeModal] = React.useState(false);

  const { activeUsers, subscribeToScreening } = useReviewCollaboration(review?.id);

  React.useEffect(() => {
    if (!review?.id) return;
    return subscribeToScreening(user?.id, (article, updatedPrisma, meta) => {
      setRows((prev) => prev.map((row) => (row.article_id === article.article_id ? article : row)));
      setPrisma(updatedPrisma);
      if (meta?.userName) {
        setLiveNote(`${meta.userName} updated a screening decision`);
        window.setTimeout(() => setLiveNote(null), 4000);
      }
    });
  }, [review?.id, subscribeToScreening, user?.id]);

  const criteria: ReviewCriteria = React.useMemo(() => ({
    inclusion: inclusionText.split('\n').map((s) => s.trim()).filter(Boolean),
    exclusion: exclusionText.split('\n').map((s) => s.trim()).filter(Boolean),
  }), [inclusionText, exclusionText]);

  const loadReview = async (r: ReviewProject) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.review.getReview(r.id);
      setReview(data.review);
      setRows(data.articles);
      setPrisma(data.prisma);
      setQuestion(data.review.question);
      setInclusionText((data.review.criteria.inclusion ?? []).join('\n'));
      setExclusionText((data.review.criteria.exclusion ?? []).join('\n'));
      setRobById({});
      setGradeTable(null);
      setTab('screening');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review');
    } finally {
      setLoading(false);
    }
  };

  const createReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const created = await api.review.createReview({ question, title: question.slice(0, 80), criteria });
      setReview(created.review);
      let prefillArticles: Article[] = [];
      try {
        const raw = localStorage.getItem('med_review_prefill');
        if (raw) { prefillArticles = JSON.parse(raw).articles ?? []; localStorage.removeItem('med_review_prefill'); setPrefillBanner(false); }
      } catch { /* ignore */ }
      const articleSeed = prefillArticles.length > 0 ? prefillArticles : results.length > 0 ? results : savedArticles.slice(0, 20);
      if (articleSeed.length > 0) {
        const added = await api.review.addReviewArticles(created.review.id, articleSeed);
        setRows(added.articles);
        const counts = await api.review.getReviewPrisma(created.review.id);
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
      const response = await api.review.extractPico(rows.map((r) => r.article_data));
      const map: Record<string, PicoExtraction> = {};
      response.results.forEach((item) => { map[item.articleId] = item.extraction; });
      setPicoById((prev) => ({ ...prev, ...map }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PICO extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const onDecision = async (articleId: string, decision: 'included' | 'excluded' | 'maybe', payload: { exclusionReason?: string; notes?: string } = {}) => {
    if (!review) return;
    try {
      const updated = await api.review.updateReviewScreening(review.id, articleId, { decision, ...payload });
      setRows((prev) => prev.map((row) => (row.article_id === articleId ? updated.article : row)));
      setPrisma(updated.prisma);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update decision');
    }
  };

  const handleBulkImport = async () => {
    if (!review || !bulkImportText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const imported = parseRisBibtex(bulkImportText);
      const added = await api.review.addReviewArticles(review.id, imported);
      setRows((prev) => [...prev, ...added.articles]);
      const counts = await api.review.getReviewPrisma(review.id);
      setPrisma(counts.prisma);
      setBulkImportText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk import failed');
    } finally {
      setLoading(false);
    }
  };

  const resetReview = () => {
    setReview(null);
    setRows([]);
    setPrisma(EMPTY_PRISMA);
    setPicoById({});
    setRobById({});
    setGradeTable(null);
  };

  const dismissPrefillBanner = () => {
    localStorage.removeItem('med_review_prefill');
    setPrefillBanner(false);
  };

  const exportCsv = () => { if (review) window.open(api.review.getReviewExportUrl(review.id), '_blank', 'noopener'); };

  const exportMetaAnalysisCsv = () => {
    const headers = ['title', 'status', 'population', 'intervention', 'comparison', 'outcomes', 'study_design', 'sample_size', 'quality', 'doi', 'notes'];
    const csvRows = rows.map((row) => {
      const p = picoById[row.article_id];
      return [row.article_data.title, row.screening_status, p?.population, p?.intervention, p?.comparison,
        p?.outcomes?.join('; '), p?.studyDesign, p?.sampleSize, row.article_data._quality?.grade, row.article_data.doi, row.notes]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
    });
    download([headers.join(','), ...csvRows].join('\n'), 'meta-analysis-extraction.csv', 'text/csv');
  };

  const exportPrismaSvg = () => {
    const screened = prisma.total - prisma.pending;
    const assessed = prisma.included + prisma.maybe;
    const bw = 220; const bh = 64; const cx = 380;
    const lx = cx - bw / 2; const rx = cx + bw / 2;
    const excX = rx + 48; const excW = 170;
    const svgW = excX + excW + 24; const svgH = 480;
    const [y0, y1, y2, y3] = [20, 148, 276, 404];
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
    download(svg, 'prisma-flow.svg', 'image/svg+xml');
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
      if (pico) {
        const front = `${a.title}${year ? ` (${year})` : ''} — What is the PICO?`;
        const back = [
          pico.population && `Population: ${pico.population}`,
          pico.intervention && `Intervention: ${pico.intervention}`,
          pico.comparison && `Comparator: ${pico.comparison}`,
          pico.outcomes?.length && `Outcomes: ${pico.outcomes.join('; ')}`,
          pico.studyDesign && `Design: ${pico.studyDesign}`,
          pico.sampleSize && `n = ${pico.sampleSize}`,
        ].filter(Boolean).join('\n');
        lines.push(`${front}\t${back}\t${tag}`);
        if (pico.studyDesign && pico.followUp) {
          lines.push(`${a.title}${year ? ` (${year})` : ''} — Study design and follow-up?\t${pico.studyDesign} over ${pico.followUp}\t${tag}`);
        }
      } else {
        lines.push(`${a.title}${year ? ` (${year})` : ''} — What is this study about?\t${(a.abstract || '').slice(0, 400) || 'No abstract.'}\t${tag}`);
      }
    }
    download(lines.join('\n'), 'review-flashcards.txt', 'text/plain;charset=utf-8');
  };

  const exportSynthesisReport = () => {
    if (!review) return;
    const html = buildSynthesisReport(review, rows, prisma, picoById, robById, gradeTable);
    download(html, `synthesis-report-${review.id.slice(0, 8)}.html`, 'text/html;charset=utf-8');
  };

  return {
    user,
    question,
    setQuestion,
    inclusionText,
    setInclusionText,
    exclusionText,
    setExclusionText,
    bulkImportText,
    setBulkImportText,
    review,
    prefillBanner,
    rows,
    prisma,
    picoById,
    robById,
    gradeTable,
    setGradeTable,
    loading,
    error,
    liveNote,
    tab,
    setTab,
    showResumeModal,
    setShowResumeModal,
    activeUsers,
    criteria,
    loadReview,
    createReview,
    extractPico,
    onDecision,
    handleBulkImport,
    resetReview,
    dismissPrefillBanner,
    setRobById,
    exportCsv,
    exportMetaAnalysisCsv,
    exportPrismaSvg,
    exportAnki,
    exportSynthesisReport,
  };
}
