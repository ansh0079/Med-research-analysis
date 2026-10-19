#!/usr/bin/env node
'use strict';

/**
 * Extract a topics JSON from an Excel workbook sheet named like "Topics 1001-1250".
 *
 * Usage:
 *   node scripts/extract-topics-json-from-xlsx.js \
 *     --xlsx /home/ubuntu/.cursor/projects/workspace/uploads/Signal_MD_All_Topics_250_Per_Sheet_854d.xlsx \
 *     --sheet "Topics 1001-1250" \
 *     --out data/topic-mentor-batches/Topics_1001-1250.json
 *
 * Output JSON minimal shape consumed by offline generator:
 *   { sheet: "Topics 1001-1250", count: N, topics: [{ no, topic, normalizedTopic, linkedPapers, linkedGuidelines, mentorPresent, mentorState }, ...] }
 */

const fs = require('fs');
const path = require('path');

function readArg(name, def = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}

async function main() {
  const xlsxPath = readArg('--xlsx');
  const sheetName = readArg('--sheet');
  const outPath = readArg('--out');
  if (!xlsxPath || !sheetName || !outPath) {
    console.error('usage: node scripts/extract-topics-json-from-xlsx.js --xlsx <file.xlsx> --sheet \"Topics 1001-1250\" --out <out.json>');
    process.exit(2);
  }
  let xlsx;
  try {
    xlsx = require('xlsx');
  } catch {
    console.error('Missing dependency: xlsx. Run: npm i xlsx --no-save');
    process.exit(2);
  }
  const wb = xlsx.readFile(path.resolve(xlsxPath));
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.error(`Sheet not found: ${sheetName} (available: ${wb.SheetNames.join(', ')})`);
    process.exit(2);
  }
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '', header: 1 });
  // Find header row containing "No." and "Topic"
  const headerRowIndex = rows.findIndex(
    (r) => Array.isArray(r) && r.some((c) => String(c).trim().toLowerCase() === 'topic')
  );
  if (headerRowIndex < 0) {
    console.error('Header row not found (missing "Topic" column)');
    process.exit(2);
  }
  const headers = rows[headerRowIndex].map((h) => String(h || '').trim());
  const idx = (name) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const cNo = idx('No.');
  const cTopic = idx('Topic');
  const cNorm = idx('Normalized topic');
  const cPapers = idx('Linked papers');
  const cGuidelines = idx('Linked guidelines');
  const cMentorPresent = idx('Mentor present');
  const cMentorState = idx('Mentor state');
  if (cTopic < 0) {
    console.error('Required column "Topic" not found');
    process.exit(2);
  }
  const out = { sheet: sheetName, count: 0, topics: [] };
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!Array.isArray(r) || !r.length) continue;
    const topic = String(r[cTopic] || '').trim();
    if (!topic) continue;
    const rec = {
      no: cNo >= 0 ? Number(r[cNo] || 0) : 0,
      topic,
      normalizedTopic: cNorm >= 0 ? String(r[cNorm] || '').trim() : topic.toLowerCase(),
      linkedPapers: cPapers >= 0 ? Number(r[cPapers] || 0) : 0,
      linkedGuidelines: cGuidelines >= 0 ? Number(r[cGuidelines] || 0) : 0,
      mentorPresent: cMentorPresent >= 0 ? String(r[cMentorPresent] || '').trim() : '',
      mentorState: cMentorState >= 0 ? String(r[cMentorState] || '').trim() : '',
    };
    out.topics.push(rec);
  }
  out.count = out.topics.length;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${out.count} topics to ${outPath}`);
}

if (require.main === module) {
  main().catch((e) => { console.error(e?.stack || String(e)); process.exit(1); });
}

