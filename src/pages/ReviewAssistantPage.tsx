import React from 'react';
import { useSearchContext } from '@contexts/SearchContext';
import { Button } from '@components/ui/Button';
import { api } from '@services/api';
import type { Article, GRADETable, PicoExtraction, PrismaCounts, ROBResult, ReviewArticle, ReviewCriteria, ReviewProject } from '@types';
import { PrismaFlow } from '@components/review/PrismaFlow';
import { ScreeningQueue } from '@components/review/ScreeningQueue';
import { DataExtractionTable } from '@components/review/DataExtractionTable';
import { PicoCard } from '@components/review/PicoCard';
import { RobPanel } from '@components/review/RobPanel';
import { GradePanel } from '@components/review/GradePanel';
import { ReviewListModal } from '@components/review/ReviewListModal';
import { useReviewCollaboration } from '@hooks/useReviewCollaboration';
import { useAuth } from '@contexts/AuthContext';

const EMPTY_PRISMA: PrismaCounts = { total: 0, pending: 0, included: 0, excluded: 0, maybe: 0 };
type WorkspaceTab = 'screening' | 'data' | 'rob' | 'grade' | 'export';

// ─── Synthesis report export ─────────────────────────────────────────────────

function buildSynthesisReport(
  review: ReviewProject,
  rows: ReviewArticle[],
  prisma: PrismaCounts,
  picoById: Record<string, PicoExtraction>,
  robById: Record<string, ROBResult>,
  gradeTable: GRADETable | null,
): string {
  const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const included = rows.filter((r) => r.screening_status === 'included');
  const excluded = rows.filter((r) => r.screening_status === 'excluded');

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const row = (...cells: string[]) => `<tr>${cells.map((c) => `<td style="border:1px solid #e2e8f0;padding:8px 12px;font-size:13px;vertical-align:top">${c}</td>`).join('')}</tr>`;
  const th = (...cells: string[]) => `<tr>${cells.map((c) => `<th style="background:#f8fafc;border:1px solid #e2e8f0;padding:8px 12px;font-size:12px;text-align:left;font-weight:700;color:#475569">${c}</th>`).join('')}</tr>`;

  const ROB_COLOR: Record<string, string> = { LOW: '#10b981', SOME_CONCERNS: '#f59e0b', HIGH: '#ef4444', NOT_APPLICABLE: '#94a3b8' };
  const ROB_LABEL: Record<string, string> = { LOW: 'Low', SOME_CONCERNS: 'Some concerns', HIGH: 'High', NOT_APPLICABLE: 'N/A' };
  const ROB_DOMAINS = ['randomisation_process', 'deviations_from_intervention', 'missing_outcome_data', 'measurement_of_outcomes', 'selection_of_reported_result'];
  const ROB_DOMAIN_LABELS: Record<string, string> = {
    randomisation_process: 'D1: Randomisation',
    deviations_from_intervention: 'D2: Deviations',
    missing_outcome_data: 'D3: Missing data',
    measurement_of_outcomes: 'D4: Measurement',
    selection_of_reported_result: 'D5: Reporting',
  };
  const CERT_COLOR: Record<string, string> = { HIGH: '#10b981', MODERATE: '#3b82f6', LOW: '#f59e0b', 'VERY LOW': '#ef4444' };

  const inclusionList = (review.criteria.inclusion ?? []).map((c) => `<li style="margin:3px 0;font-size:13px">${esc(c)}</li>`).join('');
  const exclusionList = (review.criteria.exclusion ?? []).map((c) => `<li style="margin:3px 0;font-size:13px">${esc(c)}</li>`).join('');

  const studiesTable = included.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      ${th('Study', 'Design', 'n', 'Population', 'Intervention', 'Outcomes', 'Quality')}
      ${included.map((r) => {
        const a = r.article_data;
        const p = picoById[r.article_id];
        const year = a.year || a.pubdate?.slice(0, 4) || '';
        return row(
          `<strong>${esc(a.title)}</strong><br/><span style="color:#64748b;font-size:11px">${esc(a.source || a.journal || '')}${year ? ` · ${year}` : ''}</span>`,
          esc(p?.studyDesign || '—'),
          String(p?.sampleSize || '—'),
          esc(p?.population || '—'),
          esc(p?.intervention || '—'),
          esc((p?.outcomes ?? []).join('; ') || '—'),
          a._quality?.grade ? `<span style="font-weight:700;color:#4f46e5">Grade ${esc(a._quality.grade)}</span>` : '—',
        );
      }).join('')}
    </table>` : '<p style="color:#94a3b8;font-size:13px;font-style:italic">No articles included yet.</p>';

  const robSection = Object.keys(robById).length > 0 ? `
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      ${th('Study', ...ROB_DOMAINS.map((d) => ROB_DOMAIN_LABELS[d]), 'Overall')}
      ${included.filter((r) => robById[r.article_id]).map((r) => {
        const a = r.article_data;
        const rob = robById[r.article_id];
        const year = a.year || a.pubdate?.slice(0, 4) || '';
        const chip = (j: string) => {
          const norm = j?.toUpperCase().replace(/\s+/g, '_');
          const col = ROB_COLOR[norm] ?? '#94a3b8';
          const lbl = ROB_LABEL[norm] ?? j;
          return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${col}22;color:${col};font-size:10px;font-weight:700">${esc(lbl)}</span>`;
        };
        return row(
          `<strong style="font-size:12px">${esc(a.title.slice(0, 60))}${a.title.length > 60 ? '…' : ''}</strong><br/><span style="color:#94a3b8;font-size:10px">${year}</span>`,
          ...ROB_DOMAINS.map((d) => chip((rob[d as keyof ROBResult] as { judgement: string } | undefined)?.judgement ?? 'NOT_APPLICABLE')),
          chip(rob.overall),
        );
      }).join('')}
    </table>` : '<p style="color:#94a3b8;font-size:13px;font-style:italic">No risk of bias assessments performed yet.</p>';

  const gradeSection = gradeTable ? `
    <p style="font-size:14px;font-weight:700;color:${CERT_COLOR[gradeTable.overallCertainty] ?? '#64748b'}">
      Overall certainty: ${esc(gradeTable.overallCertainty)}
    </p>
    ${gradeTable.interpretation ? `<p style="font-size:13px;color:#475569;margin:8px 0">${esc(gradeTable.interpretation)}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      ${th('Outcome', 'Studies (n)', 'Participants', 'Effect', 'Risk of Bias', 'Inconsistency', 'Indirectness', 'Imprecision', 'Certainty')}
      ${gradeTable.outcomes.map((o) => {
        const col = CERT_COLOR[o.certainty] ?? '#64748b';
        return row(
          `<strong>${esc(o.outcome)}</strong><br/><span style="font-size:11px;color:#94a3b8">${esc(o.studyDesign)}</span>`,
          String(o.studiesN ?? '—'),
          String(o.participantsN?.toLocaleString() ?? '—'),
          esc(o.effect ?? '—'),
          esc(o.riskOfBias ?? '—'),
          esc(o.inconsistency ?? '—'),
          esc(o.indirectness ?? '—'),
          esc(o.imprecision ?? '—'),
          `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${col}22;color:${col};font-size:11px;font-weight:700">${esc(o.certainty)}</span>`,
        );
      }).join('')}
    </table>
    ${gradeTable.limitations?.length ? `
      <p style="margin-top:12px;font-weight:700;font-size:13px;color:#92400e">Limitations:</p>
      <ul>${gradeTable.limitations.map((l) => `<li style="font-size:13px;margin:3px 0;color:#475569">${esc(l)}</li>`).join('')}</ul>` : ''}
  ` : '<p style="color:#94a3b8;font-size:13px;font-style:italic">GRADE table not generated yet.</p>';

  const excludedSection = excluded.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      ${th('Study', 'Reason for exclusion')}
      ${excluded.slice(0, 30).map((r) => row(
        `<span style="font-size:12px">${esc(r.article_data.title.slice(0, 80))}${r.article_data.title.length > 80 ? '…' : ''}</span>`,
        esc(r.exclusion_reason || r.notes || '—'),
      )).join('')}
      ${excluded.length > 30 ? `<tr><td colspan="2" style="text-align:center;color:#94a3b8;font-size:12px;padding:8px">…and ${excluded.length - 30} more</td></tr>` : ''}
    </table>` : '<p style="color:#94a3b8;font-size:13px;font-style:italic">No excluded articles.</p>';

  const section = (title: string, content: string) => `
    <div style="margin-bottom:32px">
      <h2 style="margin:0 0 12px;font-size:16px;font-weight:800;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px">${title}</h2>
      ${content}
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Systematic Review Report — ${esc(review.title)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b;max-width:900px;margin:32px auto;padding:0 24px;line-height:1.6}
  table{width:100%} h1{font-size:22px;font-weight:900;margin:0 0 4px} h2{font-size:16px}
  @media print{body{margin:16px} .noprint{display:none}}
</style>
</head>
<body>
  <div style="margin-bottom:32px;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
    <h1>${esc(review.title)}</h1>
    <p style="color:#64748b;font-size:13px;margin:4px 0 12px">Generated ${now} · Systematic Review Assistant</p>
    <p style="font-size:14px;margin:0 0 12px"><strong>Research question:</strong> ${esc(review.question)}</p>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px">
      ${[['Identified', prisma.total, '#4f46e5'], ['Screened', prisma.total - prisma.pending, '#0ea5e9'], ['Included', prisma.included, '#10b981'], ['Excluded', prisma.excluded, '#ef4444']].map(([label, n, col]) =>
        `<div style="text-align:center;padding:12px;border-radius:8px;background:${col}11;border:1px solid ${col}33">
          <p style="margin:0;font-size:22px;font-weight:900;color:${col}">${n}</p>
          <p style="margin:2px 0 0;font-size:11px;font-weight:600;color:${col}99">${label}</p>
        </div>`).join('')}
    </div>
  </div>

  ${section('1. Eligibility Criteria', `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <p style="font-weight:700;font-size:13px;color:#059669;margin:0 0 6px">Inclusion</p>
        <ul style="margin:0;padding-left:20px">${inclusionList || '<li style="color:#94a3b8;font-style:italic">Not specified</li>'}</ul>
      </div>
      <div>
        <p style="font-weight:700;font-size:13px;color:#dc2626;margin:0 0 6px">Exclusion</p>
        <ul style="margin:0;padding-left:20px">${exclusionList || '<li style="color:#94a3b8;font-style:italic">Not specified</li>'}</ul>
      </div>
    </div>`)}

  ${section(`2. Included Studies (n = ${prisma.included})`, studiesTable)}
  ${section('3. Risk of Bias Summary (Cochrane RoB 2)', robSection)}
  ${section('4. GRADE Summary of Findings', gradeSection)}
  ${section(`5. Excluded Studies (n = ${prisma.excluded})`, excludedSection)}

  <div style="margin-top:24px;padding:12px 16px;background:#f1f5f9;border-radius:8px;font-size:11px;color:#94a3b8">
    <strong>Disclaimer:</strong> This report was generated with AI assistance from abstract-level data only.
    All assessments should be verified against full-text articles by qualified reviewers before publication.
    Not for direct clinical decision-making.
  </div>
</body>
</html>`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export const ReviewAssistantPage: React.FC = () => {
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

  // Load an existing review (resume)
  const loadReview = async (r: ReviewProject) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReview(r.id);
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
      const created = await api.createReview({ question, title: question.slice(0, 80), criteria });
      setReview(created.review);
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
      const response = await api.extractPico(rows.map((r) => r.article_data));
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
      const updated = await api.updateReviewScreening(review.id, articleId, { decision, ...payload });
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

  // ── Exports ──────────────────────────────────────────────────────────────

  const exportCsv = () => { if (review) window.open(api.getReviewExportUrl(review.id), '_blank', 'noopener'); };

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

  return (
    <div className="min-h-screen aurora-bg">
      <div className="max-w-7xl mx-auto px-4 pt-[calc(var(--nav-h)+1.5rem)] pb-10 space-y-6">

        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Systematic Review Assistant</h1>
          {user && (
            <Button variant="secondary" size="sm" onClick={() => setShowResumeModal(true)}
              leftIcon={<i className="fas fa-folder-open text-[10px]" />}>
              Resume Review
            </Button>
          )}
        </div>

        {prefillBanner && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl animate-fade-in">
            <p className="text-sm text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
              <i className="fas fa-clipboard-check text-indigo-400" />
              Pre-filled from your evidence project. Criteria and articles added automatically on review creation.
            </p>
            <button type="button" aria-label="Dismiss" onClick={() => { localStorage.removeItem('med_review_prefill'); setPrefillBanner(false); }}
              className="text-indigo-400 hover:text-indigo-600 transition-colors shrink-0">
              <i className="fas fa-times text-xs" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Setup card */}
        <div className="neo-card rounded-2xl p-4 space-y-3">
          {review && (
            <div className="flex items-center justify-between gap-2 mb-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Review</p>
                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{review.title}</p>
              </div>
              <button type="button" onClick={() => { setReview(null); setRows([]); setPrisma(EMPTY_PRISMA); setPicoById({}); setRobById({}); setGradeTable(null); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                <i className="fas fa-times mr-1" aria-hidden="true" />New
              </button>
            </div>
          )}
          <input
            className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            placeholder="Review question (PICO-style)"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={!!review}
          />
          <div className="grid md:grid-cols-2 gap-3">
            <textarea
              className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 min-h-[100px] text-sm"
              placeholder="Inclusion criteria (one per line)"
              value={inclusionText}
              onChange={(e) => setInclusionText(e.target.value)}
              disabled={!!review}
            />
            <textarea
              className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 min-h-[100px] text-sm"
              placeholder="Exclusion criteria (one per line)"
              value={exclusionText}
              onChange={(e) => setExclusionText(e.target.value)}
              disabled={!!review}
            />
          </div>
          {!review && (
            <Button variant="gradient" onClick={createReview} isLoading={loading} disabled={!question.trim()}>
              <i className="fas fa-plus text-[10px] mr-1.5" aria-hidden="true" />Create Review
            </Button>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
          {liveNote && (
            <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <i className="fas fa-users text-xs" aria-hidden="true" /> {liveNote}
            </p>
          )}
        </div>

        {/* PRISMA flow */}
        {review && <PrismaFlow counts={prisma} />}

        {/* Workspace tabs */}
        {review && (
          <>
            <div className="flex gap-1 border-b border-gray-100 dark:border-slate-800 pb-0.5">
              {([
                { key: 'screening', label: 'Screening', icon: 'fa-filter', badge: prisma.pending > 0 ? String(prisma.pending) : undefined },
                { key: 'data', label: 'Data Extraction', icon: 'fa-table' },
                { key: 'rob', label: 'Risk of Bias', icon: 'fa-shield-alt', badge: Object.keys(robById).length > 0 ? String(Object.keys(robById).length) : undefined },
                { key: 'grade', label: 'GRADE', icon: 'fa-chart-bar', badge: gradeTable ? '✓' : undefined },
                { key: 'export', label: 'Export', icon: 'fa-download' },
              ] as { key: WorkspaceTab; label: string; icon: string; badge?: string }[]).map((t) => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-colors ${
                    tab === t.key
                      ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}>
                  <i className={`fas ${t.icon} text-[10px]`} aria-hidden="true" />
                  {t.label}
                  {t.badge && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[9px] font-bold">
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Screening tab ── */}
            {tab === 'screening' && (
              <div className="space-y-4">
                {/* Bulk import + PRISMA checklist */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="neo-card rounded-2xl p-4">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white mb-3">Bulk Import RIS / BibTeX</h3>
                    <textarea
                      value={bulkImportText}
                      onChange={(e) => setBulkImportText(e.target.value)}
                      rows={5}
                      placeholder="Paste RIS or BibTeX records from Zotero, Mendeley, or EndNote..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button variant="secondary" size="sm" onClick={handleBulkImport} disabled={!bulkImportText.trim() || loading}>
                        Import Records
                      </Button>
                    </div>
                  </div>
                  <div className="neo-card rounded-2xl p-4">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white mb-3">PRISMA 2020 Checklist</h3>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      {([
                        ['Records identified', prisma.total > 0],
                        ['Screening decisions recorded', prisma.included + prisma.excluded + prisma.maybe > 0],
                        ['Exclusion reasons captured', rows.some((r) => r.exclusion_reason)],
                        ['PICO data extracted', Object.keys(picoById).length > 0],
                        ['Risk of bias assessed', Object.keys(robById).length > 0],
                        ['GRADE table generated', !!gradeTable],
                        ['Included studies ready', prisma.included > 0],
                      ] as [string, boolean][]).map(([label, done]) => (
                        <div key={label} className="flex items-center gap-2">
                          <i className={`fas ${done ? 'fa-check text-emerald-500' : 'fa-circle text-slate-200 dark:text-slate-700'} text-xs`} aria-hidden="true" />
                          <span className={done ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}>{label}</span>
                        </div>
                      ))}
                    </div>
                    <Button className="mt-3" variant="secondary" size="sm" onClick={extractPico} disabled={!rows.length || loading}>
                      <i className="fas fa-microscope text-[10px] mr-1" aria-hidden="true" />Extract PICO
                    </Button>
                  </div>
                </div>

                {rows.length > 0 && (
                  <div className="grid lg:grid-cols-2 gap-4">
                    <ScreeningQueue
                      rows={rows}
                      criteria={criteria}
                      activeUsers={activeUsers}
                      onDecision={onDecision}
                    />
                    <div className="space-y-3">
                      {rows.slice(0, 6).map((row) => (
                        <PicoCard key={row.article_id} articleId={row.article_id} extraction={picoById[row.article_id]} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Data Extraction tab ── */}
            {tab === 'data' && (
              <div>
                {rows.length > 0
                  ? <DataExtractionTable rows={rows} picoByArticleId={picoById} />
                  : <p className="text-sm text-slate-400 text-center py-10">Add articles in the Screening tab first.</p>
                }
              </div>
            )}

            {/* ── Risk of Bias tab ── */}
            {tab === 'rob' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">Risk of Bias — Cochrane RoB 2</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Assessments run per article. Click "Assess" on each study below.</p>
                  </div>
                </div>
                {rows.filter((r) => r.screening_status === 'included').length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10">Include at least one article in the Screening tab to assess risk of bias.</p>
                ) : (
                  rows.filter((r) => r.screening_status === 'included').map((row) => (
                    <RobPanel
                      key={row.article_id}
                      reviewId={review.id}
                      row={row}
                      cachedRob={robById[row.article_id] ?? null}
                      onResult={(articleId, rob) => setRobById((prev) => ({ ...prev, [articleId]: rob }))}
                    />
                  ))
                )}
              </div>
            )}

            {/* ── GRADE tab ── */}
            {tab === 'grade' && (
              <div className="neo-card rounded-2xl p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">GRADE Summary of Findings</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Generated from included articles. Requires at least 2 included studies.</p>
                </div>
                <GradePanel
                  reviewId={review.id}
                  includedCount={prisma.included}
                  cached={gradeTable}
                  onResult={(t) => setGradeTable(t)}
                />
              </div>
            )}

            {/* ── Export tab ── */}
            {tab === 'export' && (
              <div className="neo-card rounded-2xl p-5 space-y-5">
                <h3 className="text-sm font-black text-gray-900 dark:text-white">Export Options</h3>

                <div className="grid sm:grid-cols-2 gap-3">
                  {([
                    { label: 'Synthesis Report (HTML)', desc: 'Full report: included studies, ROB heatmap, GRADE table, exclusions', action: exportSynthesisReport, icon: 'fa-file-medical', primary: true },
                    { label: 'PRISMA Flow (SVG)', desc: 'PRISMA 2020 flow diagram for your manuscript', action: exportPrismaSvg, icon: 'fa-diagram-project', primary: false },
                    { label: 'Extraction CSV', desc: 'All articles with screening decisions from the server', action: exportCsv, icon: 'fa-file-csv', primary: false },
                    { label: 'Meta-analysis CSV', desc: 'PICO + quality columns for statistical software', action: exportMetaAnalysisCsv, icon: 'fa-table', primary: false },
                    { label: 'Anki Flashcards', desc: 'Spaced-repetition cards for included articles', action: exportAnki, icon: 'fa-brain', primary: false, disabled: rows.filter((r) => r.screening_status === 'included').length === 0 },
                  ] as { label: string; desc: string; action: () => void; icon: string; primary: boolean; disabled?: boolean }[]).map((opt) => (
                    <button key={opt.label} type="button" onClick={opt.action} disabled={opt.disabled}
                      className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-colors ${
                        opt.disabled ? 'opacity-40 cursor-not-allowed border-slate-100 dark:border-slate-800' :
                        opt.primary
                          ? 'border-indigo-200 dark:border-indigo-700/50 bg-indigo-50/60 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/30'
                          : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}>
                      <i className={`fas ${opt.icon} text-base mt-0.5 shrink-0 ${opt.primary ? 'text-indigo-500' : 'text-slate-400'}`} aria-hidden="true" />
                      <div>
                        <p className={`text-sm font-bold ${opt.primary ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{opt.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] text-slate-400">
                    <i className="fas fa-info-circle mr-1" aria-hidden="true" />
                    The synthesis report bundles PRISMA counts, included studies table, ROB heatmap, and GRADE findings into a single printable HTML file.
                    Run ROB assessments and generate the GRADE table first for a complete report.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showResumeModal && (
        <ReviewListModal
          onSelect={(r) => { setShowResumeModal(false); loadReview(r); }}
          onClose={() => setShowResumeModal(false)}
        />
      )}
    </div>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseRisBibtex(text: string): Article[] {
  const blocks = text.split(/\n\s*\n|(?=TY\s+-\s+)|(?=@\w+\s*{)/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block, i) => {
    const title = block.match(/(?:TI|T1)\s+-\s+(.+)/i)?.[1] || block.match(/title\s*=\s*[{"']([^}"']+)/i)?.[1] || `Imported article ${i + 1}`;
    const doi = block.match(/DO\s+-\s+(.+)/i)?.[1] || block.match(/doi\s*=\s*[{"']([^}"']+)/i)?.[1];
    const yearText = block.match(/(?:PY|Y1)\s+-\s+(\d{4})/i)?.[1] || block.match(/year\s*=\s*[{"']?(\d{4})/i)?.[1];
    const journal = block.match(/(?:JO|JF|T2)\s+-\s+(.+)/i)?.[1] || block.match(/journal\s*=\s*[{"']([^}"']+)/i)?.[1];
    return { uid: doi ? `doi:${doi}` : `imported:${Date.now()}:${i}`, title, doi, year: yearText ? Number(yearText) : undefined, journal, _source: 'semantic' } as Article;
  });
}
