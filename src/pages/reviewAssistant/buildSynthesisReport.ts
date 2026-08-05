import type { GRADETable, PicoExtraction, PrismaCounts, ReviewArticle, ReviewProject, ROBResult } from '@types';

export function buildSynthesisReport(
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
