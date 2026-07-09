import type { Article, ArticleSynopsisFields } from '@types';
import { synopsisTrustExportLines } from '@utils/synopsisTrustLabels';

function clean(value?: string | number | null) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function citeKey(article: Article, index: number) {
  const firstAuthor = article.authors?.[0]?.name?.split(/\s+/).pop() || 'article';
  const year = article.year || article.pubdate?.match(/\d{4}/)?.[0] || 'nd';
  return `${firstAuthor}${year}_${index + 1}`.replace(/[^a-z0-9_]/gi, '');
}

export function toBibTeX(articles: Article[]) {
  return articles.map((article, index) => {
    const authors = article.authors?.map((author) => author.name).join(' and ') || '';
    const year = article.year || article.pubdate?.match(/\d{4}/)?.[0] || '';
    return [
      `@article{${citeKey(article, index)},`,
      `  title = {${clean(article.title)}},`,
      authors && `  author = {${clean(authors)}},`,
      (article.journal || article.source) && `  journal = {${clean(article.journal || article.source)}},`,
      year && `  year = {${year}},`,
      article.doi && `  doi = {${clean(article.doi)}},`,
      article.pmid && `  pmid = {${clean(article.pmid)}},`,
      article.abstract && `  abstract = {${clean(article.abstract)}},`,
      '}',
    ].filter(Boolean).join('\n');
  }).join('\n\n');
}

export function toRIS(articles: Article[]) {
  return articles.map((article) => [
    'TY  - JOUR',
    `TI  - ${clean(article.title)}`,
    ...(article.authors || []).map((author) => `AU  - ${clean(author.name)}`),
    article.year || article.pubdate ? `PY  - ${article.year || article.pubdate?.match(/\d{4}/)?.[0]}` : '',
    article.journal || article.source ? `JO  - ${clean(article.journal || article.source)}` : '',
    article.doi ? `DO  - ${clean(article.doi)}` : '',
    article.pmid ? `AN  - ${clean(article.pmid)}` : '',
    article.abstract ? `AB  - ${clean(article.abstract)}` : '',
    'ER  -',
  ].filter(Boolean).join('\n')).join('\n\n');
}

export function toCslJson(articles: Article[]) {
  return JSON.stringify(articles.map((article, index) => ({
    id: article.doi || article.pmid || article.uid || citeKey(article, index),
    type: 'article-journal',
    title: article.title,
    author: article.authors?.map((author) => {
      const parts = author.name.trim().split(/\s+/);
      return { family: parts.pop() || author.name, given: parts.join(' ') };
    }),
    issued: { 'date-parts': [[article.year || Number(article.pubdate?.match(/\d{4}/)?.[0]) || undefined].filter(Boolean)] },
    'container-title': article.journal || article.source,
    DOI: article.doi,
    PMID: article.pmid,
    abstract: article.abstract,
    note: article._retraction?.isRetracted ? `Retracted: ${article._retraction.reason || 'verify retraction notice'}` : undefined,
  })), null, 2);
}

export function toWordSummaryHtml(articles: Article[], title = 'Research Summary') {
  const rows = articles.map((article, index) => `
    <h2>${index + 1}. ${clean(article.title)}</h2>
    <p><strong>Journal:</strong> ${clean(article.journal || article.source || 'Unknown')} | <strong>Year:</strong> ${clean(article.year || article.pubdate || 'Unknown')}</p>
    <p><strong>DOI/PMID:</strong> ${clean(article.doi || article.pmid || 'Not available')}</p>
    ${article._retraction?.isRetracted ? `<p><strong>Warning:</strong> Retracted. ${clean(article._retraction.reason)}</p>` : ''}
    <p>${clean(article.abstract || 'No abstract available.')}</p>
  `).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${clean(title)}</title></head><body><h1>${clean(title)}</h1>${rows}</body></html>`;
}

export interface LearningBriefExport {
  topic: string;
  summary?: string;
  topPapers: Article[];
  generatedAt?: string;
  trustRating?: string;
  sourceMode?: 'full_text_used' | 'abstract_only';
  reviewState?: string;
  citationOk?: boolean;
  abstractOnly?: boolean;
}

export interface PaperSynopsisExport {
  title: string;
  synopsis: ArticleSynopsisFields;
  sourceMode?: 'full_text_used' | 'abstract_only';
  reviewState?: string;
  citationOk?: boolean;
  abstractOnly?: boolean;
  generatedAt?: string;
}

export function paperSynopsisToText(exportData: PaperSynopsisExport) {
  const lines = [
    `Paper synopsis: ${clean(exportData.title)}`,
    `Generated: ${clean(exportData.generatedAt || new Date().toLocaleString())}`,
    ...synopsisTrustExportLines({
      sourceMode: exportData.sourceMode,
      reviewState: exportData.reviewState,
      citationOk: exportData.citationOk,
      trustRating: exportData.synopsis.trustRating,
      abstractOnly: exportData.abstractOnly,
    }),
    '',
  ];
  if (exportData.synopsis.takeaway) lines.push(`Takeaway: ${clean(exportData.synopsis.takeaway)}`);
  if (exportData.synopsis.bottomLine) lines.push(`Bottom line: ${clean(exportData.synopsis.bottomLine)}`);
  if (exportData.synopsis.mainFindings) lines.push(`Main findings: ${clean(exportData.synopsis.mainFindings)}`);
  if (exportData.synopsis.limitations) lines.push(`Limitations: ${clean(exportData.synopsis.limitations)}`);
  if (exportData.synopsis.trustRationale) lines.push(`Trust rationale: ${clean(exportData.synopsis.trustRationale)}`);
  return lines.filter(Boolean).join('\n');
}

export function paperSynopsisToHtml(exportData: PaperSynopsisExport) {
  const trustLines = [
    exportData.abstractOnly || exportData.sourceMode === 'abstract_only'
      ? '<p><strong style="color:#b45309">⚠ ABSTRACT-ONLY SYNOPSIS</strong> — full text was not used.</p>'
      : '',
    exportData.reviewState ? `<p><strong>Review:</strong> ${clean(exportData.reviewState.replace(/_/g, ' '))}</p>` : '',
    exportData.citationOk === false ? '<p><strong>Citation validation:</strong> issues detected</p>' : '',
    exportData.citationOk === true ? '<p><strong>Citation validation:</strong> pass</p>' : '',
  ].filter(Boolean).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${clean(exportData.title)} Synopsis</title></head><body>
    <h1>${clean(exportData.title)}</h1>
    ${trustLines}
    ${exportData.synopsis.bottomLine ? `<h2>Bottom line</h2><p>${clean(exportData.synopsis.bottomLine)}</p>` : ''}
    ${exportData.synopsis.mainFindings ? `<h2>Main findings</h2><p>${clean(exportData.synopsis.mainFindings)}</p>` : ''}
  </body></html>`;
}

export function learningBriefToText(brief: LearningBriefExport) {
  const trustHeader = [
    brief.abstractOnly || brief.sourceMode === 'abstract_only'
      ? '⚠ ABSTRACT-ONLY EVIDENCE — treat AI synopsis cautiously.'
      : '',
    brief.reviewState ? `Review state: ${brief.reviewState.replace(/_/g, ' ')}` : '',
    brief.citationOk === false ? 'Citation validation: issues detected' : '',
    brief.citationOk === true ? 'Citation validation: pass' : '',
    brief.trustRating ? `Trust rating: ${brief.trustRating}` : '',
  ].filter(Boolean);
  const lines = [
    `Learning brief: ${clean(brief.topic)}`,
    `Generated: ${brief.generatedAt || new Date().toLocaleString()}`,
    ...trustHeader,
    '',
    brief.summary ? `AI synopsis:\n${clean(brief.summary)}\n` : '',
    'Top papers:',
    ...brief.topPapers.map((article, index) => {
      const year = clean(article.year || article.pubdate || 'Unknown year');
      const source = clean(article.journal || article.source || 'Unknown source');
      return `${index + 1}. ${clean(article.title)} (${source}, ${year})`;
    }),
  ].filter(Boolean);
  return lines.join('\n');
}

export function learningBriefToHtml(brief: LearningBriefExport) {
  const papers = brief.topPapers.map((article, index) => `
    <h2>${index + 1}. ${clean(article.title)}</h2>
    <p><strong>Journal:</strong> ${clean(article.journal || article.source || 'Unknown')} | <strong>Year:</strong> ${clean(article.year || article.pubdate || 'Unknown')}</p>
    <p><strong>Why it matters:</strong> ${clean(article._ebmLabel?.label || article._quality?.signals?.[0] || 'Top-ranked evidence for this topic')}</p>
    <p>${clean(article.abstract || 'No abstract available.')}</p>
  `).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${clean(brief.topic)} Learning Brief</title>
    <style>body{font-family:Arial,sans-serif;line-height:1.45;color:#111827;max-width:820px;margin:32px auto;padding:0 24px}h1{font-size:28px}h2{font-size:18px;margin-top:24px}p{font-size:13px}.warn{color:#b45309;font-weight:700}</style>
  </head><body>
    <h1>${clean(brief.topic)} Learning Brief</h1>
    <p><strong>Generated:</strong> ${clean(brief.generatedAt || new Date().toLocaleString())}</p>
    ${brief.abstractOnly || brief.sourceMode === 'abstract_only' ? '<p class="warn">⚠ ABSTRACT-ONLY EVIDENCE — treat AI synopsis cautiously.</p>' : ''}
    ${brief.reviewState ? `<p><strong>Review state:</strong> ${clean(brief.reviewState.replace(/_/g, ' '))}</p>` : ''}
    ${brief.citationOk === false ? '<p><strong>Citation validation:</strong> issues detected</p>' : ''}
    ${brief.summary ? `<h2>AI Synopsis</h2><p>${clean(brief.summary)}</p>` : ''}
    <h2>Evidence Bouquet</h2>
    ${papers}
  </body></html>`;
}

export function printLearningBriefPdf(brief: LearningBriefExport) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
  if (!popup) return false;
  popup.document.write(learningBriefToHtml(brief));
  popup.document.close();
  popup.focus();
  popup.print();
  return true;
}

export function downloadText(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
