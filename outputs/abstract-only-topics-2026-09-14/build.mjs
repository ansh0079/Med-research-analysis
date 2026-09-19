import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const remote = String.raw`
const db = require('/app/database');
const key = (kind, value) => value == null || String(value).trim() === '' ? null : kind + ':' + String(value).trim().toLowerCase();
(async () => {
  await db.connect();
  try {
    const docs = await db.all('SELECT id, pmid, pmcid, doi, title, source_url, source_year, full_text_source FROM guideline_documents');
    const topics = await db.all('SELECT topic, source_articles FROM topic_knowledge');
    const index = new Map();
    for (const doc of docs) for (const k of [key('pmid', doc.pmid), key('pmcid', doc.pmcid), key('doi', doc.doi)]) {
      if (!k) continue;
      if (!index.has(k)) index.set(k, []);
      index.get(k).push(doc);
    }
    const linked = new Map();
    const rows = [];
    for (const topic of topics) {
      const found = new Map();
      const articles = Array.isArray(topic.source_articles) ? topic.source_articles : JSON.parse(topic.source_articles || '[]');
      for (const article of articles) for (const k of [key('pmid', article.pmid), key('pmcid', article.pmcid), key('doi', article.doi)]) {
        for (const doc of index.get(k) || []) found.set(doc.id, doc);
      }
      const abstract = [...found.values()].filter(d => d.full_text_source === 'abstract');
      if (!abstract.length) continue;
      const full = [...found.values()].filter(d => d.full_text_source && d.full_text_source !== 'abstract');
      rows.push({topic: topic.topic, abstractCount: abstract.length, fullCount: full.length, abstractIds: abstract.map(d => d.id)});
      for (const doc of abstract) {
        if (!linked.has(doc.id)) linked.set(doc.id, new Set());
        linked.get(doc.id).add(topic.topic);
      }
    }
    rows.sort((a,b) => a.topic.localeCompare(b.topic));
    const abstractDocs = docs.filter(d => d.full_text_source === 'abstract').sort((a,b) => a.id-b.id).map(d => ({...d, topics: [...(linked.get(d.id) || [])].sort()}));
    console.log('DATA:' + JSON.stringify({at: new Date().toISOString(), totalDocs: docs.length, totalTopics: topics.length, rows, abstractDocs}));
  } finally { await db.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
`;

const stdout = execFileSync('ssh', ['root@178.105.155.246', 'docker exec -i medsearch-web node'], {input: remote, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024});
const dataLine = stdout.split(/\r?\n/).find(line => line.startsWith('DATA:'));
if (!dataLine) throw new Error('Production data missing');
const data = JSON.parse(dataLine.slice(5));
const only = data.rows.filter(r => r.fullCount === 0);
if (data.abstractDocs.length !== 440 || data.rows.length !== 282 || only.length !== 46) throw new Error(`Unexpected live counts: ${data.abstractDocs.length}, ${data.rows.length}, ${only.length}`);

const wb = Workbook.create();
function addSheet(name, headers, rows, widths, subtitle) {
  const sheet = wb.worksheets.add(name);
  sheet.showGridLines = false;
  sheet.getRange('A1').values = [[name]];
  sheet.getRange('A2').values = [[subtitle]];
  const end = String.fromCharCode(64 + headers.length);
  sheet.getRange(`A4:${end}4`).values = [headers];
  sheet.getRange(`A4:${end}4`).format.fill = '#174A5A';
  sheet.getRange(`A4:${end}4`).format.font.color = '#FFFFFF';
  sheet.getRange(`A4:${end}4`).format.font.bold = true;
  sheet.getRange('A1').format.font.bold = true;
  sheet.getRange('A1').format.font.size = 16;
  if (rows.length) sheet.getRangeByIndexes(4, 0, rows.length, headers.length).values = rows;
  widths.forEach((width, i) => sheet.getRange(`${String.fromCharCode(65+i)}:${String.fromCharCode(65+i)}`).format.columnWidth = width);
  sheet.freezePanes.freezeRows(4);
  return sheet;
}
const stamp = `Production snapshot ${data.at.slice(0, 10)}. Linked via source_articles PMID/PMCID/DOI.`;
addSheet('Only abstract topics', ['Topic', 'Abstract docs', 'Full-text docs', 'Abstract document IDs'], only.map(r => [r.topic, r.abstractCount, r.fullCount, r.abstractIds.join(', ')]), [55, 17, 17, 60], `${only.length} topics with no linked full-text document. ${stamp}`);
addSheet('All linked topics', ['Topic', 'Abstract docs', 'Full-text docs', 'Status', 'Abstract document IDs'], data.rows.map(r => [r.topic, r.abstractCount, r.fullCount, r.fullCount ? 'Mixed' : 'Abstract only', r.abstractIds.join(', ')]), [55, 17, 17, 19, 60], `${data.rows.length} topics linked to an abstract-only document. ${stamp}`);
addSheet('Abstract documents', ['ID', 'Title', 'PMID', 'PMCID', 'DOI', 'Source URL', 'Year', 'Linked topics'], data.abstractDocs.map(d => [d.id, d.title || '', d.pmid || '', d.pmcid || '', d.doi || '', d.source_url || '', d.source_year || '', d.topics.join('; ')]), [10, 75, 17, 19, 34, 65, 12, 90], `${data.abstractDocs.length} abstract-only documents. ${stamp}`);
wb.recalculate();
console.log(JSON.stringify({only: only.length, all: data.rows.length, documents: data.abstractDocs.length, first: only[0].topic}));
const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(fileURLToPath(new URL('./abstract-only-topics-production.xlsx', import.meta.url)));
